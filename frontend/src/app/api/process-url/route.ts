import { NextResponse } from 'next/server';
import { uploadToB2 } from '@/lib/b2';
import { supabase } from '@/lib/supabase';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

export async function POST(request: Request) {
  let inputPath = '';
  let outputPath = '';

  try {
    const body = await request.json();
    const { url, userId } = body;

    // Validate URL
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('Invalid protocol');
      }
    } catch {
      return NextResponse.json({ error: 'Invalid URL provided' }, { status: 400 });
    }

    // Fetch the PDF from the URL
    const fetchRes = await fetch(url);
    if (!fetchRes.ok) {
      return NextResponse.json(
        { error: `Failed to fetch PDF from URL: ${fetchRes.status} ${fetchRes.statusText}` },
        { status: 400 }
      );
    }

    const arrayBuffer = await fetchRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extract filename from URL path or use default
    const urlPath = parsedUrl.pathname;
    const urlFilename = path.basename(urlPath) || 'downloaded.pdf';
    const originalName = urlFilename.endsWith('.pdf') ? urlFilename : `${urlFilename}.pdf`;
    const safeName = originalName.replace(/[^a-zA-Z0-9.\-_]/g, '_');

    const uniqueId = Date.now().toString() + Math.floor(Math.random() * 1000);

    // 1. Upload original PDF to B2
    const originalB2FileName = `original_${uniqueId}_${safeName}`;
    await uploadToB2(buffer, originalB2FileName, 'application/pdf');
    const originalB2Url = `/api/download?file=${encodeURIComponent(originalB2FileName)}`;

    // 2. Insert record in Supabase with 'processing' status
    const { data: dbData, error: dbError } = await supabase
      .from('processed_pdfs')
      .insert({
        original_filename: originalName,
        b2_url: null,
        original_b2_url: originalB2Url,
        status: 'processing',
        created_at: new Date().toISOString(),
        user_id: userId || null,
      })
      .select()
      .single();

    if (dbError || !dbData) {
      console.error('Could not save to Supabase:', dbError);
      return NextResponse.json({ error: 'Database record creation failed', details: dbError?.message }, { status: 500 });
    }

    // 3. Start processing in the background (asynchronously, do not await!)
    (async () => {
      const tempDir = os.tmpdir();
      inputPath = path.join(tempDir, `input_${uniqueId}_${safeName}`);
      outputPath = path.join(tempDir, `output_${uniqueId}_${safeName}`);

      try {
        // Save the downloaded file temporarily
        await fs.writeFile(inputPath, buffer);

        // Call the Python script
        const scriptPath = path.resolve('../make_pdf_searchable_final.py');
        const markerApiKey = process.env.DATALAB_MARKER_API || '';

        await execAsync(
          `python3 ${scriptPath} ${inputPath} ${outputPath}`,
          { env: { ...process.env, DATALAB_MARKER_API: markerApiKey } }
        );

        // Read the processed PDF
        const processedBuffer = await fs.readFile(outputPath);

        // Upload optimized PDF to B2
        const b2FileName = `optimized_${uniqueId}_${safeName}`;
        await uploadToB2(processedBuffer, b2FileName, 'application/pdf');
        const dynamicDownloadUrl = `/api/download?file=${encodeURIComponent(b2FileName)}`;

        // Update database record to 'completed'
        await supabase
          .from('processed_pdfs')
          .update({
            b2_url: dynamicDownloadUrl,
            status: 'completed',
          })
          .eq('id', dbData.id);

      } catch (error: any) {
        console.error(`Background URL processing failed for ID ${dbData.id}:`, error);

        // Update database record to 'failed'
        await supabase
          .from('processed_pdfs')
          .update({
            status: 'failed',
          })
          .eq('id', dbData.id);
          
      } finally {
        // Clean up temporary files
        if (inputPath) await fs.unlink(inputPath).catch(() => {});
        if (outputPath) await fs.unlink(outputPath).catch(() => {});
      }
    })();

    // 4. Return success immediately with the new record ID
    return NextResponse.json({ success: true, id: dbData.id });

  } catch (error: any) {
    console.error('Error initiating URL PDF processing:', error);
    return NextResponse.json(
      { error: 'Failed to initiate URL PDF processing', details: error.message },
      { status: 500 }
    );
  }
}

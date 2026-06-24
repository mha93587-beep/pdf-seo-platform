import { NextResponse } from 'next/server';
import { uploadToB2 } from '@/lib/b2';
import { supabase } from '@/lib/supabase';
import { authenticateApiKey } from '@/lib/api-auth';
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
    // 1. Authenticate API Key
    const userId = await authenticateApiKey(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized: Invalid or missing API Key' }, { status: 401 });
    }

    const body = await request.json();
    const { url } = body;

    // 2. Validate URL
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

    // 3. Fetch PDF from URL
    const fetchRes = await fetch(url);
    if (!fetchRes.ok) {
      return NextResponse.json(
        { error: `Failed to fetch PDF from URL: ${fetchRes.status} ${fetchRes.statusText}` },
        { status: 400 }
      );
    }

    const arrayBuffer = await fetchRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Get safe file name
    const urlPath = parsedUrl.pathname;
    const urlFilename = path.basename(urlPath) || 'downloaded.pdf';
    const originalName = urlFilename.endsWith('.pdf') ? urlFilename : `${urlFilename}.pdf`;
    const safeName = originalName.replace(/[^a-zA-Z0-9.\-_]/g, '_');

    const uniqueId = Date.now().toString() + Math.floor(Math.random() * 1000);

    // 4. Upload original PDF to B2
    const originalB2FileName = `original_${uniqueId}_${safeName}`;
    await uploadToB2(buffer, originalB2FileName, 'application/pdf');
    const originalB2Url = `/api/download?file=${encodeURIComponent(originalB2FileName)}`;

    // 5. Insert record into Supabase with 'processing' status
    const { data: dbData, error: dbError } = await supabase
      .from('processed_pdfs')
      .insert({
        original_filename: originalName,
        b2_url: null,
        original_b2_url: originalB2Url,
        status: 'processing',
        created_at: new Date().toISOString(),
        user_id: userId, // associate with the developer
      })
      .select()
      .single();

    if (dbError || !dbData) {
      console.error('Database insertion error:', dbError);
      return NextResponse.json({ error: 'Database record creation failed' }, { status: 500 });
    }

    // Get public hosting origin for API responses
    const requestUrl = new URL(request.url);
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || requestUrl.host;
    const proto = request.headers.get('x-forwarded-proto') || 'https';
    const origin = `${proto}://${host}`;

    // 6. Start processing in background (asynchronously)
    (async () => {
      const tempDir = os.tmpdir();
      inputPath = path.join(tempDir, `input_${uniqueId}_${safeName}`);
      outputPath = path.join(tempDir, `output_${uniqueId}_${safeName}`);

      try {
        await fs.writeFile(inputPath, buffer);

        const scriptPath = path.resolve('../make_pdf_searchable_final.py');
        const markerApiKey = process.env.DATALAB_MARKER_API || '';

        await execAsync(
          `python3 ${scriptPath} ${inputPath} ${outputPath}`,
          { env: { ...process.env, DATALAB_MARKER_API: markerApiKey } }
        );

        const processedBuffer = await fs.readFile(outputPath);

        const b2FileName = `optimized_${uniqueId}_${safeName}`;
        await uploadToB2(processedBuffer, b2FileName, 'application/pdf');
        const dynamicDownloadUrl = `/api/download?file=${encodeURIComponent(b2FileName)}`;

        await supabase
          .from('processed_pdfs')
          .update({
            b2_url: dynamicDownloadUrl,
            status: 'completed',
          })
          .eq('id', dbData.id);

      } catch (error: any) {
        console.error(`Background API processing failed for ID ${dbData.id}:`, error);

        await supabase
          .from('processed_pdfs')
          .update({
            status: 'failed',
          })
          .eq('id', dbData.id);
          
      } finally {
        if (inputPath) await fs.unlink(inputPath).catch(() => {});
        if (outputPath) await fs.unlink(outputPath).catch(() => {});
      }
    })();

    // 7. Return immediate status response
    return NextResponse.json({
      success: true,
      order: {
        id: dbData.id,
        filename: originalName,
        status: 'processing',
        original_pdf_url: `${origin}${originalB2Url}`,
        status_check_url: `${origin}/api/v1/status/${dbData.id}`,
        created_at: dbData.created_at,
      }
    });

  } catch (error: any) {
    console.error('Error in developer process-url endpoint:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

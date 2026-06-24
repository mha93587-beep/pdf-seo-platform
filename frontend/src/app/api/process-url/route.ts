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

    const contentType = fetchRes.headers.get('content-type') || '';
    // Allow application/pdf and application/octet-stream (common for direct downloads)
    if (!contentType.includes('pdf') && !contentType.includes('octet-stream')) {
      // Still allow it — some servers don't set correct content-type
      console.warn(`Unexpected content-type: ${contentType}. Proceeding anyway.`);
    }

    const arrayBuffer = await fetchRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extract filename from URL path or use default
    const urlPath = parsedUrl.pathname;
    const urlFilename = path.basename(urlPath) || 'downloaded.pdf';
    const originalName = urlFilename.endsWith('.pdf') ? urlFilename : `${urlFilename}.pdf`;
    const safeName = originalName.replace(/[^a-zA-Z0-9.\-_]/g, '_');

    // Create temporary paths
    const tempDir = os.tmpdir();
    const uniqueId = Date.now().toString() + Math.floor(Math.random() * 1000);
    inputPath = path.join(tempDir, `input_${uniqueId}_${safeName}`);
    outputPath = path.join(tempDir, `output_${uniqueId}_${safeName}`);

    // Save the downloaded file temporarily
    await fs.writeFile(inputPath, buffer);

    // Call the Python script
    const scriptPath = path.resolve('../make_pdf_searchable_final.py');
    const markerApiKey = process.env.DATALAB_MARKER_API || '';

    const { stdout, stderr } = await execAsync(
      `python3 ${scriptPath} ${inputPath} ${outputPath}`,
      { env: { ...process.env, DATALAB_MARKER_API: markerApiKey } }
    );

    console.log('Script Output:', stdout);
    if (stderr) console.error('Script Stderr:', stderr);

    // Read the processed PDF
    const processedBuffer = await fs.readFile(outputPath);

    // Upload to Backblaze B2
    const b2FileName = `optimized_${uniqueId}_${safeName}`;
    await uploadToB2(processedBuffer, b2FileName, 'application/pdf');

    // Save metadata to Supabase
    const dynamicDownloadUrl = `/api/download?file=${encodeURIComponent(b2FileName)}`;
    const { error: dbError } = await supabase.from('processed_pdfs').insert({
      original_filename: originalName,
      b2_url: dynamicDownloadUrl,
      created_at: new Date().toISOString(),
      user_id: userId || null,
    });

    if (dbError) {
      console.warn('Could not save to Supabase:', dbError);
    }

    return NextResponse.json({ success: true, downloadUrl: dynamicDownloadUrl });
  } catch (error: any) {
    console.error('Error processing PDF from URL:', error);
    return NextResponse.json(
      { error: 'Failed to process PDF from URL', details: error.message },
      { status: 500 }
    );
  } finally {
    // Clean up temporary files
    if (inputPath) await fs.unlink(inputPath).catch(() => {});
    if (outputPath) await fs.unlink(outputPath).catch(() => {});
  }
}

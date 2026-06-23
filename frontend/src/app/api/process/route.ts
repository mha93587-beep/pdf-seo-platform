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
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Create temporary paths for the python script to work on
    const tempDir = os.tmpdir();
    const uniqueId = Date.now().toString() + Math.floor(Math.random() * 1000);
    const originalName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const inputPath = path.join(tempDir, `input_${uniqueId}_${originalName}`);
    const outputPath = path.join(tempDir, `output_${uniqueId}_${originalName}`);
    
    // Save the uploaded file temporarily
    await fs.writeFile(inputPath, buffer);

    // Call the Python script
    // Note: The python script must be at /storage/emulated/0/antigravity/pdfsearchability/make_pdf_searchable_final.py
    const scriptPath = path.resolve('../make_pdf_searchable_final.py');
    const markerApiKey = process.env.DATALAB_MARKER_API || ''; // If required by script env
    
    // Execute the Python script to make the PDF searchable
    const { stdout, stderr } = await execAsync(`python3 ${scriptPath} ${inputPath} ${outputPath}`, {
      env: { ...process.env, DATALAB_MARKER_API: markerApiKey }
    });
    
    console.log('Script Output:', stdout);
    if (stderr) console.error('Script Stderr:', stderr);

    // Read the processed PDF
    const processedBuffer = await fs.readFile(outputPath);

    // Upload to Backblaze B2
    const b2FileName = `optimized_${uniqueId}_${originalName}`;
    const publicUrl = await uploadToB2(processedBuffer, b2FileName, 'application/pdf');

    // Optionally save metadata to Supabase
    // Make sure a 'processed_pdfs' table exists in Supabase.
    const dynamicDownloadUrl = `/api/download?file=${encodeURIComponent(b2FileName)}`;
    const { error: dbError } = await supabase.from('processed_pdfs').insert({
      original_filename: file.name,
      b2_url: dynamicDownloadUrl,
      created_at: new Date().toISOString()
    });
    
    if (dbError) {
      console.warn('Could not save to Supabase. Make sure table processed_pdfs exists.', dbError);
    }

    // Clean up temporary files
    await fs.unlink(inputPath).catch(console.error);
    await fs.unlink(outputPath).catch(console.error);

    // Provide the dynamic download URL to the frontend so it generates a fresh signed URL when clicked
    return NextResponse.json({ success: true, downloadUrl: dynamicDownloadUrl });

  } catch (error: any) {
    console.error('Error processing PDF:', error);
    return NextResponse.json(
      { error: 'Failed to process PDF', details: error.message },
      { status: 500 }
    );
  }
}

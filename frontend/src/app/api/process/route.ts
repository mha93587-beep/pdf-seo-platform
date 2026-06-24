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
    const userId = formData.get('userId') as string | null;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    const uniqueId = Date.now().toString() + Math.floor(Math.random() * 1000);
    const originalName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    
    // 1. Upload original PDF to B2
    const originalB2FileName = `original_${uniqueId}_${originalName}`;
    await uploadToB2(buffer, originalB2FileName, file.type || 'application/pdf');
    const originalB2Url = `/api/download?file=${encodeURIComponent(originalB2FileName)}`;

    // 2. Insert record in Supabase with 'processing' status
    const { data: dbData, error: dbError } = await supabase
      .from('processed_pdfs')
      .insert({
        original_filename: file.name,
        b2_url: null,
        original_b2_url: originalB2Url,
        status: 'processing',
        created_at: new Date().toISOString(),
        user_id: userId || null
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
      const inputPath = path.join(tempDir, `input_${uniqueId}_${originalName}`);
      const outputPath = path.join(tempDir, `output_${uniqueId}_${originalName}`);
      
      try {
        // Save the uploaded file temporarily
        await fs.writeFile(inputPath, buffer);

        // Call the Python script
        const scriptPath = path.resolve('../make_pdf_searchable_final.py');
        const markerApiKey = process.env.DATALAB_MARKER_API || '';
        
        await execAsync(`python3 ${scriptPath} ${inputPath} ${outputPath}`, {
          env: { ...process.env, DATALAB_MARKER_API: markerApiKey }
        });
        
        // Read the processed PDF
        const processedBuffer = await fs.readFile(outputPath);

        // Upload optimized PDF to B2
        const b2FileName = `optimized_${uniqueId}_${originalName}`;
        await uploadToB2(processedBuffer, b2FileName, 'application/pdf');
        const dynamicDownloadUrl = `/api/download?file=${encodeURIComponent(b2FileName)}`;

        // Update database record to 'completed'
        await supabase
          .from('processed_pdfs')
          .update({
            b2_url: dynamicDownloadUrl,
            status: 'completed'
          })
          .eq('id', dbData.id);

      } catch (error: any) {
        console.error(`Background processing failed for ID ${dbData.id}:`, error);
        
        // Update database record to 'failed'
        await supabase
          .from('processed_pdfs')
          .update({
            status: 'failed'
          })
          .eq('id', dbData.id);
          
      } finally {
        // Clean up temporary files
        await fs.unlink(inputPath).catch(() => {});
        await fs.unlink(outputPath).catch(() => {});
      }
    })();

    // 4. Return success immediately with the new record ID
    return NextResponse.json({ success: true, id: dbData.id });

  } catch (error: any) {
    console.error('Error initiating PDF processing:', error);
    return NextResponse.json(
      { error: 'Failed to initiate PDF processing', details: error.message },
      { status: 500 }
    );
  }
}

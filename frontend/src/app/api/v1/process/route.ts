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
  try {
    // 1. Authenticate API Key
    const userId = await authenticateApiKey(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized: Invalid or missing API Key' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided in form-data field "file"' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    const uniqueId = Date.now().toString() + Math.floor(Math.random() * 1000);
    const originalName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    
    // 2. Upload original PDF to B2
    const originalB2FileName = `original_${uniqueId}_${originalName}`;
    await uploadToB2(buffer, originalB2FileName, file.type || 'application/pdf');
    const originalB2Url = `/api/download?file=${encodeURIComponent(originalB2FileName)}`;

    // 3. Insert record in Supabase with 'processing' status
    const { data: dbData, error: dbError } = await supabase
      .from('processed_pdfs')
      .insert({
        original_filename: file.name,
        b2_url: null,
        original_b2_url: originalB2Url,
        status: 'processing',
        created_at: new Date().toISOString(),
        user_id: userId
      })
      .select()
      .single();
    
    if (dbError || !dbData) {
      console.error('Could not save to Supabase:', dbError);
      return NextResponse.json({ error: 'Database record creation failed' }, { status: 500 });
    }

    // Get public hosting origin for API responses
    const requestUrl = new URL(request.url);
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || requestUrl.host;
    const proto = request.headers.get('x-forwarded-proto') || 'https';
    const origin = `${proto}://${host}`;

    // 4. Start processing in background (asynchronously)
    (async () => {
      const tempDir = os.tmpdir();
      const inputPath = path.join(tempDir, `input_${uniqueId}_${originalName}`);
      const outputPath = path.join(tempDir, `output_${uniqueId}_${originalName}`);
      
      try {
        await fs.writeFile(inputPath, buffer);

        const scriptPath = path.resolve('../make_pdf_searchable_final.py');
        const markerApiKey = process.env.DATALAB_MARKER_API || '';
        
        await execAsync(`python3 ${scriptPath} ${inputPath} ${outputPath}`, {
          env: { ...process.env, DATALAB_MARKER_API: markerApiKey }
        });
        
        const processedBuffer = await fs.readFile(outputPath);

        const b2FileName = `optimized_${uniqueId}_${originalName}`;
        await uploadToB2(processedBuffer, b2FileName, 'application/pdf');
        const dynamicDownloadUrl = `/api/download?file=${encodeURIComponent(b2FileName)}`;

        await supabase
          .from('processed_pdfs')
          .update({
            b2_url: dynamicDownloadUrl,
            status: 'completed'
          })
          .eq('id', dbData.id);

      } catch (error: any) {
        console.error(`Background API processing failed for ID ${dbData.id}:`, error);
        
        await supabase
          .from('processed_pdfs')
          .update({
            status: 'failed'
          })
          .eq('id', dbData.id);
          
      } finally {
        await fs.unlink(inputPath).catch(() => {});
        await fs.unlink(outputPath).catch(() => {});
      }
    })();

    // 5. Return success immediately with the record status info
    return NextResponse.json({
      success: true,
      order: {
        id: dbData.id,
        filename: file.name,
        status: 'processing',
        original_pdf_url: `${origin}${originalB2Url}`,
        status_check_url: `${origin}/api/v1/status/${dbData.id}`,
        created_at: dbData.created_at,
      }
    });

  } catch (error: any) {
    console.error('Error in developer process endpoint:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

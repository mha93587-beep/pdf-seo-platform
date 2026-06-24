import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { authenticateApiKey } from '@/lib/api-auth';

export async function GET(request: Request) {
  try {
    // 1. Authenticate API Key
    const userId = await authenticateApiKey(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized: Invalid or missing API Key' }, { status: 401 });
    }

    // 2. Fetch records belonging to this user
    const { data, error } = await supabase
      .from('processed_pdfs')
      .select('id, original_filename, status, created_at, b2_url, original_b2_url')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Get public hosting origin
    const requestUrl = new URL(request.url);
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || requestUrl.host;
    const proto = request.headers.get('x-forwarded-proto') || 'https';
    const origin = `${proto}://${host}`;

    const files = data.map((item: any) => ({
      id: item.id,
      original_filename: item.original_filename,
      status: item.status,
      created_at: item.created_at,
      original_pdf_url: item.original_b2_url ? `${origin}${item.original_b2_url}` : null,
      searchable_pdf_url: (item.status === 'completed' && item.b2_url) ? `${origin}${item.b2_url}` : null,
    }));

    return NextResponse.json({ files });

  } catch (error: any) {
    console.error('Error fetching developer file list:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

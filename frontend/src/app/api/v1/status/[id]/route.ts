import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { authenticateApiKey } from '@/lib/api-auth';

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Authenticate API Key
    const userId = await authenticateApiKey(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized: Invalid or missing API Key' }, { status: 401 });
    }

    const { id } = await props.params;
    if (!id) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    // 2. Fetch record from Supabase
    const { data, error } = await supabase
      .from('processed_pdfs')
      .select('*')
      .eq('id', parseInt(id))
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Get public hosting origin
    const requestUrl = new URL(request.url);
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || requestUrl.host;
    const proto = request.headers.get('x-forwarded-proto') || 'https';
    const origin = `${proto}://${host}`;

    return NextResponse.json({
      id: data.id,
      original_filename: data.original_filename,
      status: data.status,
      created_at: data.created_at,
      original_pdf_url: data.original_b2_url ? `${origin}${data.original_b2_url}` : null,
      searchable_pdf_url: (data.status === 'completed' && data.b2_url) ? `${origin}${data.b2_url}` : null,
    });

  } catch (error: any) {
    console.error('Error fetching order status:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

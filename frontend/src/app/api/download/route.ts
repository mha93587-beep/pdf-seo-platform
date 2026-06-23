import { NextResponse } from 'next/server';
import { getPresignedUrl } from '@/lib/b2';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get('file');

    if (!fileName) {
      return NextResponse.json({ error: 'File name is required' }, { status: 400 });
    }

    // Generate a fresh signed URL valid for 1 hour
    const signedUrl = await getPresignedUrl(fileName);

    // Redirect the user directly to the signed URL to start the download
    return NextResponse.redirect(signedUrl);
  } catch (error: any) {
    console.error('Error generating signed URL:', error);
    return NextResponse.json({ error: 'Failed to generate signed URL' }, { status: 500 });
  }
}

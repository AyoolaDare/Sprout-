
// src/app/api/image-proxy/route.ts
import { NextRequest, NextResponse } from 'next/server';

// ONLY allow your own storage bucket or trusted domains to prevent SSRF
const ALLOWED_HOSTS = [
  'firebasestorage.googleapis.com',
  'storage.googleapis.com',
  'picsum.photos'
];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const imageUrl = searchParams.get('url');

  if (!imageUrl) {
    return NextResponse.json({ error: 'Image URL is required.' }, { status: 400 });
  }

  try {
    const targetUrl = new URL(imageUrl);
    if (!ALLOWED_HOSTS.includes(targetUrl.hostname)) {
       return NextResponse.json({ error: 'Untrusted image host. Access denied.' }, { status: 403 });
    }

    const response = await fetch(imageUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || 'image/png';
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const dataUrl = `data:${contentType};base64,${base64}`;

    return NextResponse.json({ dataUrl });
  } catch (error: any) {
    console.error('Error proxying image:', error);
    return NextResponse.json(
      { error: 'Failed to proxy image.', details: error.message },
      { status: 500 }
    );
  }
}

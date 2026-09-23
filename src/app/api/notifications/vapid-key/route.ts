// src/app/api/notifications/vapid-key/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  if (!vapidPublicKey) {
    console.error('VAPID public key is not defined in environment variables.');
    return NextResponse.json(
      { error: 'Push notifications are not configured on the server.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ vapidPublicKey });
}

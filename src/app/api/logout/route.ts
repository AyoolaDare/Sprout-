// src/app/api/logout/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    cookies().delete('__session');
    return new NextResponse(JSON.stringify({ status: 'success' }), { status: 200 });
  } catch (error) {
    console.error('Error during logout:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to log out' }), { status: 500 });
  }
}

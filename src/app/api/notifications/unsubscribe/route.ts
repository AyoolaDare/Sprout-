
// src/app/api/notifications/unsubscribe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase-admin';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { cookies } from 'next/headers';

async function getUserIdFromSession(): Promise<string | null> {
    const sessionCookie = cookies().get('__session')?.value;
    if (!sessionCookie) return null;
    try {
        const decodedToken = await getAdminAuth().verifySessionCookie(sessionCookie, true);
        return decodedToken.uid;
    } catch {
        return null;
    }
}

export async function POST(req: NextRequest) {
    const userId = await getUserIdFromSession();
    if (!userId) {
        return NextResponse.json({ error: 'User not authenticated.' }, { status: 401 });
    }
    
    try {
        const { endpoint } = await req.json();
        if (!endpoint) {
             return NextResponse.json({ error: 'Endpoint is required.' }, { status: 400 });
        }

        const subDocId = Buffer.from(endpoint).toString('base64');
        const subscriptionRef = doc(db, `users/${userId}/subscriptions`, subDocId);

        await deleteDoc(subscriptionRef);
        
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error removing subscription:', error);
        return NextResponse.json({ error: 'Failed to remove subscription.', details: error.message }, { status: 500 });
    }
}

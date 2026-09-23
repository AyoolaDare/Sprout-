
// src/app/api/notifications/subscribe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase-admin';
import { doc, setDoc } from 'firebase/firestore';
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
        const subscription = await req.json();
        if (!subscription || !subscription.endpoint) {
             return NextResponse.json({ error: 'Subscription object is invalid.' }, { status: 400 });
        }

        // Use the endpoint as a unique ID for the document to prevent duplicates
        const subDocId = Buffer.from(subscription.endpoint).toString('base64');
        const subscriptionRef = doc(db, `users/${userId}/subscriptions`, subDocId);

        await setDoc(subscriptionRef, {
            ...subscription,
            createdAt: new Date().toISOString(),
        });
        
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error saving subscription:', error);
        return NextResponse.json({ error: 'Failed to save subscription.', details: error.message }, { status: 500 });
    }
}


// src/app/api/notifications/send/route.ts
import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { getAdminAuth } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
    // Basic auth check
    const sessionCookie = cookies().get('__session')?.value;
    if (!sessionCookie) {
        return NextResponse.json({ error: 'User not authenticated.' }, { status: 401 });
    }

    try {
        const { subscription, payload } = await req.json();
        
        if (!subscription) {
             return NextResponse.json({ error: 'Subscription object is required.' }, { status: 400 });
        }
        
        // --- DEFERRED INITIALIZATION ---
        // Moved from module scope to inside the handler to ensure env vars are loaded at runtime.
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
        const vapidSubject = process.env.VAPID_SUBJECT;

        // Final check to ensure keys are configured before trying to send
        if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
            console.error("VAPID keys are not fully configured on the server. A notification cannot be sent. Please check environment variables.");
            return NextResponse.json({ error: 'VAPID keys not configured on server.' }, { status: 500 });
        }
        
        webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
        // --- END DEFERRED INITIALIZATION ---

        await webpush.sendNotification(subscription, JSON.stringify(payload));
        
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error sending notification:', error);
        // Handle common errors from web-push library
        if (error.statusCode === 410) { // Gone - subscription is no longer valid
             return NextResponse.json({ error: 'Subscription is no longer valid and has been removed.', expired: true }, { status: 410 });
        }
        if (error.statusCode === 404) { // Not Found - often indicates an expired subscription
             return NextResponse.json({ error: 'Subscription not found or expired.', expired: true }, { status: 404 });
        }
        return NextResponse.json({ error: 'Failed to send notification.', details: error.message }, { status: 500 });
    }
}

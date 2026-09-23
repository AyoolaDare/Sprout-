'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, BellRing } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export default function NotificationsSettings() {
    const { toast } = useToast();
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [isChecking, setIsChecking] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSupported, setIsSupported] = useState(false);
    const [vapidKey, setVapidKey] = useState<string | null>(null);

    useEffect(() => {
        const setupNotifications = async () => {
            if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
                setIsSupported(true);
            } else {
                setIsSupported(false);
                setIsChecking(false);
                return;
            }

            try {
                // Step 1: Fetch VAPID key
                const response = await fetch('/api/notifications/vapid-key');
                if (!response.ok) {
                    throw new Error('Could not fetch VAPID key. Server responded with ' + response.status);
                }
                const { vapidPublicKey } = await response.json();
                if (!vapidPublicKey) {
                    throw new Error('Server returned an empty VAPID key.');
                }
                setVapidKey(vapidPublicKey);

                // Step 2: Register service worker
                const registration = await navigator.serviceWorker.register('/sw.js');
                
                // Step 3: Wait for the service worker to be ready, then check for subscription
                await navigator.serviceWorker.ready;

                const subscription = await registration.pushManager.getSubscription();
                setIsSubscribed(!!subscription);

            } catch (error) {
                console.error("Error during notification setup:", error);
                setIsSupported(false); // If any step fails, consider it unsupported.
            } finally {
                setIsChecking(false);
            }
        };
        
        setupNotifications();
    }, []);

    const handleSubscribe = async () => {
        if (!isSupported || !vapidKey) {
            toast({
                variant: 'destructive',
                title: 'Unsupported or Not Configured',
                description: 'Push notifications are not supported or the application keys are not configured.'
            });
            return;
        }

        setIsProcessing(true);

        try {
            const permissionResult = await Notification.requestPermission();
            if (permissionResult !== 'granted') {
                throw new Error('Permission not granted for notifications.');
            }
            
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidKey)
            });

            await fetch('/api/notifications/subscribe', {
                method: 'POST',
                body: JSON.stringify(subscription),
                headers: { 'Content-Type': 'application/json' }
            });

            setIsSubscribed(true);
            toast({
                title: 'Subscribed!',
                description: 'You will now receive notifications. Sending a test message...'
            });

            // Send a test notification immediately for verification
            await fetch('/api/notifications/send', {
                method: 'POST',
                body: JSON.stringify({
                    subscription,
                    payload: {
                        title: 'Welcome to Sprout Track!',
                        body: 'You have successfully enabled push notifications.',
                        options: { data: { url: '/' } }
                    }
                }),
                headers: { 'Content-Type': 'application/json' }
            });

        } catch (error: any) {
            console.error('Failed to subscribe:', error);
            if (error.name === 'NotAllowedError' || error.message.includes('Permission not granted')) {
                 toast({
                    variant: 'destructive',
                    title: 'Permission Denied',
                    description: 'You have blocked notifications. Please enable them in your browser settings to subscribe.'
                });
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Subscription Failed',
                    description: error.message || 'An unexpected error occurred. Please check console for details.'
                });
            }
        } finally {
            setIsProcessing(false);
        }
    };

    const handleUnsubscribe = async () => {
        setIsProcessing(true);
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();

            if (subscription) {
                await fetch('/api/notifications/unsubscribe', {
                    method: 'POST',
                    body: JSON.stringify({ endpoint: subscription.endpoint }),
                    headers: { 'Content-Type': 'application/json' },
                });
                
                await subscription.unsubscribe();
            }

            setIsSubscribed(false);
            toast({
                title: 'Unsubscribed',
                description: 'You will no longer receive notifications.'
            });
        } catch (error: any) {
            console.error('Failed to unsubscribe:', error);
            toast({
                variant: 'destructive',
                title: 'Unsubscription Failed',
                description: error.message || 'An unexpected error occurred.'
            });
        } finally {
            setIsProcessing(false);
        }
    };
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>Manage how you receive alerts and updates on this device.</CardDescription>
            </CardHeader>
            <CardContent>
                {isChecking ? (
                     <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin"/>
                        <span>Checking status...</span>
                     </div>
                ) : !isSupported ? (
                     <p className="text-sm text-muted-foreground">Push notifications are not supported on this browser, device, or may be misconfigured.</p>
                ) : !vapidKey ? (
                    <p className="text-sm text-destructive">Push notifications are not configured on the server. The public VAPID key is missing.</p>
                ) : isSubscribed ? (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        <p className="text-sm text-muted-foreground flex-grow">You are currently subscribed to push notifications on this device.</p>
                        <Button
                            variant="destructive"
                            onClick={handleUnsubscribe}
                            disabled={isProcessing}
                        >
                            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                            Unsubscribe
                        </Button>
                    </div>
                ) : (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                         <p className="text-sm text-muted-foreground flex-grow">Enable push notifications to get real-time alerts for low stock, overdue invoices, and more.</p>
                        <Button
                            onClick={handleSubscribe}
                            disabled={isProcessing}
                        >
                            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                            <BellRing className="mr-2 h-4 w-4" />
                            Enable Notifications
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

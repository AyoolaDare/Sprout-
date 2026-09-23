
'use client';

import { useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Camera, RefreshCw } from 'lucide-react';

const Webcam = dynamic(() => import('react-webcam'), {
  ssr: false,
  loading: () => <div className="h-[480px] w-full bg-muted rounded-lg flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin"/></div>,
});


interface ScanReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReceiptScanned: (imageSrc: string) => void;
}

export function ScanReceiptDialog({ open, onOpenChange, onReceiptScanned }: ScanReceiptDialogProps) {
  const webcamRef = useRef<any>(null);
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  const videoConstraints = {
    width: 640,
    height: 480,
    facingMode,
  };

  const capture = async () => {
    if (!webcamRef.current) {
       toast({
         variant: 'destructive',
         title: 'Camera Error',
         description: 'Camera component is not available.',
       });
       return;
    }
    const imageSrc = webcamRef.current.getScreenshot();

    if (!imageSrc) {
      toast({
        variant: 'destructive',
        title: 'Capture Failed',
        description: 'Could not capture an image. Try switching camera or check permissions.',
      });
      return;
    }
    
    // Pass the image data to the parent form, which will handle the AI call.
    onReceiptScanned(imageSrc);
  };
  
  const handleOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (!isOpen) {
        setCameraReady(false); // Reset camera ready state when dialog closes
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Scan Receipt</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
            <div className="w-full rounded-lg border overflow-hidden">
                <Webcam
                    ref={webcamRef}
                    audio={false}
                    screenshotFormat="image/png"
                    videoConstraints={videoConstraints}
                    onUserMedia={() => setCameraReady(true)}
                    onUserMediaError={(err) => {
                    console.error('Camera init error:', err);
                    toast({
                        variant: 'destructive',
                        title: 'Camera Permission Denied',
                        description: 'Enable camera access in your browser settings.',
                    });
                    }}
                />
            </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setFacingMode(facingMode === 'user' ? 'environment' : 'user')}
            >
              <RefreshCw className="mr-2 h-4 w-4" /> Switch Camera
            </Button>

            <Button onClick={capture} disabled={!cameraReady || loading}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Camera className="mr-2 h-4 w-4" />
              )}
              Capture
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

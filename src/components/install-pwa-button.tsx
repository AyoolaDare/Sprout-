'use client';

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Share, ArrowDownToLine, MonitorDown, MoreVertical } from 'lucide-react';

export default function InstallPwaButton() {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsStandalone(true);
      return;
    }

    const userAgent = navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    const isAndroidDevice = /android/.test(userAgent);
    const isMobile = isIosDevice || isAndroidDevice;

    setIsIOS(isIosDevice);
    setIsAndroid(isAndroidDevice);
    setIsDesktop(!isMobile);
    
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = () => {
    if (installPrompt) {
      installPrompt.prompt();
    } else {
      setShowInstructions(true);
    }
  };

  if (isStandalone) {
    return null;
  }

  const getInstructionContent = () => {
      if (isIOS) {
          return (
              <>
                <DialogTitle>Install on your iPhone or iPad</DialogTitle>
                <DialogDescription>Follow these simple steps to add Sprout Track to your Home Screen for a native app experience.</DialogDescription>
                 <div className="space-y-4 text-sm pt-4 text-foreground">
                    <p>1. In Safari, tap the <Share className="inline-block h-4 w-4 mx-1"/> button in the toolbar.</p>
                    <p>2. Scroll down and tap on <span className="font-semibold">'Add to Home Screen'</span>.</p>
                    <p>3. Confirm by tapping <span className="font-semibold">'Add'</span> in the top-right corner.</p>
                 </div>
              </>
          );
      }
      if (isAndroid) {
         return (
              <>
                <DialogTitle>Install on your Android Device</DialogTitle>
                <DialogDescription>Add Sprout Track to your Home Screen for quick and easy access.</DialogDescription>
                <div className="space-y-4 text-sm pt-4 text-foreground">
                    <p>1. In Chrome, tap the menu button (usually <MoreVertical className="inline-block h-4 w-4 mx-1"/>) in the top-right corner.</p>
                    <p>2. Tap on the <span className="font-semibold">'Install app'</span> or <span className="font-semibold">'Add to Home Screen'</span> option.</p>
                    <p>3. Follow the on-screen prompts to confirm the installation.</p>
                 </div>
              </>
         )
      }
      if (isDesktop) {
          return (
              <>
                <DialogTitle>Install on your Desktop</DialogTitle>
                <DialogDescription>Follow these steps to install the app on your computer for easy access.</DialogDescription>
                <div className="space-y-4 text-sm pt-4 text-foreground">
                    <p>1. Look for an install icon in your browser's address bar. It usually looks like <MonitorDown className="inline-block h-4 w-4 mx-1"/>.</p>
                    <p>2. Click the icon and then click the <span className="font-semibold">'Install'</span> button in the prompt that appears.</p>
                    <p>3. The app will be added to your desktop or applications folder.</p>
                 </div>
              </>
          );
      }
      return null;
  }

  return (
    <>
      <Button 
        variant="ghost" 
        className="w-full justify-start text-muted-foreground hover:text-primary hover:bg-primary/5 h-10 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:justify-center" 
        onClick={handleInstallClick}
      >
        <ArrowDownToLine className="h-4 w-4" />
        <span className="ml-3 group-data-[collapsible=icon]:hidden font-medium">Install App</span>
      </Button>

      <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            {getInstructionContent()}
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setShowInstructions(false)} className="w-full sm:w-auto">Got it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
import { useEffect, useState } from 'react';
import { Download, X, Smartphone, Monitor } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

export default function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already running as installed PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return;
    }

    // Check if already dismissed
    const wasDismissed = localStorage.getItem('pwa-install-dismissed');
    if (wasDismissed) {
      setDismissed(true);
      return;
    }

    // Show on all devices - mobile and desktop
    setShowPrompt(true);
  }, []);

  const handleInstall = async () => {
    // Check if iOS first
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    if (isIOS) {
      // iOS doesn't support programmatic install, show instructions
      alert('To install BLOM Academy:\\n\\n1. Tap the Share button (center bottom)\\n2. Scroll down and tap "Add to Home Screen"\\n3. Tap "Add"');
      return;
    }

    // Check if beforeinstallprompt is available
    if ('beforeinstallprompt' in window) {
      window.dispatchEvent(new Event('beforeinstallprompt'));
    } else {
      // Show a message for browsers that don't support it
      alert('To install BLOM Academy as an app:\\n\\n- On Chrome/Edge: Look for the install icon in the address bar\\n- Or right-click this page and select "Save as" > "Webpage, Complete"');
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  // Don't show if already installed or dismissed
  if (dismissed) {
    return null;
  }

  if (!showPrompt) {
    return null;
  }

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm">
      <Card className="shadow-lg border-2 border-primary/20">
        <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0">
          <CardTitle className="text-lg flex items-center gap-2">
            {isMobile ? (
              <Smartphone className="h-5 w-5 text-primary" />
            ) : (
              <Monitor className="h-5 w-5 text-primary" />
            )}
            Install App
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 -mt-2 -mr-2"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground mb-3">
            {isIOS 
              ? "Add BLOM Academy to your home screen for the best experience!"
              : isMobile
              ? "Install BLOM Academy on your device for easy access."
              : "Install BLOM Academy on your computer for easy access."}
          </p>
          <Button onClick={handleInstall} className="w-full gap-2">
            <Download className="h-4 w-4" />
            {isIOS ? "How to Install" : "Install App"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

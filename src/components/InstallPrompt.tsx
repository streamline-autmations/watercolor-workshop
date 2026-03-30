import { useEffect, useState } from 'react';
import { Download, X, Smartphone } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
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

    // Check if iOS device
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS) {
      // Show prompt for iOS - they can use "Add to Home Screen"
      setShowPrompt(true);
      return;
    }

    const handler = (e: Event) => {
      // Prevent Chrome 76+ from automatically showing the prompt
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    // Check if iOS first
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    if (isIOS) {
      // iOS doesn't support programmatic install, show instructions
      alert('To install BLOM Academy:\\n\\n1. Tap the Share button (center bottom)\\n2. Scroll down and tap "Add to Home Screen"\\n3. Tap "Add"');
      return;
    }

    if (!deferredPrompt) return;

    // Show the original browser prompt
    (deferredPrompt as any).prompt();

    // Wait for the user to respond
    const { outcome } = await (deferredPrompt as any).userChoice;
    
    // Clear the saved prompt
    setDeferredPrompt(null);
    setShowPrompt(false);

    if (outcome === 'dismissed') {
      // User dismissed - remember this choice
      localStorage.setItem('pwa-install-dismissed', 'true');
      setDismissed(true);
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

  // Check if it's iOS
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.matchMedia('(display-mode: standalone)').matches;

  // Only show on mobile or when PWA is supported
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isDesktop = !isMobile;

  // Show on mobile, or desktop when the browser supports it
  if (!isMobile && !deferredPrompt && !isIOS) {
    return null;
  }

  if (!showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm">
      <Card className="shadow-lg border-2 border-primary/20">
        <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0">
          <CardTitle className="text-lg flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
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
              : "Install BLOM Academy on your device for easy access."}
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

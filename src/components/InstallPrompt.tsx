import { useEffect, useState } from 'react';
import { Download, X, Smartphone, Monitor } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

declare global {
  interface Window {
    __pwaInstallPrompt: (Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
    }) | null;
  }
}

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

export default function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  const [hasNativePrompt, setHasNativePrompt] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    if (localStorage.getItem('pwa-install-dismissed')) return;

    // Always show the popup — we'll handle install differently per device
    setShowPrompt(true);

    // Check if native install prompt is already captured
    if (window.__pwaInstallPrompt) {
      setHasNativePrompt(true);
    }

    // Listen in case beforeinstallprompt fires after mount
    const handler = () => {
      setHasNativePrompt(true);
    };
    window.addEventListener('pwaInstallPromptReady', handler);

    const installedHandler = () => setShowPrompt(false);
    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('pwaInstallPromptReady', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const handleInstall = async () => {
    // iOS — native prompt not available, show manual steps
    if (isIOS) {
      setShowSteps(true);
      return;
    }

    // Android/Desktop with native prompt available
    if (window.__pwaInstallPrompt) {
      await window.__pwaInstallPrompt.prompt();
      const { outcome } = await window.__pwaInstallPrompt.userChoice;
      window.__pwaInstallPrompt = null;
      setHasNativePrompt(false);
      if (outcome === 'accepted') {
        setShowPrompt(false);
      }
      return;
    }

    // Android without native prompt — show manual steps
    setShowSteps(true);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  if (!showPrompt) return null;

  const isAndroid = /Android/i.test(navigator.userAgent);

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
          {showSteps ? (
            isIOS ? (
              <div className="text-sm space-y-1.5">
                <p className="font-medium">To install on iPhone / iPad:</p>
                <p>1. Tap the <strong>Share</strong> button <strong>↑</strong> at the bottom of Safari</p>
                <p>2. Scroll down and tap <strong>"Add to Home Screen"</strong></p>
                <p>3. Tap <strong>"Add"</strong></p>
              </div>
            ) : isAndroid ? (
              <div className="text-sm space-y-1.5">
                <p className="font-medium">To install on Android:</p>
                <p>1. Tap the <strong>⋮</strong> menu in your browser</p>
                <p>2. Tap <strong>"Add to Home screen"</strong> or <strong>"Install app"</strong></p>
                <p>3. Tap <strong>"Add"</strong></p>
              </div>
            ) : (
              <div className="text-sm space-y-1.5">
                <p className="font-medium">To install on your computer:</p>
                <p>Look for the <strong>install icon</strong> in your browser's address bar and click it.</p>
              </div>
            )
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-3">
                Would you like to install BLOM Academy on your {isMobile ? 'device' : 'computer'}? No app store needed.
              </p>
              <Button onClick={handleInstall} className="w-full gap-2">
                <Download className="h-4 w-4" />
                {hasNativePrompt ? 'Install App' : 'How to Install'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

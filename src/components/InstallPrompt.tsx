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
  const [showIOSSteps, setShowIOSSteps] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    if (localStorage.getItem('pwa-install-dismissed')) return;

    // Check if we already have the event (captured before React loaded)
    if (window.__pwaInstallPrompt || isIOS) {
      setShowPrompt(true);
    }

    // Also listen in case it fires after mount
    const handler = () => {
      if (!localStorage.getItem('pwa-install-dismissed') && !isStandalone()) {
        setShowPrompt(true);
      }
    };
    window.addEventListener('pwaInstallPromptReady', handler);

    // Hide once user installs
    const installedHandler = () => setShowPrompt(false);
    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('pwaInstallPromptReady', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSSteps(true);
      return;
    }

    const prompt = window.__pwaInstallPrompt;
    if (!prompt) return;

    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    window.__pwaInstallPrompt = null;

    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  if (!showPrompt) return null;

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
          {showIOSSteps ? (
            <div className="text-sm space-y-1.5">
              <p className="font-medium">To install on iPhone / iPad:</p>
              <p>1. Tap the <strong>Share</strong> button <strong>↑</strong> at the bottom of Safari</p>
              <p>2. Scroll down and tap <strong>"Add to Home Screen"</strong></p>
              <p>3. Tap <strong>"Add"</strong></p>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-3">
                Would you like to install BLOM Academy on your {isMobile ? 'device' : 'computer'}? No app store needed.
              </p>
              <Button onClick={handleInstall} className="w-full gap-2">
                <Download className="h-4 w-4" />
                {isIOS ? 'How to Install' : 'Install App'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

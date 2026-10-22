import { useEffect, useState } from 'react';

/**
 * `beforeinstallprompt` isn't in TS's own DOM lib (it's a Chromium-only
 * extension to the spec, never adopted by Safari/Firefox) -- declared here
 * rather than pulled from a types package, since this is the only place it's
 * used.
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari's own standalone flag; not covered by the media query above.
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/**
 * Exposes whether the browser has actually offered to install this app as a
 * PWA (`beforeinstallprompt` fired, and it hasn't been used or dismissed by
 * closing this instance of the prompt), and a function to show that native
 * install dialog on demand.
 *
 * Chromium browsers only -- Safari and Firefox never fire
 * `beforeinstallprompt`, so `canInstall` just stays false there and no
 * install button renders, which is the correct behaviour (nothing to
 * trigger on those browsers; iOS has its own manual "Add to Home Screen"
 * flow this doesn't cover).
 */
export function useInstallPrompt() {
  const [deferredEvent, setDeferredEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(isStandalone);

  useEffect(() => {
    function onBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setDeferredEvent(event as BeforeInstallPromptEvent);
    }
    function onAppInstalled() {
      setInstalled(true);
      setDeferredEvent(null);
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  async function promptInstall() {
    if (!deferredEvent) return;
    await deferredEvent.prompt();
    const { outcome } = await deferredEvent.userChoice;
    // Either way the browser won't refire beforeinstallprompt for this
    // session without a reload, so the stored event is spent regardless.
    setDeferredEvent(null);
    if (outcome === 'accepted') setInstalled(true);
  }

  return { canInstall: deferredEvent !== null && !installed, promptInstall };
}

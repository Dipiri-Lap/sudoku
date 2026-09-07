import { useState, useEffect } from 'react';
import { logEvent } from '../../firebase';

interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[];
    readonly userChoice: Promise<{
        outcome: 'accepted' | 'dismissed',
        platform: string
    }>;
    prompt(): Promise<void>;
}

export function usePWAInstall() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isInstalled, setIsInstalled] = useState(() =>
        window.matchMedia('(display-mode: standalone)').matches ||
        (navigator as any).standalone === true
    );

    useEffect(() => {
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
        };
        const handleAppInstalled = () => {
            setIsInstalled(true);
            setDeferredPrompt(null);
            // 설치는 재방문으로 이어지는 가장 강한 선행지표라 전환으로 쓴다.
            logEvent('pwa_install');
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const promptToInstall = async () => {
        if (!deferredPrompt) {
            setIsInstalled(true);
            return;
        }
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setIsInstalled(true);
        }
        setDeferredPrompt(null);
    };

    return { isInstalled, promptToInstall };
}

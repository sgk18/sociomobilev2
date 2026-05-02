"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { DownloadIcon, ShareIcon } from "@/components/icons";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    // Don't show if already installed (standalone mode)
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    // @ts-expect-error - navigator.standalone is iOS specific
    if (window.navigator.standalone) return;

    // Check if dismissed recently (24h cooldown)
    const dismissed = localStorage.getItem("install-prompt-dismissed");
    if (dismissed && Date.now() - parseInt(dismissed) < 86400000) return;

    // iOS detection
    const ua = navigator.userAgent;
    const isIOSDevice = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

    if (isIOSDevice) {
      setIsIOS(true);
      // Show after 3 seconds on iOS
      const t = setTimeout(() => setShow(true), 3000);
      return () => clearTimeout(t);
    }

    // Android / Chrome
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show after 2 seconds
      setTimeout(() => setShow(true), 2000);
    };

    const installedHandler = () => {
      setShow(false);
      setDeferredPrompt(null);
      localStorage.setItem("install-prompt-dismissed", Date.now().toString());
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installedHandler);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }

    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setShow(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem("install-prompt-dismissed", Date.now().toString());
  };

  if (!show) return null;

  // iOS guide modal
  if (isIOS && showIOSGuide) {
    return (
      <div className="modal-backdrop" onClick={() => setShowIOSGuide(false)}>
        <div className="modal-card p-6" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 rounded-[var(--radius-lg)] bg-blue-50 flex items-center justify-center">
              <Image src="/logo.svg" alt="SOCIO" width={28} height={28} />
            </div>
            <h3 className="text-[16px] font-extrabold">Install SOCIO</h3>
          </div>
          <p className="text-[13px] text-[var(--color-text-muted)] mb-5 leading-relaxed">
            Follow these simple steps to add SOCIO to your home screen
          </p>
          <div className="space-y-3.5">
            <div className="flex gap-3 p-3.5 bg-gray-50 rounded-[var(--radius-lg)] border border-gray-200">
              <div className="w-9 h-9 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center shrink-0 text-[13px] font-bold">1</div>
              <div>
                <p className="text-[13px] font-semibold">Tap the Share button</p>
                <p className="text-[12px] text-[var(--color-text-muted)] mt-1">
                  Look for <ShareIcon size={13} className="inline text-[var(--color-info)]" /> in your Safari toolbar at the bottom
                </p>
              </div>
            </div>
            <div className="flex gap-3 p-3.5 bg-gray-50 rounded-[var(--radius-lg)] border border-gray-200">
              <div className="w-9 h-9 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center shrink-0 text-[13px] font-bold">2</div>
              <div>
                <p className="text-[13px] font-semibold">Select "Add to Home Screen"</p>
                <p className="text-[12px] text-[var(--color-text-muted)] mt-1">Scroll down in the share menu if you don't see this option</p>
              </div>
            </div>
            <div className="flex gap-3 p-3.5 bg-gray-50 rounded-[var(--radius-lg)] border border-gray-200">
              <div className="w-9 h-9 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center shrink-0 text-[13px] font-bold">3</div>
              <div>
                <p className="text-[13px] font-semibold">Confirm with "Add"</p>
                <p className="text-[12px] text-[var(--color-text-muted)] mt-1">SOCIO will appear on your home screen instantly</p>
              </div>
            </div>
          </div>
          <button onClick={() => setShowIOSGuide(false)} className="btn btn-primary w-full mt-5 font-bold">
            Got it
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-[calc(var(--bottom-nav)+var(--safe-bottom)+12px)] left-3 right-3 z-40 animate-slide-up">
      <div className="relative overflow-hidden rounded-[var(--radius-lg)] bg-gradient-to-br from-[var(--color-primary-dark)] via-[var(--color-primary)] to-[#1a3db0] text-white p-4 shadow-2xl border border-white/10">
        {/* Decorative background elements */}
        <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 w-32 h-32 rounded-full bg-white/5 blur-3xl" />
        
        {/* Content */}
        <div className="relative z-10">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-12 h-12 rounded-[var(--radius-lg)] bg-white flex items-center justify-center shrink-0 ring-2 ring-white/30 shadow-sm">
              <Image src="/applogo.png" alt="SOCIO" width={28} height={28} />
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <p className="text-[14px] font-extrabold">Get SOCIO on your device</p>
              <p className="text-[12px] opacity-80 mt-0.5 leading-snug">One-tap access to events, registrations & your network</p>
            </div>
          </div>
          
          {/* Quick benefits */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="text-center text-[10px] opacity-75">
              <p className="font-bold">Instant</p>
            </div>
            <div className="text-center text-[10px] opacity-75">
              <p className="font-bold">Offline</p>
            </div>
            <div className="text-center text-[10px] opacity-75">
              <p className="font-bold">Notifications</p>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex gap-2">
            <button 
              onClick={handleInstall} 
              className="flex-1 btn bg-white text-[var(--color-primary-dark)] font-bold text-[13px] py-2.5 rounded-[var(--radius-lg)] hover:bg-white/95 transition-all active:scale-95"
            >
              <DownloadIcon size={15} className="inline mr-1" />
              Install
            </button>
            <button 
              onClick={handleDismiss} 
              className="btn bg-white/15 text-white font-semibold text-[13px] py-2.5 px-3 rounded-[var(--radius-lg)] border border-white/20 hover:bg-white/20 transition-all"
            >
              Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

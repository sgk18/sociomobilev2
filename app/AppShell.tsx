"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Capacitor } from "@capacitor/core";
import { ScreenOrientation } from "@capacitor/screen-orientation";
import DesktopGate from "@/components/DesktopGate";
import OrientationGate from "@/components/OrientationGate";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import InstallPrompt from "@/components/InstallPrompt";
import BrowserNotificationPrompt from "@/components/BrowserNotificationPrompt";
import ChatbotFab from "@/components/ChatbotFab";
import CampusSelector, { isCampusDismissedRecently } from "@/components/CampusSelector";
import PageTransition from "@/components/PageTransition";
import { useAuth } from "@/context/AuthContext";

const NO_SHELL = ["/auth", "/auth/callback", "/offline"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hide = NO_SHELL.some((p) => pathname.startsWith(p));
  const { userData, session, needsCampus, refreshUserData } = useAuth();
  const [campusDismissed, setCampusDismissed] = useState(false);

  useEffect(() => {
    setCampusDismissed(isCampusDismissedRecently());
    
    // Lock orientation to portrait if running natively via Capacitor
    if (Capacitor.isNativePlatform()) {
      ScreenOrientation.lock({ orientation: "portrait" }).catch(() => {
        // Ignore errors if plugin fails or isn't supported on device
      });
    }
  }, []);

  const handleCampusComplete = (campus: string) => {
    if (campus) refreshUserData();
  };

  const handleCampusDismiss = () => {
    setCampusDismissed(true);
  };

  return (
    <>
      <DesktopGate />
      <OrientationGate />
      {!hide && <TopBar />}
      <main>
        <PageTransition>{children}</PageTransition>
      </main>
      {!hide && <BottomNav />}
      {!hide && <InstallPrompt />}
      {!hide && <ChatbotFab />}
      {!hide && userData && <BrowserNotificationPrompt />}
      {needsCampus && !campusDismissed && userData && (
        <CampusSelector
          email={userData.email}
          accessToken={session?.access_token ?? ""}
          onComplete={handleCampusComplete}
          onDismiss={handleCampusDismiss}
        />
      )}
    </>
  );
}

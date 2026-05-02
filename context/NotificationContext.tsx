"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import { Capacitor } from "@capacitor/core";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  eventId: string | null;
  eventTitle: string | null;
  read: boolean;
  createdAt: string;
  actionUrl: string | null;
  isBroadcast: boolean;
}

interface NotifCtx {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  panelOpen: boolean;
  openPanel: () => void;
  closePanel: () => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  dismiss: (id: string) => void;
  dismissAll: () => void;
  refresh: () => void;
  requestPushPermissions: () => Promise<void>;
}

const NotifContext = createContext<NotifCtx>({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  panelOpen: false,
  openPanel: () => {},
  closePanel: () => {},
  markRead: () => {},
  markAllRead: () => {},
  dismiss: () => {},
  dismissAll: () => {},
  refresh: () => {},
  requestPushPermissions: async () => {},
});

export const useNotifications = () => useContext(NotifContext);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { userData, session } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [isOneSignalInitialized, setIsOneSignalInitialized] = useState(false);
  const [oneSignal, setOneSignal] = useState<any>(null);
  const router = useRouter();

  // 1. Load OneSignal dynamically and Initialize
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || isOneSignalInitialized) return;

    async function initOneSignal() {
      try {
        const OS = (await import("onesignal-cordova-plugin")).default;
        setOneSignal(OS);

        const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
        if (!appId || appId === "placeholder_onesignal_id_here") {
          console.warn("OneSignal App ID missing or is placeholder.");
          return;
        }

        OS.initialize(appId);

        // Deep linking listener
        OS.Notifications.addEventListener("click", (event: any) => {
          const data = event.notification.additionalData;
          if (data?.route) {
            router.push(data.route);
          }
        });

        // Foreground listener
        OS.Notifications.addEventListener("foregroundWillDisplay", (event: any) => {
          event.preventDefault();
          const notif = event.notification;
          
          toast.custom((t) => (
            <div
              onClick={() => {
                toast.dismiss(t.id);
                if (notif.additionalData?.route) {
                  router.push(notif.additionalData.route);
                }
              }}
              className={`${
                t.visible ? "animate-enter" : "animate-leave"
              } max-w-md w-full bg-white shadow-lg rounded-xl pointer-events-auto flex ring-1 ring-black ring-opacity-5 cursor-pointer active:scale-95 transition-transform`}
            >
              <div className="flex-1 w-0 p-4">
                <div className="flex items-start">
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-bold text-[var(--color-primary)]">
                      {notif.title || "New Notification"}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {notif.body}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ), { duration: 5000, position: "top-center" });
        });

        setIsOneSignalInitialized(true);
      } catch (e) {
        console.error("Failed to load or initialize OneSignal", e);
      }
    }

    initOneSignal();
  }, [isOneSignalInitialized, router]);

  // 2. Identify User & Apply Segments
  useEffect(() => {
    if (!isOneSignalInitialized || !userData?.id || !oneSignal) return;

    try {
      oneSignal.login(userData.id.toString());

      const tags: Record<string, string> = {
        department: userData.department || "none",
        org_type: userData.organization_type || "outsider",
        campus: userData.campus || "none",
      };
      oneSignal.User.addTags(tags);
    } catch (e) {
      console.error("Failed to set OneSignal tags", e);
    }
  }, [userData, isOneSignalInitialized, oneSignal]);

  // 3. Request permissions explicitly
  const requestPushPermissions = useCallback(async () => {
    if (!isOneSignalInitialized || !oneSignal) return;
    try {
      const granted = await oneSignal.Notifications.requestPermission(true);
      if (granted) {
        toast.success("Push notifications enabled!");
      }
    } catch (e) {
      console.error("Error requesting push permissions", e);
    }
  }, [isOneSignalInitialized, oneSignal]);

  // PWA Polling
  const fetchNotifications = useCallback(async () => {
    if (!userData?.email) return;
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/pwa/notifications?email=${encodeURIComponent(userData.email)}&page=1&limit=30`,
        {
          headers: session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : undefined,
        }
      );
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        if (data.unreadCount !== undefined) {
          setUnreadCount(data.unreadCount);
        } else {
          setUnreadCount((data.notifications || []).filter((n: Notification) => !n.read).length);
        }
      }
    } catch {}
    setIsLoading(false);
  }, [userData?.email, session?.access_token]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markRead = useCallback(
    async (id: string) => {
      if (!userData?.email) return;
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      try {
        await fetch(`/api/pwa/notifications/${id}/read`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
          },
          body: JSON.stringify({ email: userData.email }),
        });
      } catch {}
    },
    [userData?.email, session?.access_token]
  );

  const markAllRead = useCallback(async () => {
    if (!userData?.email) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    try {
      await fetch(`/api/pwa/notifications`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ email: userData.email }),
      });
    } catch {}
  }, [userData?.email, session?.access_token]);

  const dismiss = useCallback(
    async (id: string) => {
      if (!userData?.email) return;

      const dismissed = notifications.find((n) => n.id === id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (dismissed && !dismissed.read) {
        setUnreadCount((c) => Math.max(0, c - 1));
      }

      try {
        await fetch(`/api/pwa/notifications/${encodeURIComponent(id)}?email=${encodeURIComponent(userData.email)}`, {
          method: "DELETE",
          headers: session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : undefined,
        });
      } catch {}
    },
    [notifications, userData?.email, session?.access_token]
  );

  const dismissAll = useCallback(async () => {
    if (!userData?.email) return;

    setNotifications([]);
    setUnreadCount(0);

    try {
      await fetch(`/api/pwa/notifications?email=${encodeURIComponent(userData.email)}`, {
        method: "DELETE",
        headers: session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : undefined,
      });
    } catch {}
  }, [userData?.email, session?.access_token]);

  return (
    <NotifContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        panelOpen,
        openPanel: () => setPanelOpen(true),
        closePanel: () => setPanelOpen(false),
        markRead,
        markAllRead,
        dismiss,
        dismissAll,
        refresh: fetchNotifications,
        requestPushPermissions,
      }}
    >
      {children}
    </NotifContext.Provider>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationContext";
import CampusSelector from "@/components/CampusSelector";
import { Button } from "@/components/Button";
import { LogOutIcon, BellIcon, MapPinIcon } from "@/components/icons";

export default function SettingsPage() {
  const { userData, session, signOut, refreshUserData } = useAuth();
  const router = useRouter();
  const { requestPushPermissions } = useNotifications();
  const [showCampusSelector, setShowCampusSelector] = useState(false);

  const [notificationPrefs, setNotificationPrefs] = useState({
    events: true,
    clubs: true,
    announcements: true,
  });

  const togglePref = async (key: keyof typeof notificationPrefs) => {
    const newVal = !notificationPrefs[key];
    setNotificationPrefs((prev) => ({ ...prev, [key]: newVal }));

    // Sync with OneSignal segment tags
    try {
      const OS = (await import("onesignal-cordova-plugin")).default;
      if (OS && OS.User) {
        OS.User.addTag(`opt_out_${key}`, newVal ? "false" : "true");
      }
    } catch (e) {
      // Ignore if not native
    }
  };

  if (!userData) return null;

  return (
    <div className="pwa-page min-h-screen px-4 pb-[calc(var(--bottom-nav)+var(--safe-bottom)+96px)] pt-[calc(var(--nav-height)+var(--safe-top)+20px)] animate-fade-in">
      {/* Campus Settings */}
      {userData.organization_type === "christ_member" && (
        <div className="mb-4">
          <div className="card p-4">
            <h2 className="text-[15px] font-extrabold flex items-center gap-2 mb-3">
              <MapPinIcon size={15} className="text-[var(--color-primary)]" />
              Campus Management
            </h2>
            <p className="text-[12px] text-[var(--color-text-muted)] mb-4">
              Update your registered campus and department. This affects which events you can access.
            </p>
            <Button
              onClick={() => setShowCampusSelector(true)}
              variant="outline"
              fullWidth
              className="border-[var(--color-border)] text-[var(--color-text)]"
            >
              {userData.campus ? "Change Campus/Department" : "Detect Your Campus"}
            </Button>
          </div>
        </div>
      )}

      {/* Notification Preferences */}
      <div className="mb-4">
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[15px] font-extrabold flex items-center gap-2">
              <BellIcon size={15} className="text-[var(--color-primary)]" />
              Push Notifications
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={requestPushPermissions}
              className="text-[11px] h-7 px-2 border-[var(--color-primary)] text-[var(--color-primary)]"
            >
              Enable Push
            </Button>
          </div>

          <div className="space-y-3 mt-4">
            {[
              {
                key: "events" as const,
                label: "Event Reminders",
                desc: "Get notified before registered events start",
              },
              {
                key: "clubs" as const,
                label: "Club Updates",
                desc: "News from clubs you follow",
              },
              {
                key: "announcements" as const,
                label: "Announcements",
                desc: "Important campus broadcasts",
              },
            ].map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <p className="text-[13px] font-semibold text-[var(--color-text)]">
                    {label}
                  </p>
                  <p className="text-[11px] text-[var(--color-text-muted)]">
                    {desc}
                  </p>
                </div>
                <button
                  onClick={() => togglePref(key)}
                  className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
                    notificationPrefs[key] ? "bg-[var(--color-primary)]" : "bg-gray-300"
                  }`}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                      notificationPrefs[key] ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Account Actions */}
      <div className="mb-4">
        <div className="card p-4">
          <h2 className="text-[15px] font-extrabold mb-3">Account</h2>
          <Button
            variant="danger"
            fullWidth
            onClick={async () => {
              await signOut();
              router.replace("/auth");
            }}
            leftIcon={<LogOutIcon size={16} />}
          >
            Sign out
          </Button>
        </div>
      </div>

      {/* Campus Selector modal */}
      {showCampusSelector && userData?.email && session?.access_token && (
        <CampusSelector
          email={userData.email}
          accessToken={session.access_token}
          onComplete={async () => {
            setShowCampusSelector(false);
            await refreshUserData();
          }}
          onDismiss={() => setShowCampusSelector(false)}
        />
      )}
    </div>
  );
}

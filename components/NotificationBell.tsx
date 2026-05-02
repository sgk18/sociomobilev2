"use client";

import { BellIcon } from "@/components/icons";
import { useNotifications } from "@/context/NotificationContext";
import { useRouter } from "next/navigation";

export default function NotificationBell() {
  const { unreadCount } = useNotifications();
  const router = useRouter();

  const handleBellClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push('/notifications');
  };

  return (
    <button
      onClick={handleBellClick}
      className="relative p-2 -mr-1 rounded-full hover:bg-black/5 transition-colors"
      aria-label="Notifications"
      type="button"
    >
      <BellIcon size={22} strokeWidth={2} />
      {unreadCount > 0 && (
        <span className="badge-count">{unreadCount > 99 ? "99+" : unreadCount}</span>
      )}
    </button>
  );
}

"use client";

import { NotificationList } from "@/components/notifications/NotificationList";

export default function NotificationsPage() {
  return (
    <div>
      <div className="sticky top-[57px] z-10 border-b border-surface-200 bg-white/80 px-4 py-3 backdrop-blur-md dark:border-surface-700 dark:bg-surface-900/80">
        <h1 className="text-lg font-bold text-surface-900 dark:text-surface-50">Notifications</h1>
      </div>

      <NotificationList />
    </div>
  );
}

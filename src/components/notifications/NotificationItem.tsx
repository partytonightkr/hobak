"use client";

import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { cn, formatRelativeTime } from "@/lib/utils";

export interface Notification {
  id: string;
  type: "LIKE" | "COMMENT" | "REPLY" | "FOLLOW" | "MENTION" | "REPOST";
  actor: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  } | null;
  targetId: string | null;
  targetType: string | null;
  read: boolean;
  createdAt: string;
}

interface NotificationItemProps {
  notification: Notification;
  onMarkRead: (id: string) => void;
}

const notificationText: Record<string, string> = {
  LIKE: "liked your post",
  COMMENT: "commented on your post",
  REPLY: "replied to your comment",
  FOLLOW: "started following you",
  MENTION: "mentioned you",
  REPOST: "reposted your post",
};

const notificationIcon: Record<string, React.ReactNode> = {
  LIKE: (
    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
      <svg className="h-3.5 w-3.5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
        <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    </div>
  ),
  COMMENT: (
    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/30">
      <svg className="h-3.5 w-3.5 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    </div>
  ),
  REPLY: (
    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/30">
      <svg className="h-3.5 w-3.5 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
      </svg>
    </div>
  ),
  FOLLOW: (
    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
      <svg className="h-3.5 w-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    </div>
  ),
  MENTION: (
    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-100 dark:bg-accent-900/30">
      <span className="text-xs font-bold text-accent-500">@</span>
    </div>
  ),
  REPOST: (
    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
      <svg className="h-3.5 w-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    </div>
  ),
};

function getNotificationLink(notification: Notification): string {
  switch (notification.type) {
    case "FOLLOW":
      return notification.actor ? `/profile/${notification.actor.username}` : `/notifications`;
    default:
      return notification.targetId ? `/feed` : `/notifications`;
  }
}

export function NotificationItem({ notification, onMarkRead }: NotificationItemProps) {
  return (
    <Link
      href={getNotificationLink(notification)}
      onClick={() => {
        if (!notification.read) onMarkRead(notification.id);
      }}
      className={cn(
        "flex items-start gap-3 px-4 py-3 transition-colors hover:bg-surface-50 dark:hover:bg-surface-800",
        !notification.read && "bg-primary-50/50 dark:bg-primary-900/10"
      )}
    >
      <Avatar src={notification.actor?.avatarUrl ?? null} alt={notification.actor?.displayName ?? "User"} size="md" />

      <div className="min-w-0 flex-1">
        <p className="text-sm text-surface-700 dark:text-surface-300">
          <span className="font-semibold text-surface-900 dark:text-surface-50">{notification.actor?.displayName ?? "Someone"}</span>{" "}
          {notificationText[notification.type] ?? "interacted with your content"}
        </p>
        <time className="text-xs text-surface-400">{formatRelativeTime(notification.createdAt)}</time>
      </div>

      <div className="shrink-0">{notificationIcon[notification.type]}</div>
    </Link>
  );
}

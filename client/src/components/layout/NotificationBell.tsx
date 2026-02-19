"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { connectSSE } from "@/lib/sse";
import api from "@/lib/api";

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const sseConnected = useRef(false);

  useEffect(() => {
    // Fetch initial unread count
    api.get("/notifications/unread-count")
      .then(({ data }) => setUnreadCount(data.count ?? 0))
      .catch(() => {});

    // Connect SSE for real-time updates
    const disconnect = connectSSE("/notifications/stream", {
      onEvent(eventType, data) {
        sseConnected.current = true;
        if (eventType === "notification") {
          setUnreadCount((c) => c + 1);
        } else if (eventType === "unread-count") {
          try {
            const parsed = JSON.parse(data);
            setUnreadCount(parsed.count ?? 0);
          } catch {}
        }
      },
      onError() {
        sseConnected.current = false;
      },
    });

    // Polling fallback every 60s when SSE is not connected
    const interval = setInterval(() => {
      if (!sseConnected.current) {
        api.get("/notifications/unread-count")
          .then(({ data }) => setUnreadCount(data.count ?? 0))
          .catch(() => {});
      }
    }, 60_000);

    return () => {
      disconnect();
      clearInterval(interval);
    };
  }, []);

  return (
    <Link
      href="/notifications"
      className="relative rounded-lg p-2 text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800"
    >
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
      {unreadCount > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Link>
  );
}

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Notification } from "@/components/notifications/NotificationItem";
import { connectSSE } from "@/lib/sse";
import api from "@/lib/api";

/**
 * Hook that manages notifications with SSE for real-time updates.
 * Falls back to polling if SSE is unavailable.
 */
export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const sseConnected = useRef(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const { data } = await api.get("/notifications");
      const list = data.data ?? data.notifications ?? [];
      setNotifications(list);
      setUnreadCount(list.filter((n: Notification) => !n.read).length);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // SSE connection for real-time notification pushes
  useEffect(() => {
    const disconnect = connectSSE("/notifications/stream", {
      onEvent(eventType, data) {
        sseConnected.current = true;
        if (eventType === "notification") {
          try {
            const notif = JSON.parse(data) as Notification;
            setNotifications((prev) => [notif, ...prev]);
            setUnreadCount((c) => c + 1);
          } catch {}
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

    return disconnect;
  }, []);

  // Polling fallback: refresh every 60s if SSE is not connected
  useEffect(() => {
    const interval = setInterval(() => {
      if (!sseConnected.current) {
        api.get("/notifications/unread-count")
          .then(({ data }) => setUnreadCount(data.count ?? 0))
          .catch(() => {});
      }
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  const markRead = useCallback(async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await api.patch(`/notifications/${id}/read`);
    } catch {
      // revert on failure
    }
  }, []);

  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    try {
      await api.post("/notifications/read-all");
    } catch {
      // revert on failure
    }
  }, []);

  return { notifications, unreadCount, isLoading, markRead, markAllRead, refresh: fetchNotifications };
}

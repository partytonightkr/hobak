"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import api from "@/lib/api";

interface SuggestedUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  isVerified: boolean;
}

export function SuggestedUsers() {
  const [users, setUsers] = useState<SuggestedUser[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function fetchSuggestions() {
      try {
        const { data } = await api.get("/search/suggestions");
        setUsers(data.data ?? data.users ?? []);
      } catch {
        // silently fail -- suggestions are non-critical
      }
    }
    fetchSuggestions();
  }, []);

  const handleFollow = async (userId: string) => {
    const wasFollowing = followingIds.has(userId);
    setFollowingIds((prev) => {
      const next = new Set(prev);
      if (wasFollowing) next.delete(userId);
      else next.add(userId);
      return next;
    });
    try {
      if (wasFollowing) {
        await api.delete(`/users/${userId}/follow`);
      } else {
        await api.post(`/users/${userId}/follow`);
      }
    } catch {
      setFollowingIds((prev) => {
        const next = new Set(prev);
        if (wasFollowing) next.add(userId);
        else next.delete(userId);
        return next;
      });
    }
  };

  if (users.length === 0) return null;

  return (
    <div className="rounded-xl border border-surface-200 bg-white p-4 dark:border-surface-700 dark:bg-surface-900">
      <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-50">Who to follow</h3>
      <div className="mt-3 space-y-3">
        {users.slice(0, 5).map((user) => (
          <div key={user.id} className="flex items-center gap-2.5">
            <Link href={`/profile/${user.username}`}>
              <Avatar src={user.avatarUrl} alt={user.displayName} size="sm" />
            </Link>
            <div className="min-w-0 flex-1">
              <Link href={`/profile/${user.username}`} className="block truncate text-sm font-medium text-surface-900 hover:underline dark:text-surface-50">
                {user.displayName}
              </Link>
              <p className="truncate text-xs text-surface-500">@{user.username}</p>
            </div>
            <Button
              variant={followingIds.has(user.id) ? "secondary" : "primary"}
              size="sm"
              onClick={() => handleFollow(user.id)}
            >
              {followingIds.has(user.id) ? "Following" : "Follow"}
            </Button>
          </div>
        ))}
      </div>
      <Link href="/search" className="mt-3 block text-xs font-medium text-primary-500 hover:text-primary-600">
        Show more
      </Link>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";

interface FollowUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  isVerified: boolean;
  isFollowing: boolean;
}

interface FollowersListProps {
  username: string;
  type: "followers" | "following";
}

export function FollowersList({ username, type }: FollowersListProps) {
  const [users, setUsers] = useState<FollowUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const currentUser = useAuthStore((s) => s.user);

  useEffect(() => {
    async function fetch() {
      try {
        const { data } = await api.get(`/users/${username}/${type}`);
        setUsers(data.data ?? data.users ?? []);
      } finally {
        setIsLoading(false);
      }
    }
    fetch();
  }, [username, type]);

  const toggleFollow = async (userId: string) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, isFollowing: !u.isFollowing } : u))
    );
    try {
      const user = users.find((u) => u.id === userId);
      if (user?.isFollowing) {
        await api.delete(`/users/${userId}/follow`);
      } else {
        await api.post(`/users/${userId}/follow`);
      }
    } catch {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, isFollowing: !u.isFollowing } : u))
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner className="h-6 w-6 text-primary-500" />
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-surface-500">
        {type === "followers" ? "No followers yet" : "Not following anyone yet"}
      </p>
    );
  }

  return (
    <div className="divide-y divide-surface-100 dark:divide-surface-800">
      {users.map((user) => (
        <div key={user.id} className="flex items-center gap-3 p-4">
          <Link href={`/profile/${user.username}`}>
            <Avatar src={user.avatarUrl} alt={user.displayName} size="md" />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <Link href={`/profile/${user.username}`} className="truncate text-sm font-semibold text-surface-900 hover:underline dark:text-surface-50">
                {user.displayName}
              </Link>
              {user.isVerified && (
                <svg className="h-4 w-4 shrink-0 text-primary-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <p className="text-xs text-surface-500">@{user.username}</p>
            {user.bio && (
              <p className="mt-0.5 truncate text-xs text-surface-600 dark:text-surface-400">{user.bio}</p>
            )}
          </div>
          {currentUser?.id !== user.id && (
            <Button
              variant={user.isFollowing ? "secondary" : "primary"}
              size="sm"
              onClick={() => toggleFollow(user.id)}
            >
              {user.isFollowing ? "Following" : "Follow"}
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}

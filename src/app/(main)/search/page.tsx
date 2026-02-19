"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import api from "@/lib/api";

interface SearchUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  isVerified: boolean;
  isFollowing: boolean;
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<SearchUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setUsers([]);
      setHasSearched(false);
      return;
    }

    setIsSearching(true);
    setHasSearched(true);
    try {
      const { data } = await api.get("/search", { params: { q, type: "users" } });
      setUsers(data.users ?? []);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length >= 2) {
        search(query);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, search]);

  return (
    <div>
      <div className="sticky top-[57px] z-10 border-b border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-900">
        <div className="p-4">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search people..."
              className="w-full rounded-full border border-surface-200 bg-surface-50 py-2.5 pl-10 pr-4 text-sm text-surface-900 placeholder:text-surface-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-100"
              autoFocus
            />
          </div>
        </div>
      </div>

      {isSearching ? (
        <div className="flex items-center justify-center py-12">
          <Spinner className="h-6 w-6 text-primary-500" />
        </div>
      ) : !hasSearched ? (
        <div className="py-12 text-center">
          <svg className="mx-auto h-12 w-12 text-surface-300 dark:text-surface-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="mt-3 text-sm text-surface-500">Search for people on Commune</p>
        </div>
      ) : users.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm text-surface-500">No results found for &quot;{query}&quot;</p>
        </div>
      ) : (
        <div className="divide-y divide-surface-100 dark:divide-surface-800">
          {users.map((user) => (
            <div key={user.id} className="flex items-center gap-3 p-4">
              <Link href={`/profile/${user.username}`}>
                <Avatar src={user.avatarUrl} alt={user.displayName} size="md" />
              </Link>
              <div className="min-w-0 flex-1">
                <Link href={`/profile/${user.username}`} className="text-sm font-semibold text-surface-900 hover:underline dark:text-surface-50">
                  {user.displayName}
                </Link>
                <p className="text-xs text-surface-500">@{user.username}</p>
                {user.bio && <p className="mt-0.5 truncate text-xs text-surface-600 dark:text-surface-400">{user.bio}</p>}
              </div>
              <Button variant={user.isFollowing ? "secondary" : "primary"} size="sm">
                {user.isFollowing ? "Following" : "Follow"}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

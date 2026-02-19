"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import api from "@/lib/api";

export interface Post {
  id: string;
  content: string;
  mediaUrls: string[];
  author: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    isVerified: boolean;
  };
  dogId: string | null;
  dog?: {
    id: string;
    name: string;
    username: string;
    breed: string;
    avatarUrl: string | null;
  };
  aiAssisted: boolean;
  aiModelUsed: string | null;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  isLiked: boolean;
  isBookmarked: boolean;
  visibility: "PUBLIC" | "FOLLOWERS_ONLY";
  isEdited: boolean;
  createdAt: string;
  updatedAt: string;
}

interface UseFeedOptions {
  endpoint?: string;
  pageSize?: number;
}

export function useFeed({ endpoint = "/posts/feed", pageSize = 20 }: UseFeedOptions = {}) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cursorRef = useRef<string | null>(null);
  const likingRef = useRef<Set<string>>(new Set());

  const fetchPosts = useCallback(async (reset = false) => {
    try {
      if (reset) {
        setIsLoading(true);
        cursorRef.current = null;
      } else {
        setIsLoadingMore(true);
      }

      const params: Record<string, string> = { limit: pageSize.toString() };
      if (cursorRef.current && !reset) {
        params.cursor = cursorRef.current;
      }

      const { data } = await api.get(endpoint, { params });

      const posts = data.data ?? data.posts ?? [];
      if (reset) {
        setPosts(posts);
      } else {
        setPosts((prev) => [...prev, ...posts]);
      }

      cursorRef.current = data.nextCursor ?? null;
      setHasMore(data.hasMore ?? !!data.nextCursor);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load feed");
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [endpoint, pageSize]);

  useEffect(() => {
    fetchPosts(true);
  }, [fetchPosts]);

  const loadMore = useCallback(() => {
    if (!isLoadingMore && hasMore) {
      fetchPosts(false);
    }
  }, [isLoadingMore, hasMore, fetchPosts]);

  const refresh = useCallback(() => {
    fetchPosts(true);
  }, [fetchPosts]);

  const toggleLike = useCallback(async (postId: string) => {
    if (likingRef.current.has(postId)) return;
    likingRef.current.add(postId);

    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, isLiked: !p.isLiked, likesCount: p.isLiked ? p.likesCount - 1 : p.likesCount + 1 }
          : p
      )
    );
    try {
      await api.post(`/posts/${postId}/like`);
    } catch {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, isLiked: !p.isLiked, likesCount: p.isLiked ? p.likesCount - 1 : p.likesCount + 1 }
            : p
        )
      );
    } finally {
      likingRef.current.delete(postId);
    }
  }, []);

  const addPost = useCallback((post: Post) => {
    setPosts((prev) => [post, ...prev]);
  }, []);

  return { posts, isLoading, isLoadingMore, hasMore, error, loadMore, refresh, toggleLike, addPost };
}

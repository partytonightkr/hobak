"use client";

import { useEffect, useRef, useCallback } from "react";
import { PostCard } from "./PostCard";
import { Spinner } from "@/components/ui/Spinner";
import { Post } from "@/hooks/useFeed";

interface FeedListProps {
  posts: Post[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onLike: (postId: string) => void;
}

export function FeedList({ posts, isLoading, isLoadingMore, hasMore, onLoadMore, onLike }: FeedListProps) {
  const observerTarget = useRef<HTMLDivElement>(null);

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
        onLoadMore();
      }
    },
    [hasMore, isLoadingMore, onLoadMore]
  );

  useEffect(() => {
    const target = observerTarget.current;
    if (!target) return;

    const observer = new IntersectionObserver(handleObserver, { threshold: 0.1 });
    observer.observe(target);
    return () => observer.disconnect();
  }, [handleObserver]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="h-8 w-8 text-primary-500" />
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="py-12 text-center">
        <svg className="mx-auto h-12 w-12 text-surface-300 dark:text-surface-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
        </svg>
        <p className="mt-3 text-sm text-surface-500">No posts yet. Follow some people to see their posts here.</p>
      </div>
    );
  }

  return (
    <div>
      {posts.map((post) => (
        <PostCard key={post.id} post={post} onLike={onLike} />
      ))}
      <div ref={observerTarget} className="h-4" />
      {isLoadingMore && (
        <div className="flex items-center justify-center py-4">
          <Spinner className="h-6 w-6 text-primary-500" />
        </div>
      )}
      {!hasMore && posts.length > 0 && (
        <p className="py-6 text-center text-sm text-surface-400">You&apos;re all caught up!</p>
      )}
    </div>
  );
}

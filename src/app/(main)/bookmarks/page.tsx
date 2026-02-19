"use client";

import { FeedList } from "@/components/feed/FeedList";
import { useFeed } from "@/hooks/useFeed";

export default function BookmarksPage() {
  const { posts, isLoading, isLoadingMore, hasMore, loadMore, toggleLike } = useFeed({
    endpoint: "/posts/bookmarks",
  });

  return (
    <div>
      <div className="sticky top-[57px] z-10 border-b border-surface-200 bg-white/80 px-4 py-3 backdrop-blur-md dark:border-surface-700 dark:bg-surface-900/80">
        <h1 className="text-lg font-bold text-surface-900 dark:text-surface-50">Bookmarks</h1>
      </div>

      {!isLoading && posts.length === 0 ? (
        <div className="py-12 text-center">
          <svg className="mx-auto h-12 w-12 text-surface-300 dark:text-surface-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
          <p className="mt-3 text-sm text-surface-500">No bookmarks yet</p>
          <p className="mt-1 text-xs text-surface-400">Posts you bookmark will appear here</p>
        </div>
      ) : (
        <FeedList
          posts={posts}
          isLoading={isLoading}
          isLoadingMore={isLoadingMore}
          hasMore={hasMore}
          onLoadMore={loadMore}
          onLike={toggleLike}
        />
      )}
    </div>
  );
}

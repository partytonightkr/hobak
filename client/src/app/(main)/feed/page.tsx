"use client";

import { PostComposer } from "@/components/feed/PostComposer";
import { FeedList } from "@/components/feed/FeedList";
import { useFeed } from "@/hooks/useFeed";
import { useDogStore } from "@/store/dogStore";

export default function FeedPage() {
  const { posts, isLoading, isLoadingMore, hasMore, loadMore, toggleLike, addPost } = useFeed();
  const activeDog = useDogStore((s) => s.activeDog);

  return (
    <div>
      <div className="sticky top-[57px] z-10 border-b border-surface-200 bg-white/80 px-4 py-3 backdrop-blur-md dark:border-surface-700 dark:bg-surface-900/80">
        <h1 className="text-lg font-bold text-surface-900 dark:text-surface-50">
          {activeDog ? `${activeDog.name}'s Feed` : "Feed"}
        </h1>
      </div>

      <PostComposer onPost={addPost} />

      <FeedList
        posts={posts}
        isLoading={isLoading}
        isLoadingMore={isLoadingMore}
        hasMore={hasMore}
        onLoadMore={loadMore}
        onLike={toggleLike}
      />
    </div>
  );
}

"use client";

import { useState, useEffect, use } from "react";
import { DogProfileHeader } from "@/components/dog/DogProfileHeader";
import { DogProfileTabs } from "@/components/dog/DogProfileTabs";
import { FeedList } from "@/components/feed/FeedList";
import { Spinner } from "@/components/ui/Spinner";
import { useFeed } from "@/hooks/useFeed";
import { Dog } from "@/store/dogStore";
import api from "@/lib/api";

interface DogProfileData extends Dog {
  isFollowing: boolean;
  isOwnDog: boolean;
}

export default function DogProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);
  const [dog, setDog] = useState<DogProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("posts");

  useEffect(() => {
    async function fetchDog() {
      try {
        const { data } = await api.get(`/dogs/${username}`);
        setDog({
          ...data,
          followersCount: data.followersCount ?? data._count?.followers ?? 0,
          followingCount: data.followingCount ?? data._count?.following ?? 0,
          postsCount: data.postsCount ?? data._count?.posts ?? 0,
          personalityTraits: data.personalityTraits ?? [],
        });
      } finally {
        setIsLoading(false);
      }
    }
    fetchDog();
  }, [username]);

  const feed = useFeed({ endpoint: dog ? `/posts/dog/${dog.id}` : `/posts/dog/none` });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="h-8 w-8 text-primary-500" />
      </div>
    );
  }

  if (!dog) {
    return (
      <div className="py-12 text-center">
        <h2 className="text-xl font-semibold text-surface-900 dark:text-surface-50">Dog not found</h2>
        <p className="mt-2 text-sm text-surface-500">The dog @{username} doesn&apos;t exist.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="sticky top-[57px] z-10 border-b border-surface-200 bg-white/80 px-4 py-3 backdrop-blur-md dark:border-surface-700 dark:bg-surface-900/80">
        <h1 className="text-lg font-bold text-surface-900 dark:text-surface-50">{dog.name}</h1>
        <p className="text-xs text-surface-500">{dog.postsCount} posts</p>
      </div>

      <DogProfileHeader dog={dog} />

      <div className="mt-4">
        <DogProfileTabs activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {activeTab === "posts" && (
        <FeedList
          posts={feed.posts}
          isLoading={feed.isLoading}
          isLoadingMore={feed.isLoadingMore}
          hasMore={feed.hasMore}
          onLoadMore={feed.loadMore}
          onLike={feed.toggleLike}
        />
      )}

      {activeTab === "media" && (
        <p className="py-8 text-center text-sm text-surface-500">Media posts will appear here</p>
      )}

      {activeTab === "likes" && (
        <p className="py-8 text-center text-sm text-surface-500">Liked posts will appear here</p>
      )}
    </div>
  );
}

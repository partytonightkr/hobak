"use client";

import { useState, useEffect } from "react";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfileTabs } from "@/components/profile/ProfileTabs";
import { FollowersList } from "@/components/profile/FollowersList";
import { FeedList } from "@/components/feed/FeedList";
import { Spinner } from "@/components/ui/Spinner";
import { useFeed, Post } from "@/hooks/useFeed";
import { User } from "@/store/authStore";
import api from "@/lib/api";

interface ProfileData extends User {
  isFollowing: boolean;
  isFollowedBy: boolean;
}

export default function ProfilePage({ params }: { params: { username: string } }) {
  const { username } = params;
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("posts");

  useEffect(() => {
    async function fetchProfile() {
      try {
        const { data } = await api.get(`/users/${username}`);
        // Backend returns nested profile and _count for posts - flatten to match User type
        setProfile({
          ...data,
          coverUrl: data.profile?.coverImageUrl ?? null,
          website: data.profile?.website ?? null,
          location: data.profile?.location ?? null,
          followersCount: data.followerCount ?? 0,
          followingCount: data.followingCount ?? 0,
          postsCount: data._count?.posts ?? 0,
        });
      } finally {
        setIsLoading(false);
      }
    }
    fetchProfile();
  }, [username]);

  const feed = useFeed({ endpoint: profile ? `/posts/user/${profile.id}` : `/posts/user/none` });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="h-8 w-8 text-primary-500" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="py-12 text-center">
        <h2 className="text-xl font-semibold text-surface-900 dark:text-surface-50">User not found</h2>
        <p className="mt-2 text-sm text-surface-500">The user @{username} doesn&apos;t exist.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="sticky top-[57px] z-10 border-b border-surface-200 bg-white/80 px-4 py-3 backdrop-blur-md dark:border-surface-700 dark:bg-surface-900/80">
        <h1 className="text-lg font-bold text-surface-900 dark:text-surface-50">{profile.displayName}</h1>
        <p className="text-xs text-surface-500">{profile.postsCount} posts</p>
      </div>

      <ProfileHeader profile={profile} />

      <div className="mt-4">
        <ProfileTabs activeTab={activeTab} onTabChange={setActiveTab} />
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

      {activeTab === "followers" && <FollowersList username={username} type="followers" />}
      {activeTab === "following" && <FollowersList username={username} type="following" />}

      {activeTab === "replies" && (
        <p className="py-8 text-center text-sm text-surface-500">Replies will appear here</p>
      )}

      {activeTab === "likes" && (
        <p className="py-8 text-center text-sm text-surface-500">Liked posts will appear here</p>
      )}

      {activeTab === "media" && (
        <p className="py-8 text-center text-sm text-surface-500">Media posts will appear here</p>
      )}
    </div>
  );
}

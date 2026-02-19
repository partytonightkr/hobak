"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatCount } from "@/lib/utils";
import { useAuthStore, User } from "@/store/authStore";
import api from "@/lib/api";

interface ProfileHeaderProps {
  profile: User & { isFollowing: boolean; isFollowedBy: boolean };
}

export function ProfileHeader({ profile }: ProfileHeaderProps) {
  const currentUser = useAuthStore((s) => s.user);
  const isOwner = currentUser?.id === profile.id;
  const [isFollowing, setIsFollowing] = useState(profile.isFollowing);
  const [followersCount, setFollowersCount] = useState(profile.followersCount);
  const [isLoadingFollow, setIsLoadingFollow] = useState(false);

  const handleFollow = async () => {
    setIsLoadingFollow(true);
    const wasFollowing = isFollowing;
    setIsFollowing(!wasFollowing);
    setFollowersCount((c) => (wasFollowing ? c - 1 : c + 1));

    try {
      if (wasFollowing) {
        await api.delete(`/users/${profile.id}/follow`);
      } else {
        await api.post(`/users/${profile.id}/follow`);
      }
    } catch {
      setIsFollowing(wasFollowing);
      setFollowersCount((c) => (wasFollowing ? c + 1 : c - 1));
    } finally {
      setIsLoadingFollow(false);
    }
  };

  return (
    <div>
      <div className="relative h-32 bg-gradient-to-r from-primary-500 to-accent-500 sm:h-48">
        {profile.coverUrl && (
          <Image src={profile.coverUrl} alt="" fill className="object-cover" />
        )}
      </div>

      <div className="px-4">
        <div className="flex items-end justify-between -mt-12 sm:-mt-16">
          <Avatar
            src={profile.avatarUrl}
            alt={profile.displayName}
            size="xl"
            className="border-4 border-white dark:border-surface-900 !h-24 !w-24 sm:!h-32 sm:!w-32"
          />

          <div className="flex gap-2 pb-2">
            {isOwner ? (
              <Link href="/settings">
                <Button variant="secondary" size="sm">Edit profile</Button>
              </Link>
            ) : (
              <>
                <Button
                  variant={isFollowing ? "secondary" : "primary"}
                  size="sm"
                  onClick={handleFollow}
                  isLoading={isLoadingFollow}
                >
                  {isFollowing ? "Following" : profile.isFollowedBy ? "Follow back" : "Follow"}
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="mt-3">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-surface-900 dark:text-surface-50">{profile.displayName}</h1>
            {profile.isVerified && (
              <svg className="h-5 w-5 text-primary-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            {profile.isPremium && <Badge variant="primary">Premium</Badge>}
          </div>
          <p className="text-sm text-surface-500">@{profile.username}</p>
        </div>

        {profile.bio && (
          <p className="mt-2 text-sm text-surface-700 dark:text-surface-300">{profile.bio}</p>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-surface-500">
          {profile.location && (
            <span className="flex items-center gap-1">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {profile.location}
            </span>
          )}
          {profile.website && (
            <a
              href={profile.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-primary-500 hover:underline"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              {profile.website.replace(/^https?:\/\//, "")}
            </a>
          )}
          <span className="flex items-center gap-1">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Joined {new Date(profile.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </span>
        </div>

        <div className="mt-3 flex gap-4 text-sm">
          <Link href={`/profile/${profile.username}?tab=following`} className="text-surface-600 hover:underline dark:text-surface-400">
            <span className="font-semibold text-surface-900 dark:text-surface-50">{formatCount(profile.followingCount)}</span> Following
          </Link>
          <Link href={`/profile/${profile.username}?tab=followers`} className="text-surface-600 hover:underline dark:text-surface-400">
            <span className="font-semibold text-surface-900 dark:text-surface-50">{formatCount(followersCount)}</span> Followers
          </Link>
        </div>
      </div>
    </div>
  );
}

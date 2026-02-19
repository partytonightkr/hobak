"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatCount } from "@/lib/utils";
import { Dog } from "@/store/dogStore";
import api from "@/lib/api";

interface DogProfileData extends Dog {
  isFollowing: boolean;
  isOwnDog: boolean;
}

interface DogProfileHeaderProps {
  dog: DogProfileData;
}

const sizeLabels: Record<Dog["size"], string> = {
  SMALL: "Small",
  MEDIUM: "Medium",
  LARGE: "Large",
  EXTRA_LARGE: "Extra Large",
};

const traitColors: Record<number, "primary" | "success" | "warning" | "danger" | "default"> = {
  0: "primary",
  1: "success",
  2: "warning",
  3: "danger",
  4: "default",
};

function calculateAge(dateOfBirth: string | null): string | null {
  if (!dateOfBirth) return null;
  const birth = new Date(dateOfBirth);
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    years--;
  }
  if (years < 1) {
    const months = (now.getFullYear() - birth.getFullYear()) * 12 + now.getMonth() - birth.getMonth();
    return months <= 1 ? "1 month old" : `${months} months old`;
  }
  return years === 1 ? "1 year old" : `${years} years old`;
}

export function DogProfileHeader({ dog }: DogProfileHeaderProps) {
  const [isFollowing, setIsFollowing] = useState(dog.isFollowing);
  const [followersCount, setFollowersCount] = useState(dog.followersCount);
  const [isLoadingFollow, setIsLoadingFollow] = useState(false);

  const age = calculateAge(dog.dateOfBirth);

  const handleFollow = async () => {
    setIsLoadingFollow(true);
    const wasFollowing = isFollowing;
    setIsFollowing(!wasFollowing);
    setFollowersCount((c) => (wasFollowing ? c - 1 : c + 1));

    try {
      if (wasFollowing) {
        await api.delete(`/dogs/${dog.id}/follow`);
      } else {
        await api.post(`/dogs/${dog.id}/follow`);
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
      {/* Cover photo */}
      <div className="relative h-32 bg-gradient-to-r from-amber-400 to-orange-500 sm:h-48">
        {dog.coverUrl && (
          <Image src={dog.coverUrl} alt="" fill className="object-cover" />
        )}
      </div>

      <div className="px-4">
        {/* Avatar + actions */}
        <div className="flex items-end justify-between -mt-12 sm:-mt-16">
          <Avatar
            src={dog.avatarUrl}
            alt={dog.name}
            size="xl"
            className="border-4 border-white dark:border-surface-900 !h-24 !w-24 sm:!h-32 sm:!w-32"
          />

          <div className="flex gap-2 pb-2">
            {dog.isOwnDog ? (
              <Link href={`/dog/${dog.username}/edit`}>
                <Button variant="secondary" size="sm">Edit profile</Button>
              </Link>
            ) : (
              <Button
                variant={isFollowing ? "secondary" : "primary"}
                size="sm"
                onClick={handleFollow}
                isLoading={isLoadingFollow}
              >
                {isFollowing ? "Following" : "Follow"}
              </Button>
            )}
          </div>
        </div>

        {/* Name, username, breed, age, size */}
        <div className="mt-3">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-surface-900 dark:text-surface-50">{dog.name}</h1>
            {dog.isVerified && (
              <svg className="h-5 w-5 text-primary-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <Badge variant="default">{sizeLabels[dog.size]}</Badge>
          </div>
          <p className="text-sm text-surface-500">@{dog.username}</p>

          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-surface-600 dark:text-surface-400">
            {dog.breed && (
              <span className="flex items-center gap-1">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                {dog.breed}
              </span>
            )}
            {age && (
              <span className="flex items-center gap-1">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {age}
              </span>
            )}
          </div>
        </div>

        {/* Bio */}
        {dog.bio && (
          <p className="mt-2 text-sm text-surface-700 dark:text-surface-300">{dog.bio}</p>
        )}

        {/* Personality traits */}
        {dog.personalityTraits && dog.personalityTraits.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {dog.personalityTraits.map((trait, index) => (
              <Badge key={trait} variant={traitColors[index % 5]}>
                {trait}
              </Badge>
            ))}
          </div>
        )}

        {/* Temperament notes */}
        {dog.temperamentNotes && (
          <p className="mt-2 text-xs text-surface-500 italic">{dog.temperamentNotes}</p>
        )}

        {/* Stats */}
        <div className="mt-3 flex gap-4 text-sm">
          <span className="text-surface-600 dark:text-surface-400">
            <span className="font-semibold text-surface-900 dark:text-surface-50">{formatCount(dog.followingCount)}</span> Following
          </span>
          <span className="text-surface-600 dark:text-surface-400">
            <span className="font-semibold text-surface-900 dark:text-surface-50">{formatCount(followersCount)}</span> Followers
          </span>
          <span className="text-surface-600 dark:text-surface-400">
            <span className="font-semibold text-surface-900 dark:text-surface-50">{formatCount(dog.postsCount)}</span> Posts
          </span>
        </div>

        {/* Joined date */}
        <div className="mt-2 text-sm text-surface-500">
          <span className="flex items-center gap-1">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Joined {new Date(dog.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </span>
        </div>
      </div>
    </div>
  );
}

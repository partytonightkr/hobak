"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { useDogStore } from "@/store/dogStore";

const sizeLabels: Record<string, string> = {
  SMALL: "Small",
  MEDIUM: "Medium",
  LARGE: "Large",
  EXTRA_LARGE: "Extra Large",
};

export default function MyDogsPage() {
  const { dogs, activeDog, setActiveDog, isLoading, fetchDogs } = useDogStore();

  useEffect(() => {
    fetchDogs();
  }, [fetchDogs]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="h-8 w-8 text-primary-500" />
      </div>
    );
  }

  return (
    <div>
      <div className="sticky top-[57px] z-10 border-b border-surface-200 bg-white/80 px-4 py-3 backdrop-blur-md dark:border-surface-700 dark:bg-surface-900/80">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-surface-900 dark:text-surface-50">My Dogs</h1>
          <Link href="/onboarding">
            <Button variant="primary" size="sm">
              <svg className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Dog
            </Button>
          </Link>
        </div>
      </div>

      {dogs.length === 0 ? (
        <div className="py-12 text-center">
          <svg className="mx-auto h-12 w-12 text-surface-300 dark:text-surface-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          <p className="mt-3 text-sm text-surface-500">You haven&apos;t added any dogs yet.</p>
          <Link href="/onboarding" className="mt-4 inline-block">
            <Button variant="primary" size="sm">Add your first dog</Button>
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-surface-200 dark:divide-surface-700">
          {dogs.map((dog) => (
            <div
              key={dog.id}
              className="flex items-center gap-4 px-4 py-4 transition-colors hover:bg-surface-50 dark:hover:bg-surface-800/50"
            >
              <Link href={`/dog/${dog.username}`}>
                <Avatar src={dog.avatarUrl} alt={dog.name} size="lg" />
              </Link>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/dog/${dog.username}`}
                    className="truncate text-base font-semibold text-surface-900 hover:underline dark:text-surface-50"
                  >
                    {dog.name}
                  </Link>
                  {activeDog?.id === dog.id && (
                    <Badge variant="primary">Active</Badge>
                  )}
                </div>
                <p className="text-sm text-surface-500">@{dog.username}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-surface-500">
                  {dog.breed && <span>{dog.breed}</span>}
                  {dog.breed && dog.size && <span>&middot;</span>}
                  {dog.size && <span>{sizeLabels[dog.size]}</span>}
                </div>
              </div>

              <div className="flex shrink-0 gap-2">
                {activeDog?.id !== dog.id && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setActiveDog(dog)}
                  >
                    Set Active
                  </Button>
                )}
                <Link href={`/dog/${dog.username}`}>
                  <Button variant="ghost" size="sm">View</Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

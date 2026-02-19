"use client";

import { cn } from "@/lib/utils";

interface DogProfileTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: "posts", label: "Posts" },
  { id: "media", label: "Media" },
  { id: "likes", label: "Likes" },
];

export function DogProfileTabs({ activeTab, onTabChange }: DogProfileTabsProps) {
  return (
    <div className="flex border-b border-surface-200 dark:border-surface-700">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "flex-1 py-3 text-center text-sm font-medium transition-colors",
            activeTab === tab.id
              ? "border-b-2 border-primary-500 text-primary-600 dark:text-primary-400"
              : "text-surface-500 hover:bg-surface-50 hover:text-surface-700 dark:hover:bg-surface-800"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

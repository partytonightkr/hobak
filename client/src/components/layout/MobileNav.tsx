"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/uiStore";
import { useAuthStore } from "@/store/authStore";
import { Avatar } from "@/components/ui/Avatar";

export function MobileNav() {
  const pathname = usePathname();
  const { isMobileNavOpen, setMobileNavOpen } = useUIStore();
  const user = useAuthStore((s) => s.user);

  if (!isMobileNavOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50 lg:hidden" onClick={() => setMobileNavOpen(false)} />
      <div className="fixed inset-y-0 left-0 z-50 w-72 border-r border-surface-200 bg-white p-4 dark:border-surface-700 dark:bg-surface-900 lg:hidden">
        {user && (
          <div className="mb-6 border-b border-surface-200 pb-4 dark:border-surface-700">
            <Avatar src={user.avatarUrl} alt={user.displayName} size="lg" />
            <p className="mt-3 font-semibold text-surface-900 dark:text-surface-50">{user.displayName}</p>
            <p className="text-sm text-surface-500">@{user.username}</p>
            <div className="mt-2 flex gap-4 text-sm">
              <span className="text-surface-600 dark:text-surface-400">
                <span className="font-semibold text-surface-900 dark:text-surface-50">{user.followingCount}</span> Following
              </span>
              <span className="text-surface-600 dark:text-surface-400">
                <span className="font-semibold text-surface-900 dark:text-surface-50">{user.followersCount}</span> Followers
              </span>
            </div>
          </div>
        )}

        <nav className="space-y-1">
          {[
            { label: "Feed", href: "/feed" },
            { label: "Search", href: "/search" },

            { label: "Bookmarks", href: "/bookmarks" },
            { label: "Notifications", href: "/notifications" },
            { label: "Profile", href: user ? `/profile/${user.username}` : "/feed" },
            { label: "Settings", href: "/settings" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileNavOpen(false)}
              className={cn(
                "block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                pathname.startsWith(item.href)
                  ? "bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"
                  : "text-surface-600 hover:bg-surface-100 dark:text-surface-400 dark:hover:bg-surface-800"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}

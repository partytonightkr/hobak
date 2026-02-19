"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { Dropdown, DropdownItem } from "@/components/ui/Dropdown";
import { useAuthStore } from "@/store/authStore";
import { useUIStore } from "@/store/uiStore";
import { useDogStore } from "@/store/dogStore";
import { NotificationBell } from "./NotificationBell";

export function Navbar() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { toggleMobileNav, setTheme, theme } = useUIStore();
  const { dogs, activeDog, setActiveDog, fetchDogs } = useDogStore();

  useEffect(() => {
    if (user) {
      fetchDogs();
    }
  }, [user, fetchDogs]);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-surface-200 bg-white/80 backdrop-blur-md dark:border-surface-700 dark:bg-surface-900/80">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button onClick={toggleMobileNav} className="rounded-lg p-1.5 text-surface-500 hover:bg-surface-100 lg:hidden dark:hover:bg-surface-800">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <Link href="/feed" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600">
              <span className="text-sm font-bold text-white">C</span>
            </div>
            <span className="hidden text-lg font-bold text-surface-900 sm:block dark:text-surface-50">Commune</span>
          </Link>
        </div>

        <div className="flex-1 max-w-md mx-4 hidden md:block">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search Commune..."
              className="w-full rounded-full border border-surface-200 bg-surface-50 py-2 pl-10 pr-4 text-sm text-surface-900 placeholder:text-surface-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-100"
              onFocus={() => router.push("/search")}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/search"
            className="rounded-lg p-2 text-surface-500 hover:bg-surface-100 md:hidden dark:hover:bg-surface-800"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </Link>

          <NotificationBell />

          {/* Dog switcher dropdown */}
          {user && dogs.length > 0 && (
            <Dropdown
              trigger={
                <button className="flex items-center gap-1.5 rounded-lg p-1 hover:bg-surface-100 dark:hover:bg-surface-800">
                  <Avatar
                    src={activeDog?.avatarUrl ?? null}
                    alt={activeDog?.name ?? "Dog"}
                    size="sm"
                  />
                  <svg className="h-3.5 w-3.5 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              }
            >
              <div className="border-b border-surface-100 px-3 py-2 dark:border-surface-700">
                <p className="text-xs font-medium uppercase tracking-wider text-surface-400">Switch Dog</p>
              </div>
              {dogs.map((dog) => (
                <DropdownItem
                  key={dog.id}
                  onClick={() => setActiveDog(dog)}
                  className={activeDog?.id === dog.id ? "bg-primary-50 dark:bg-primary-900/20" : ""}
                >
                  <div className="flex items-center gap-2">
                    <Avatar src={dog.avatarUrl} alt={dog.name} size="xs" />
                    <div className="text-left">
                      <p className="text-sm font-medium">{dog.name}</p>
                      <p className="text-xs text-surface-400">@{dog.username}</p>
                    </div>
                    {activeDog?.id === dog.id && (
                      <svg className="ml-auto h-4 w-4 text-primary-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </div>
                </DropdownItem>
              ))}
              <div className="border-t border-surface-100 dark:border-surface-700">
                <DropdownItem onClick={() => router.push("/onboarding")}>
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="text-primary-600 dark:text-primary-400">Add new dog</span>
                  </div>
                </DropdownItem>
              </div>
            </Dropdown>
          )}

          {/* User profile dropdown */}
          {user && (
            <Dropdown
              trigger={
                <button className="flex items-center gap-2 rounded-lg p-1 hover:bg-surface-100 dark:hover:bg-surface-800">
                  <Avatar src={user.avatarUrl} alt={user.displayName} size="sm" />
                </button>
              }
            >
              <div className="border-b border-surface-100 px-3 py-2 dark:border-surface-700">
                <p className="text-sm font-medium text-surface-900 dark:text-surface-100">{user.displayName}</p>
                <p className="text-xs text-surface-500">@{user.username}</p>
              </div>
              <DropdownItem onClick={() => router.push(`/profile/${user.username}`)}>Profile</DropdownItem>
              <DropdownItem onClick={() => router.push("/settings")}>Settings</DropdownItem>
              <DropdownItem
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                {theme === "dark" ? "Light mode" : "Dark mode"}
              </DropdownItem>
              <DropdownItem onClick={handleLogout} danger>Log out</DropdownItem>
            </Dropdown>
          )}
        </div>
      </div>
    </header>
  );
}

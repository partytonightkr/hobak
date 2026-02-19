"use client";

import { useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { useAuthStore } from "@/store/authStore";
import { useDogStore } from "@/store/dogStore";
import { SuggestedUsers } from "@/components/layout/SuggestedUsers";
import { Spinner } from "@/components/ui/Spinner";
import { useRouter, usePathname } from "next/navigation";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoading, isAuthenticated, fetchUser } = useAuthStore();
  const { dogs, isLoading: dogsLoading, fetchDogs } = useDogStore();

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Fetch dogs once authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchDogs();
    }
  }, [isAuthenticated, fetchDogs]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  // Redirect to onboarding if authenticated but no dogs (skip if already on onboarding)
  useEffect(() => {
    if (
      isAuthenticated &&
      !dogsLoading &&
      dogs.length === 0 &&
      pathname !== "/onboarding"
    ) {
      router.push("/onboarding");
    }
  }, [isAuthenticated, dogsLoading, dogs.length, pathname, router]);

  if (isLoading || (isAuthenticated && dogsLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="h-10 w-10 text-primary-500" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <MobileNav />
      <div className="mx-auto flex max-w-7xl">
        <Sidebar />
        <main className="min-w-0 flex-1 border-x border-surface-200 dark:border-surface-700">
          {children}
        </main>
        <aside className="hidden w-80 shrink-0 xl:block">
          <div className="sticky top-[57px] p-4">
            <SuggestedUsers />
          </div>
        </aside>
      </div>
    </div>
  );
}

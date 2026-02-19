"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";

export function useAuth({ redirectTo, redirectIfAuthenticated }: { redirectTo?: string; redirectIfAuthenticated?: string } = {}) {
  const router = useRouter();
  const { user, isLoading, isAuthenticated, fetchUser, login, register, logout } = useAuthStore();

  useEffect(() => {
    if (isLoading) {
      fetchUser();
    }
  }, [isLoading, fetchUser]);

  useEffect(() => {
    if (isLoading) return;

    if (redirectTo && !isAuthenticated) {
      router.push(redirectTo);
    }

    if (redirectIfAuthenticated && isAuthenticated) {
      router.push(redirectIfAuthenticated);
    }
  }, [isLoading, isAuthenticated, redirectTo, redirectIfAuthenticated, router]);

  return { user, isLoading, isAuthenticated, login, register, logout };
}

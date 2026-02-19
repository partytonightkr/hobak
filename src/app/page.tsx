"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LandingPage() {
  const router = useRouter();
  const { login } = useAuth({ redirectIfAuthenticated: "/feed" });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    setError("");
    try {
      await login(data.email, data.password);
      router.push("/feed");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Login failed. Please try again.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-100 dark:bg-surface-950">
      {/* Main hero section — Facebook-style two-column */}
      <div className="flex min-h-[calc(100vh-72px)] items-center justify-center px-4 py-12">
        <div className="mx-auto flex w-full max-w-[980px] flex-col items-center gap-8 lg:flex-row lg:items-center lg:gap-12">

          {/* Left — Branding & tagline */}
          <div className="flex-1 text-center lg:text-left lg:pr-8">
            <div className="flex items-center justify-center gap-3 lg:justify-start">
              {/* Paw logo mark */}
              <div className="relative h-14 w-14">
                <div className="absolute bottom-0 left-1/2 h-[38px] w-[44px] -translate-x-1/2 rounded-[22px_22px_20px_20px] bg-primary-600" />
                <div className="absolute left-[6px] top-0 h-[14px] w-[14px] rounded-full bg-primary-500" />
                <div className="absolute right-[6px] top-0 h-[14px] w-[14px] rounded-full bg-primary-500" />
                <div className="absolute left-0 top-[8px] h-[11px] w-[11px] rounded-full bg-primary-400" />
                <div className="absolute right-0 top-[8px] h-[11px] w-[11px] rounded-full bg-primary-400" />
              </div>
              <h1 className="text-5xl font-extrabold tracking-tight text-primary-600 lg:text-6xl">
                Hobak
              </h1>
            </div>
            <p className="mx-auto mt-4 max-w-md text-xl leading-relaxed text-surface-600 lg:mx-0 lg:text-2xl dark:text-surface-400">
              Connect with dogs and their humans on Hobak.
            </p>
          </div>

          {/* Right — Login card */}
          <div className="w-full max-w-[400px]">
            <div className="rounded-lg bg-white p-5 shadow-[0_2px_4px_rgba(0,0,0,0.1),0_8px_16px_rgba(0,0,0,0.1)] dark:bg-surface-900 dark:shadow-[0_2px_4px_rgba(0,0,0,0.3),0_8px_16px_rgba(0,0,0,0.3)]">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
                {error && (
                  <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                    {error}
                  </div>
                )}

                <div>
                  <input
                    type="email"
                    placeholder="Email address"
                    className="block w-full rounded-md border border-surface-300 bg-white px-4 py-[14px] text-[15px] text-surface-900 placeholder:text-surface-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-100"
                    {...register("email")}
                  />
                  {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
                </div>

                <div>
                  <input
                    type="password"
                    placeholder="Password"
                    className="block w-full rounded-md border border-surface-300 bg-white px-4 py-[14px] text-[15px] text-surface-900 placeholder:text-surface-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-100"
                    {...register("password")}
                  />
                  {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
                </div>

                <Button type="submit" className="!w-full !rounded-md !py-3 !text-lg !font-semibold" isLoading={isLoading}>
                  Log In
                </Button>

                <div className="text-center">
                  <Link href="/forgot-password" className="text-sm text-primary-600 hover:underline dark:text-primary-400">
                    Forgot password?
                  </Link>
                </div>

                {/* Divider */}
                <div className="!my-5 border-t border-surface-200 dark:border-surface-700" />

                {/* Create account CTA */}
                <div className="text-center">
                  <Link href="/register">
                    <Button
                      type="button"
                      className="!rounded-md !bg-green-500 !px-6 !py-3 !text-[15px] !font-semibold !text-white hover:!bg-green-600 focus:!ring-green-500"
                    >
                      Create new account
                    </Button>
                  </Link>
                </div>
              </form>
            </div>

            <p className="mt-5 text-center text-sm text-surface-500">
              <Link href="/register" className="font-semibold hover:underline">Create a Page</Link> for your dog, vet clinic, or dog park.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-surface-200 bg-white py-6 dark:border-surface-700 dark:bg-surface-900">
        <div className="mx-auto max-w-[980px] px-4">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-surface-500">
            <span>English (US)</span>
            <Link href="#" className="hover:underline">About</Link>
            <Link href="#" className="hover:underline">Help</Link>
            <Link href="#" className="hover:underline">Terms</Link>
            <Link href="#" className="hover:underline">Privacy</Link>
            <Link href="#" className="hover:underline">Cookies</Link>
            <Link href="#" className="hover:underline">Developers</Link>
          </div>
          <p className="mt-3 text-center text-xs text-surface-400">Hobak &copy; 2026</p>
        </div>
      </footer>
    </div>
  );
}

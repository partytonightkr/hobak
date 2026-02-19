"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";

const registerSchema = z.object({
  displayName: z.string().min(1, "Display name is required").max(50, "Max 50 characters"),
  username: z
    .string()
    .min(3, "At least 3 characters")
    .max(30, "Max 30 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers, and underscores"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser } = useAuth({ redirectIfAuthenticated: "/feed" });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterForm) => {
    setIsLoading(true);
    setError("");
    try {
      await registerUser({
        email: data.email,
        password: data.password,
        username: data.username,
        displayName: data.displayName,
      });
      router.push("/onboarding");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Registration failed. Please try again.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-100 px-4 py-8 dark:bg-surface-950">
      <div className="w-full max-w-[440px]">
        {/* Card header */}
        <div className="rounded-t-lg border-b border-surface-200 bg-white px-5 pt-5 pb-3 shadow-[0_2px_4px_rgba(0,0,0,0.1),0_8px_16px_rgba(0,0,0,0.1)] dark:border-surface-700 dark:bg-surface-900 dark:shadow-[0_2px_4px_rgba(0,0,0,0.3),0_8px_16px_rgba(0,0,0,0.3)]">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-[28px] font-semibold leading-tight text-surface-900 dark:text-surface-50">Sign Up</h1>
              <p className="mt-1 text-sm text-surface-500">It&apos;s quick and easy.</p>
            </div>
            <Link href="/" className="rounded-full p-2 text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Card body */}
        <div className="rounded-b-lg bg-white px-5 py-4 shadow-[0_2px_4px_rgba(0,0,0,0.1),0_8px_16px_rgba(0,0,0,0.1)] dark:bg-surface-900 dark:shadow-[0_2px_4px_rgba(0,0,0,0.3),0_8px_16px_rgba(0,0,0,0.3)]">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </div>
            )}

            {/* Name row — side by side like Facebook */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <input
                  type="text"
                  placeholder="Display name"
                  className="block w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-[10px] text-[15px] text-surface-900 placeholder:text-surface-400 focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-100 dark:focus:bg-surface-800"
                  {...register("displayName")}
                />
                {errors.displayName && <p className="mt-1 text-xs text-red-500">{errors.displayName.message}</p>}
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Username"
                  className="block w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-[10px] text-[15px] text-surface-900 placeholder:text-surface-400 focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-100 dark:focus:bg-surface-800"
                  {...register("username")}
                />
                {errors.username && <p className="mt-1 text-xs text-red-500">{errors.username.message}</p>}
              </div>
            </div>

            <div>
              <input
                type="email"
                placeholder="Email address"
                className="block w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-[10px] text-[15px] text-surface-900 placeholder:text-surface-400 focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-100 dark:focus:bg-surface-800"
                {...register("email")}
              />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
            </div>

            <div>
              <input
                type="password"
                placeholder="New password"
                className="block w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-[10px] text-[15px] text-surface-900 placeholder:text-surface-400 focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-100 dark:focus:bg-surface-800"
                {...register("password")}
              />
              {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
            </div>

            <div>
              <input
                type="password"
                placeholder="Confirm password"
                className="block w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-[10px] text-[15px] text-surface-900 placeholder:text-surface-400 focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-100 dark:focus:bg-surface-800"
                {...register("confirmPassword")}
              />
              {errors.confirmPassword && <p className="mt-1 text-xs text-red-500">{errors.confirmPassword.message}</p>}
            </div>

            <p className="!mt-4 text-[11px] leading-relaxed text-surface-400">
              By clicking Sign Up, you agree to our{" "}
              <Link href="#" className="text-primary-600 hover:underline">Terms</Link>,{" "}
              <Link href="#" className="text-primary-600 hover:underline">Privacy Policy</Link> and{" "}
              <Link href="#" className="text-primary-600 hover:underline">Cookies Policy</Link>.
            </p>

            <div className="!mt-4 flex justify-center">
              <Button
                type="submit"
                className="!rounded-md !bg-green-500 !px-16 !py-2.5 !text-lg !font-semibold !text-white hover:!bg-green-600 focus:!ring-green-500"
                isLoading={isLoading}
              >
                Sign Up
              </Button>
            </div>
          </form>

          <p className="mt-5 text-center text-sm text-surface-500">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-primary-600 hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { type Locale, getLocale, t } from "@/lib/i18n";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth({ redirectIfAuthenticated: "/feed" });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [locale, setLocale] = useState<Locale>("en");

  useEffect(() => {
    setLocale(getLocale());
  }, []);

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
      const msg = err instanceof Error ? err.message : t("loginFailed", locale);
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-100 px-4 dark:bg-surface-950">
      <div className="w-full max-w-[400px]">
        <div className="mb-6 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="relative h-12 w-12">
              <div className="absolute bottom-0 left-1/2 h-[32px] w-[38px] -translate-x-1/2 rounded-[20px_20px_18px_18px] bg-primary-600" />
              <div className="absolute left-[5px] top-0 h-[12px] w-[12px] rounded-full bg-primary-500" />
              <div className="absolute right-[5px] top-0 h-[12px] w-[12px] rounded-full bg-primary-500" />
              <div className="absolute left-0 top-[7px] h-[9px] w-[9px] rounded-full bg-primary-400" />
              <div className="absolute right-0 top-[7px] h-[9px] w-[9px] rounded-full bg-primary-400" />
            </div>
            <span className="text-3xl font-extrabold text-primary-600">Hobak</span>
          </Link>
        </div>

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
                placeholder={t("emailPlaceholder", locale)}
                className="block w-full rounded-md border border-surface-300 bg-white px-4 py-[14px] text-[15px] text-surface-900 placeholder:text-surface-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-100"
                {...register("email")}
              />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
            </div>

            <div>
              <input
                type="password"
                placeholder={t("passwordPlaceholder", locale)}
                className="block w-full rounded-md border border-surface-300 bg-white px-4 py-[14px] text-[15px] text-surface-900 placeholder:text-surface-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-100"
                {...register("password")}
              />
              {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
            </div>

            <Button type="submit" className="!w-full !rounded-md !py-3 !text-lg !font-semibold" isLoading={isLoading}>
              {t("logIn", locale)}
            </Button>

            <div className="text-center">
              <Link href="/forgot-password" className="text-sm text-primary-600 hover:underline dark:text-primary-400">
                {t("forgotPassword", locale)}
              </Link>
            </div>

            <div className="!my-5 border-t border-surface-200 dark:border-surface-700" />

            <div className="text-center">
              <Link href="/register">
                <Button
                  type="button"
                  className="!rounded-md !bg-green-500 !px-6 !py-3 !text-[15px] !font-semibold !text-white hover:!bg-green-600 focus:!ring-green-500"
                >
                  {t("createNewAccount", locale)}
                </Button>
              </Link>
            </div>
          </form>
        </div>

        <p className="mt-5 text-center text-sm text-surface-500">
          <Link href="/register" className="font-semibold hover:underline">{t("createPage", locale)}</Link>
        </p>
      </div>
    </div>
  );
}

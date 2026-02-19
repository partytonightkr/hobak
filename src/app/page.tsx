"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { getLastUser } from "@/store/authStore";
import { Button } from "@/components/ui/Button";

export default function LandingPage() {
  useAuth({ redirectIfAuthenticated: "/feed" });
  const router = useRouter();
  const [lastUser, setLastUser] = useState<{ displayName: string; avatarUrl: string | null } | null>(null);
  const [mounted, setMounted] = useState(false);

  // Login form state (for new visitors)
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  useEffect(() => {
    setLastUser(getLastUser());
    setMounted(true);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      await login(email, password);
      router.push("/feed");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Login failed. Please try again.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const isReturningUser = mounted && lastUser !== null;

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-surface-950">
      {/* Main — full-height two-column split */}
      <div className="flex flex-1 flex-col lg:flex-row">

        {/* ─── Left: Photo collage + tagline ─── */}
        <div className="relative flex flex-1 flex-col justify-end overflow-hidden bg-surface-50 px-8 pb-14 pt-8 lg:px-16 dark:bg-surface-900">
          {/* Paw logo top-left */}
          <div className="mb-auto">
            <div className="relative h-12 w-12">
              <div className="absolute bottom-0 left-1/2 h-[32px] w-[38px] -translate-x-1/2 rounded-[20px_20px_18px_18px] bg-primary-600" />
              <div className="absolute left-[5px] top-0 h-[12px] w-[12px] rounded-full bg-primary-500" />
              <div className="absolute right-[5px] top-0 h-[12px] w-[12px] rounded-full bg-primary-500" />
              <div className="absolute left-0 top-[7px] h-[9px] w-[9px] rounded-full bg-primary-400" />
              <div className="absolute right-0 top-[7px] h-[9px] w-[9px] rounded-full bg-primary-400" />
            </div>
          </div>

          {/* ── Floating collage ── */}
          <div className="pointer-events-none absolute inset-0 bottom-[35%] hidden overflow-hidden lg:block">

            {/* Main phone card — large dog photo */}
            <div className="absolute right-[6%] top-[4%] h-[320px] w-[210px] rotate-2 rounded-3xl border border-surface-200/60 bg-white shadow-2xl dark:border-surface-700 dark:bg-surface-800">
              <div className="mx-auto mt-3 h-1.5 w-16 rounded-full bg-surface-200 dark:bg-surface-600" />
              <div className="relative mx-3 mt-3 h-[200px] overflow-hidden rounded-2xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/landing/dog1.jpg" alt="Happy golden retriever" className="h-full w-full object-cover" />
              </div>
              {/* Time badge */}
              <div className="absolute right-4 top-12 flex items-center gap-1 rounded-full bg-primary-600 px-2.5 py-1 text-[11px] font-medium text-white shadow-md">
                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm4.2 14.2L11 13V7h1.5v5.2l4.5 2.7-.8 1.3z" /></svg>
                16:45
              </div>
              <div className="mx-4 mt-3 flex items-center gap-2">
                <div className="h-7 w-7 overflow-hidden rounded-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/images/landing/dog3.jpg" alt="" className="h-full w-full object-cover" />
                </div>
                <div>
                  <div className="h-2.5 w-16 rounded bg-surface-200 dark:bg-surface-600" />
                  <div className="mt-1 h-2 w-12 rounded bg-surface-100 dark:bg-surface-700" />
                </div>
              </div>
              {/* Carousel dots */}
              <div className="mx-auto mt-2 flex items-center justify-center gap-2">
                <div className="h-2 w-7 rounded-full bg-surface-300" />
                <div className="h-2 w-2 rounded-full bg-surface-200" />
                <div className="h-2 w-2 rounded-full bg-surface-200" />
              </div>
            </div>

            {/* Small reel card — dog running */}
            <div className="absolute left-[15%] top-[12%] h-[180px] w-[140px] -rotate-6 overflow-hidden rounded-2xl shadow-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/landing/dog2.jpg" alt="Two dogs running on a beach" className="h-full w-full object-cover" />
              {/* Reel icon overlay */}
              <div className="absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg bg-primary-600/90 shadow">
                <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8 12.5v-9l6 4.5-6 4.5z" /></svg>
              </div>
            </div>

            {/* Paw emoji reaction */}
            <div className="absolute left-[32%] top-[5%] flex h-11 w-11 items-center justify-center rounded-full bg-amber-400 text-xl shadow-lg">
              🐾
            </div>

            {/* Heart reaction */}
            <div className="absolute right-[10%] top-[58%] flex h-11 w-11 items-center justify-center rounded-full bg-rose-400 shadow-lg">
              <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </div>

            {/* Post card with dog photo */}
            <div className="absolute left-[12%] top-[48%] w-[180px] -rotate-2 rounded-2xl border border-surface-200/60 bg-white p-3 shadow-xl dark:border-surface-700 dark:bg-surface-800">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 overflow-hidden rounded-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/images/landing/dog4.jpg" alt="" className="h-full w-full object-cover" />
                </div>
                <div className="h-2.5 w-16 rounded bg-surface-200 dark:bg-surface-600" />
              </div>
              <div className="mt-2 h-[70px] overflow-hidden rounded-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/landing/dog5.jpg" alt="Cute puppy" className="h-full w-full object-cover" />
              </div>
              <div className="mt-2 flex gap-2">
                <div className="h-4 w-10 rounded-full bg-surface-100 dark:bg-surface-700" />
                <div className="h-4 w-10 rounded-full bg-surface-100 dark:bg-surface-700" />
                <div className="h-4 w-10 rounded-full bg-surface-100 dark:bg-surface-700" />
              </div>
            </div>

            {/* Story circle — dog face */}
            <div className="absolute right-[32%] top-[55%]">
              <div className="rounded-full bg-gradient-to-tr from-primary-400 to-primary-600 p-[3px] shadow-xl">
                <div className="h-[80px] w-[80px] overflow-hidden rounded-full border-[3px] border-white dark:border-surface-900">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/images/landing/dog3.jpg" alt="Dog profile" className="h-full w-full object-cover" />
                </div>
              </div>
            </div>

            {/* Dog bone floating icon */}
            <div className="absolute left-[6%] top-[5%] flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-lg shadow-lg dark:bg-amber-900/40">
              🦴
            </div>

            {/* Woof! speech bubble */}
            <div className="absolute right-[30%] top-[10%] rounded-2xl rounded-bl-sm bg-white px-4 py-2 text-sm font-semibold text-surface-700 shadow-lg dark:bg-surface-800 dark:text-surface-200">
              Woof! 🐕
            </div>
          </div>

          {/* Tagline */}
          <h1 className="relative z-10 text-5xl font-extrabold leading-[1.1] tracking-tight text-surface-900 sm:text-6xl lg:text-7xl dark:text-surface-50">
            Where every<br />
            pup finds<br />
            <span className="text-primary-600">their pack</span>.
          </h1>
        </div>

        {/* ─── Right: Login panel ─── */}
        <div className="flex w-full flex-col items-center justify-center border-t border-surface-200 px-8 py-12 lg:w-[460px] lg:min-w-[460px] lg:border-l lg:border-t-0 dark:border-surface-700">

          {isReturningUser ? (
            /* ── Returning user: avatar + pill buttons ── */
            <>
              <div className="mb-auto self-end">
                <button className="rounded-full p-2 text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              </div>

              {/* User avatar */}
              <div className="mb-4 h-[140px] w-[140px] overflow-hidden rounded-full bg-gradient-to-br from-primary-100 to-primary-200 shadow dark:from-primary-900/40 dark:to-primary-800/40">
                {lastUser.avatarUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={lastUser.avatarUrl} alt={lastUser.displayName} className="h-full w-full object-cover" />
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src="/images/landing/dog4.jpg" alt="Dog avatar" className="h-full w-full object-cover" />
                )}
              </div>

              <h2 className="mb-8 text-2xl font-semibold text-surface-900 dark:text-surface-50">
                {lastUser.displayName}
              </h2>

              <div className="w-full max-w-[320px] space-y-3">
                <Link href="/login" className="block">
                  <button className="w-full rounded-full bg-primary-600 px-6 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-primary-700">
                    Log In
                  </button>
                </Link>

                <Link href="/login" className="block">
                  <button className="w-full rounded-full border border-surface-300 bg-white px-6 py-3 text-[15px] font-semibold text-surface-900 transition-colors hover:bg-surface-50 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-100 dark:hover:bg-surface-700">
                    Use another profile
                  </button>
                </Link>

                <div className="py-2" />

                <Link href="/register" className="block">
                  <button className="w-full rounded-full border border-primary-300 bg-white px-6 py-3 text-[15px] font-semibold text-primary-600 transition-colors hover:bg-primary-50 dark:border-primary-700 dark:bg-surface-800 dark:text-primary-400 dark:hover:bg-primary-900/20">
                    Create new account
                  </button>
                </Link>
              </div>

              {/* Bottom branding */}
              <div className="mt-auto flex items-center gap-1.5 pt-8 text-surface-400">
                <div className="relative h-5 w-5">
                  <div className="absolute bottom-0 left-1/2 h-[13px] w-[16px] -translate-x-1/2 rounded-[8px_8px_7px_7px] bg-surface-400" />
                  <div className="absolute left-[2px] top-0 h-[5px] w-[5px] rounded-full bg-surface-400" />
                  <div className="absolute right-[2px] top-0 h-[5px] w-[5px] rounded-full bg-surface-400" />
                  <div className="absolute left-0 top-[3px] h-[4px] w-[4px] rounded-full bg-surface-400" />
                  <div className="absolute right-0 top-[3px] h-[4px] w-[4px] rounded-full bg-surface-400" />
                </div>
                <span className="text-sm font-semibold tracking-wide">Hobak</span>
              </div>
            </>
          ) : (
            /* ── New visitor: login form ── */
            <>
              <div className="w-full max-w-[380px]">
                <h2 className="mb-8 text-2xl font-bold text-surface-900 dark:text-surface-50">
                  Log into Hobak
                </h2>

                <form onSubmit={handleLogin} className="space-y-3">
                  {error && (
                    <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                      {error}
                    </div>
                  )}

                  <input
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full rounded-xl border border-surface-300 bg-white px-4 py-[14px] text-[15px] text-surface-900 placeholder:text-surface-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-100"
                  />

                  <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full rounded-xl border border-surface-300 bg-white px-4 py-[14px] text-[15px] text-surface-900 placeholder:text-surface-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-100"
                  />

                  <Button
                    type="submit"
                    className="!w-full !rounded-full !py-3.5 !text-[15px] !font-semibold"
                    isLoading={isLoading}
                  >
                    Log In
                  </Button>
                </form>

                <div className="mt-5 text-center">
                  <Link href="/forgot-password" className="text-sm text-surface-900 hover:underline dark:text-surface-100">
                    Forgot password?
                  </Link>
                </div>

                <div className="my-6 border-t border-surface-200 dark:border-surface-700" />

                <div className="text-center">
                  <Link href="/register">
                    <button className="w-full rounded-full border border-primary-300 bg-white px-6 py-3.5 text-[15px] font-semibold text-primary-600 transition-colors hover:bg-primary-50 dark:border-primary-700 dark:bg-surface-800 dark:text-primary-400 dark:hover:bg-primary-900/20">
                      Create new account
                    </button>
                  </Link>
                </div>
              </div>

              {/* Bottom branding */}
              <div className="mt-auto flex items-center gap-1.5 pt-10 text-surface-400">
                <div className="relative h-5 w-5">
                  <div className="absolute bottom-0 left-1/2 h-[13px] w-[16px] -translate-x-1/2 rounded-[8px_8px_7px_7px] bg-surface-400" />
                  <div className="absolute left-[2px] top-0 h-[5px] w-[5px] rounded-full bg-surface-400" />
                  <div className="absolute right-[2px] top-0 h-[5px] w-[5px] rounded-full bg-surface-400" />
                  <div className="absolute left-0 top-[3px] h-[4px] w-[4px] rounded-full bg-surface-400" />
                  <div className="absolute right-0 top-[3px] h-[4px] w-[4px] rounded-full bg-surface-400" />
                </div>
                <span className="text-sm font-semibold tracking-wide">Hobak</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-surface-200 bg-white py-4 dark:border-surface-700 dark:bg-surface-900">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-5 gap-y-1 px-4 text-xs text-surface-500">
          <span className="font-medium text-surface-600 dark:text-surface-400">English (US)</span>
          <Link href="#" className="hover:underline">About</Link>
          <Link href="#" className="hover:underline">Help</Link>
          <Link href="#" className="hover:underline">Terms</Link>
          <Link href="#" className="hover:underline">Privacy</Link>
          <Link href="#" className="hover:underline">Cookies</Link>
          <Link href="#" className="hover:underline">Developers</Link>
        </div>
      </footer>
    </div>
  );
}

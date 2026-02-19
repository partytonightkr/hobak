"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

export default function LandingPage() {
  const { user } = useAuth({ redirectIfAuthenticated: "/feed" });

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-surface-950">
      {/* Main content — full-height two-column split */}
      <div className="flex flex-1 flex-col lg:flex-row">

        {/* ─── Left side: Visual collage + tagline ─── */}
        <div className="relative flex flex-1 flex-col justify-end overflow-hidden bg-surface-50 px-8 pb-16 pt-8 lg:px-16 dark:bg-surface-900">
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

          {/* Floating collage elements */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {/* Phone / story card */}
            <div className="absolute right-[10%] top-[8%] h-[340px] w-[220px] rotate-3 rounded-3xl border border-surface-200 bg-white shadow-xl dark:border-surface-700 dark:bg-surface-800">
              <div className="mx-auto mt-3 h-1.5 w-16 rounded-full bg-surface-200 dark:bg-surface-600" />
              <div className="mx-4 mt-4 h-[200px] rounded-2xl bg-gradient-to-br from-amber-200 via-orange-300 to-rose-300" />
              <div className="mx-4 mt-3 flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary-100 dark:bg-primary-900/40" />
                <div>
                  <div className="h-2.5 w-20 rounded bg-surface-200 dark:bg-surface-600" />
                  <div className="mt-1 h-2 w-14 rounded bg-surface-100 dark:bg-surface-700" />
                </div>
              </div>
            </div>

            {/* Small photo card */}
            <div className="absolute left-[15%] top-[25%] h-[180px] w-[150px] -rotate-6 rounded-2xl border border-surface-200 bg-white p-2 shadow-lg dark:border-surface-700 dark:bg-surface-800">
              <div className="h-full w-full rounded-xl bg-gradient-to-br from-emerald-200 via-teal-300 to-cyan-300" />
            </div>

            {/* Emoji reaction — paw */}
            <div className="absolute left-[30%] top-[10%] flex h-12 w-12 items-center justify-center rounded-full bg-amber-400 text-2xl shadow-md">
              🐾
            </div>

            {/* Heart reaction */}
            <div className="absolute bottom-[30%] right-[15%] flex h-11 w-11 items-center justify-center rounded-full bg-rose-400 shadow-md">
              <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </div>

            {/* Dog bone icon */}
            <div className="absolute bottom-[20%] left-[8%] flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100 text-xl shadow-md dark:bg-primary-900/40">
              🦴
            </div>

            {/* Story circle avatar */}
            <div className="absolute bottom-[12%] left-[40%]">
              <div className="flex h-[100px] w-[100px] items-center justify-center rounded-full bg-gradient-to-tr from-primary-400 to-primary-600 p-[3px] shadow-lg">
                <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-amber-100 to-orange-200 text-3xl">
                  🐕
                </div>
              </div>
            </div>

            {/* Small post card bottom */}
            <div className="absolute bottom-[35%] left-[20%] w-[180px] -rotate-2 rounded-2xl border border-surface-200 bg-white p-3 shadow-lg dark:border-surface-700 dark:bg-surface-800">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-primary-500" />
                <div className="h-2 w-16 rounded bg-surface-200 dark:bg-surface-600" />
              </div>
              <div className="mt-2 h-2 w-full rounded bg-surface-100 dark:bg-surface-700" />
              <div className="mt-1 h-2 w-3/4 rounded bg-surface-100 dark:bg-surface-700" />
              <div className="mt-3 flex gap-3">
                <div className="h-5 w-12 rounded-full bg-surface-100 dark:bg-surface-700" />
                <div className="h-5 w-12 rounded-full bg-surface-100 dark:bg-surface-700" />
                <div className="h-5 w-12 rounded-full bg-surface-100 dark:bg-surface-700" />
              </div>
            </div>

            {/* Camera/reel icon */}
            <div className="absolute left-[12%] top-[12%] flex h-10 w-10 items-center justify-center rounded-xl bg-surface-200/80 shadow-sm backdrop-blur dark:bg-surface-700/80">
              <svg className="h-5 w-5 text-surface-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
              </svg>
            </div>
          </div>

          {/* Tagline — large bold text at bottom-left */}
          <h1 className="relative z-10 text-5xl font-extrabold leading-[1.1] tracking-tight text-surface-900 sm:text-6xl lg:text-7xl dark:text-surface-50">
            Explore<br />
            the things<br />
            <span className="text-primary-600">you love</span>.
          </h1>
        </div>

        {/* ─── Right side: Login panel ─── */}
        <div className="flex w-full flex-col items-center justify-center border-l border-surface-200 px-8 py-12 lg:w-[420px] lg:min-w-[420px] dark:border-surface-700">
          {/* Settings gear icon */}
          <div className="mb-auto self-end">
            <button className="rounded-full p-2 text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>

          {/* Profile avatar placeholder */}
          <div className="mb-4">
            <div className="flex h-[140px] w-[140px] items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-primary-100 to-primary-200 shadow-sm dark:from-primary-900/40 dark:to-primary-800/40">
              {/* Paw icon as avatar */}
              <div className="relative h-16 w-16">
                <div className="absolute bottom-0 left-1/2 h-[42px] w-[50px] -translate-x-1/2 rounded-[26px_26px_22px_22px] bg-primary-500/60" />
                <div className="absolute left-[3px] top-0 h-[16px] w-[16px] rounded-full bg-primary-400/60" />
                <div className="absolute right-[3px] top-0 h-[16px] w-[16px] rounded-full bg-primary-400/60" />
                <div className="absolute left-[-3px] top-[10px] h-[12px] w-[12px] rounded-full bg-primary-300/60" />
                <div className="absolute right-[-3px] top-[10px] h-[12px] w-[12px] rounded-full bg-primary-300/60" />
              </div>
            </div>
          </div>

          {/* Brand name */}
          <h2 className="mb-8 text-2xl font-semibold text-surface-900 dark:text-surface-50">Hobak</h2>

          {/* Action buttons */}
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

            {/* Spacer */}
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
        </div>
      </div>

      {/* Footer — language links */}
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

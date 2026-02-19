"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-surface-200 bg-white/80 backdrop-blur-md dark:border-surface-700 dark:bg-surface-900/80">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600">
              <span className="text-lg font-bold text-white">C</span>
            </div>
            <span className="text-xl font-bold text-surface-900 dark:text-surface-50">Commune</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost">Log in</Button>
            </Link>
            <Link href="/register">
              <Button>Sign up</Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 py-24 text-center sm:py-32">
          <h1 className="text-4xl font-bold tracking-tight text-surface-900 sm:text-6xl dark:text-surface-50">
            Where ideas thrive and{" "}
            <span className="bg-gradient-to-r from-primary-500 to-accent-500 bg-clip-text text-transparent">
              communities grow
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-surface-600 dark:text-surface-400">
            Commune is a social platform built for meaningful connections. Share your thoughts, discover
            like-minded people, and build communities around what you care about.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link href="/register">
              <Button size="lg">Get started for free</Button>
            </Link>
            <Link href="/login">
              <Button variant="secondary" size="lg">I already have an account</Button>
            </Link>
          </div>
        </section>

        <section className="border-t border-surface-200 bg-white py-20 dark:border-surface-700 dark:bg-surface-900">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-center text-3xl font-bold text-surface-900 dark:text-surface-50">
              Everything you need to connect
            </h2>
            <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  title: "Share your story",
                  description: "Create posts with text, images, and links. Express yourself with up to 2000 characters.",
                  icon: (
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  ),
                },
                {
                  title: "Build your circle",
                  description: "Follow people you care about. Discover new voices through recommendations and trending topics.",
                  icon: (
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  ),
                },
                {
                  title: "Stay in the loop",
                  description: "Notifications for likes, comments, follows, and mentions. Never miss what matters.",
                  icon: (
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  ),
                },
                {
                  title: "Discover content",
                  description: "Search for people on the platform. Find and follow like-minded individuals.",
                  icon: (
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  ),
                },
                {
                  title: "Safe and moderated",
                  description: "Report inappropriate content and users. Proactive moderation keeps the community healthy.",
                  icon: (
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  ),
                },
              ].map((feature) => (
                <div key={feature.title} className="rounded-xl border border-surface-200 p-6 dark:border-surface-700">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
                    {feature.icon}
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-surface-900 dark:text-surface-50">{feature.title}</h3>
                  <p className="mt-2 text-sm text-surface-600 dark:text-surface-400">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="mx-auto max-w-3xl px-4 text-center">
            <h2 className="text-3xl font-bold text-surface-900 dark:text-surface-50">Ready to join the conversation?</h2>
            <p className="mt-4 text-lg text-surface-600 dark:text-surface-400">
              Start connecting with people and communities that matter to you.
            </p>
            <Link href="/register" className="mt-8 inline-block">
              <Button size="lg">Create your account</Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-surface-200 bg-white py-8 dark:border-surface-700 dark:bg-surface-900">
        <div className="mx-auto max-w-6xl px-4 text-center text-sm text-surface-500">
          <p>Commune - Connect, Share, Build Community</p>
        </div>
      </footer>
    </div>
  );
}

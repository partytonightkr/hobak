"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";

interface PricingTier {
  id: string;
  name: string;
  priceId: string | null;
  price: string;
  period: string;
  description: string;
  features: string[];
  highlighted?: boolean;
}

const tiers: PricingTier[] = [
  {
    id: "free",
    name: "Free",
    priceId: null,
    price: "$0",
    period: "forever",
    description: "Get started with the basics",
    features: [
      "Basic profile",
      "10 posts per day",
      "Follow up to 500 users",
      "Standard support",
      "Public feed access",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    priceId: process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID || "price_premium_monthly",
    price: "$9.99",
    period: "/month",
    description: "For power users and creators",
    features: [
      "Verified badge",
      "Post analytics",
      "Unlimited posts",
      "Priority support",
      "Ad-free experience",
      "Longer posts (5000 chars)",
    ],
    highlighted: true,
  },
];

export function PricingTable() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { tier: currentTier, createCheckout, isLoading: subLoading } = useSubscription();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);

  const handleSelect = async (tier: PricingTier) => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    if (!tier.priceId || tier.id === currentTier) return;

    try {
      setLoadingTier(tier.id);
      await createCheckout(tier.priceId);
    } catch {
      setLoadingTier(null);
    }
  };

  const getButtonLabel = (tierId: string): string => {
    if (tierId === currentTier) return "Current plan";
    if (tierId === "free") return "Free";
    return "Upgrade";
  };

  return (
    <div className="mx-auto grid max-w-3xl grid-cols-1 gap-6 md:grid-cols-2">
      {tiers.map((tier) => {
        const isCurrent = tier.id === currentTier;
        const isLoadingThis = loadingTier === tier.id;

        return (
          <div
            key={tier.id}
            className={cn(
              "relative flex flex-col rounded-2xl border p-6",
              tier.highlighted
                ? "border-primary-500 shadow-lg shadow-primary-500/10"
                : "border-surface-200 dark:border-surface-700",
              "bg-white dark:bg-surface-900"
            )}
          >
            {tier.highlighted && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary-600 px-3 py-0.5 text-xs font-semibold text-white">
                Recommended
              </div>
            )}

            <div className="mb-4">
              <h3 className="text-lg font-semibold text-surface-900 dark:text-white">
                {tier.name}
              </h3>
              <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
                {tier.description}
              </p>
            </div>

            <div className="mb-6">
              <span className="text-4xl font-bold text-surface-900 dark:text-white">
                {tier.price}
              </span>
              <span className="text-surface-500 dark:text-surface-400">
                {tier.period}
              </span>
            </div>

            <ul className="mb-8 flex-1 space-y-3">
              {tier.features.map((feature) => (
                <li
                  key={feature}
                  className="flex items-start text-sm text-surface-600 dark:text-surface-300"
                >
                  <svg
                    className="mr-2 mt-0.5 h-4 w-4 flex-shrink-0 text-primary-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>

            <Button
              variant={tier.highlighted && !isCurrent ? "primary" : "secondary"}
              size="lg"
              className="w-full"
              disabled={isCurrent || subLoading || isLoadingThis}
              isLoading={isLoadingThis}
              onClick={() => handleSelect(tier)}
            >
              {getButtonLabel(tier.id)}
            </Button>
          </div>
        );
      })}
    </div>
  );
}

"use client";

import { useSearchParams } from "next/navigation";
import { PricingTable } from "@/components/payments/PricingTable";

export default function PricingPage() {
  const searchParams = useSearchParams();
  const canceled = searchParams.get("canceled");

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      {canceled && (
        <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200">
          Checkout was canceled. You can try again whenever you are ready.
        </div>
      )}

      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold text-surface-900 dark:text-white sm:text-4xl">
          Choose your plan
        </h1>
        <p className="mt-3 text-lg text-surface-500 dark:text-surface-400">
          Unlock powerful features to grow your presence and connect with your community.
        </p>
      </div>

      <PricingTable />

      <div className="mt-12 text-center text-sm text-surface-400 dark:text-surface-500">
        <p>All plans include a 14-day money-back guarantee. Cancel anytime.</p>
        <p className="mt-1">
          Prices are in USD. Taxes may apply depending on your location.
        </p>
      </div>
    </div>
  );
}

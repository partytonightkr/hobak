"use client";

import { useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { SubscriptionManager } from "@/components/payments/SubscriptionManager";
import { InvoiceHistory } from "@/components/payments/InvoiceHistory";

export default function SubscriptionSettingsPage() {
  useAuth({ redirectTo: "/login" });

  const searchParams = useSearchParams();
  const success = searchParams.get("success");

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-surface-900 dark:text-white">
        Subscription
      </h1>

      {success && (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-200">
          Your subscription has been activated. Thank you for upgrading!
        </div>
      )}

      <div className="space-y-6">
        <SubscriptionManager />
        <InvoiceHistory />
      </div>
    </div>
  );
}

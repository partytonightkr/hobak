"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useSubscription } from "@/hooks/useSubscription";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function tierLabel(tier: string): string {
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

function statusBadge(status: string | null) {
  if (!status) return null;
  const colors: Record<string, string> = {
    ACTIVE: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    PAST_DUE: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    CANCELED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    INCOMPLETE: "bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-400",
    TRIALING: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[status] || colors.INCOMPLETE}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}

export function SubscriptionManager() {
  const {
    tier,
    status,
    subscription,
    isLoading,
    cancelSubscription,
    resumeSubscription,
    openBillingPortal,
  } = useSubscription();

  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel your subscription? You will retain access until the end of your billing period.")) {
      return;
    }
    try {
      setActionLoading("cancel");
      await cancelSubscription();
    } finally {
      setActionLoading(null);
    }
  };

  const handleResume = async () => {
    try {
      setActionLoading("resume");
      await resumeSubscription();
    } finally {
      setActionLoading(null);
    }
  };

  const handlePortal = async () => {
    try {
      setActionLoading("portal");
      await openBillingPortal();
    } catch {
      setActionLoading(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <div className="animate-pulse space-y-3">
          <div className="h-5 w-32 rounded bg-surface-200 dark:bg-surface-700" />
          <div className="h-4 w-48 rounded bg-surface-200 dark:bg-surface-700" />
          <div className="h-4 w-40 rounded bg-surface-200 dark:bg-surface-700" />
        </div>
      </Card>
    );
  }

  if (tier === "free") {
    return (
      <Card>
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-surface-900 dark:text-white">
              Free Plan
            </h3>
            <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
              You are currently on the free plan. Upgrade to unlock premium features.
            </p>
          </div>
          <Button variant="primary" onClick={() => (window.location.href = "/pricing")}>
            View Plans
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-surface-900 dark:text-white">
            {tierLabel(tier)} Plan
          </h3>
          {statusBadge(status)}
        </div>

        {subscription && (
          <div className="space-y-2 text-sm text-surface-600 dark:text-surface-300">
            <p>
              <span className="font-medium">Current period:</span>{" "}
              {formatDate(subscription.currentPeriodStart)} &ndash;{" "}
              {formatDate(subscription.currentPeriodEnd)}
            </p>
            {subscription.cancelAtPeriodEnd && (
              <p className="text-yellow-600 dark:text-yellow-400">
                Your subscription will end on{" "}
                {formatDate(subscription.currentPeriodEnd)}
              </p>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          {subscription?.cancelAtPeriodEnd ? (
            <Button
              variant="primary"
              isLoading={actionLoading === "resume"}
              onClick={handleResume}
            >
              Resume Subscription
            </Button>
          ) : (
            <Button
              variant="danger"
              isLoading={actionLoading === "cancel"}
              onClick={handleCancel}
            >
              Cancel Subscription
            </Button>
          )}
          <Button
            variant="secondary"
            isLoading={actionLoading === "portal"}
            onClick={handlePortal}
          >
            Manage Billing
          </Button>
        </div>
      </div>
    </Card>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";

export type SubscriptionTier = "free" | "premium";

export interface SubscriptionData {
  id: string;
  stripePriceId: string | null;
  status: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
}

export interface SubscriptionState {
  tier: SubscriptionTier;
  status: string | null;
  subscription: SubscriptionData | null;
}

export interface Invoice {
  id: string;
  number: string | null;
  status: string | null;
  amountDue: number;
  amountPaid: number;
  currency: string;
  periodStart: string | null;
  periodEnd: string | null;
  invoicePdf: string | null;
  hostedInvoiceUrl: string | null;
  createdAt: string | null;
}

export function useSubscription() {
  const [data, setData] = useState<SubscriptionState>({
    tier: "free",
    status: null,
    subscription: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const { data: result } = await api.get("/payments/subscription");
      setData(result);
    } catch {
      setError("Failed to load subscription");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const createCheckout = async (priceId: string) => {
    const { data: result } = await api.post("/payments/create-checkout", {
      priceId,
    });
    window.location.href = result.url;
  };

  const openBillingPortal = async () => {
    const { data: result } = await api.post("/payments/create-portal");
    window.location.href = result.url;
  };

  const cancelSubscription = async () => {
    await api.post("/payments/cancel");
    await fetchSubscription();
  };

  const resumeSubscription = async () => {
    await api.post("/payments/resume");
    await fetchSubscription();
  };

  return {
    ...data,
    isLoading,
    error,
    refetch: fetchSubscription,
    createCheckout,
    openBillingPortal,
    cancelSubscription,
    resumeSubscription,
  };
}

export function useInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      try {
        const { data } = await api.get("/payments/invoices");
        setInvoices(data.invoices);
      } catch {
        // Silently fail - user may not have invoices
      } finally {
        setIsLoading(false);
      }
    }
    fetch();
  }, []);

  return { invoices, isLoading };
}

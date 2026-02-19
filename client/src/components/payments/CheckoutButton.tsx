"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useSubscription } from "@/hooks/useSubscription";

interface CheckoutButtonProps {
  priceId: string;
  label?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function CheckoutButton({
  priceId,
  label = "Subscribe",
  variant = "primary",
  size = "md",
  className,
}: CheckoutButtonProps) {
  const { createCheckout } = useSubscription();
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    try {
      setIsLoading(true);
      await createCheckout(priceId);
    } catch {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      isLoading={isLoading}
      onClick={handleClick}
    >
      {label}
    </Button>
  );
}

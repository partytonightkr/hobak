"use client";

import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "primary" | "success" | "warning" | "danger";
  className?: string;
}

const variants = {
  default: "bg-surface-100 text-surface-700 dark:bg-surface-700 dark:text-surface-300",
  primary: "bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300",
  success: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
  warning: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300",
  danger: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
};

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", variants[variant], className)}>
      {children}
    </span>
  );
}

"use client";

import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  noPadding?: boolean;
}

export function Card({ className, noPadding, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-surface-200 bg-white shadow-sm dark:border-surface-700 dark:bg-surface-900",
        !noPadding && "p-4",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

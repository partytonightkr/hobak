"use client";

import Image from "next/image";
import { cn, getInitials } from "@/lib/utils";

interface AvatarProps {
  src: string | null;
  alt: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeMap = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
  xl: "h-20 w-20 text-2xl",
};

const pixelMap = { xs: 24, sm: 32, md: 40, lg: 56, xl: 80 };

export function Avatar({ src, alt, size = "md", className }: AvatarProps) {
  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300",
        sizeMap[size],
        className
      )}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          width={pixelMap[size]}
          height={pixelMap[size]}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="font-medium">{getInitials(alt)}</span>
      )}
    </div>
  );
}

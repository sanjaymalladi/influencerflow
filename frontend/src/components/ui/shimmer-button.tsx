import { cn } from "@/lib/utils";
import React from "react";

interface ShimmerButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  shimmerColor?: string;
  shimmerSize?: string;
  borderRadius?: string;
  shimmerDuration?: string;
  background?: string;
  children: React.ReactNode;
}

export function ShimmerButton({
  className,
  children,
  shimmerColor = "#ffffff",
  shimmerSize = "0.05em",
  borderRadius = "0.5rem",
  shimmerDuration = "3s",
  background = "rgba(0, 0, 0, 1)",
  ...props
}: ShimmerButtonProps) {
  return (
    <button
      style={
        {
          "--shimmer-color": shimmerColor,
          "--shimmer-size": shimmerSize,
          "--border-radius": borderRadius,
          "--shimmer-duration": shimmerDuration,
          "--background": background,
        } as React.CSSProperties
      }
      className={cn(
        "group relative z-0 flex cursor-pointer items-center justify-center overflow-hidden whitespace-nowrap px-6 py-3 text-white [background:var(--background)] [border-radius:var(--border-radius)] transition-all duration-300 hover:scale-105 active:scale-95",
        "before:absolute before:inset-0 before:z-[-1] before:translate-x-[-150%] before:translate-y-[-150%] before:rotate-45 before:bg-[linear-gradient(90deg,transparent,var(--shimmer-color),transparent)] before:opacity-60 before:transition-transform before:duration-[3s] before:ease-out group-hover:before:translate-x-[150%] group-hover:before:translate-y-[150%]",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
} 
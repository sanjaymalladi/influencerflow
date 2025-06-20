import { cn } from "@/lib/utils";
import React from "react";

interface AnimatedGradientTextProps {
  children: React.ReactNode;
  className?: string;
  gradient?: string;
  animationSpeed?: string;
}

export function AnimatedGradientText({
  children,
  className,
  gradient = "linear-gradient(to right, #FFE600, #FF8C00, #FFE600, #FF8C00)",
  animationSpeed = "8s",
}: AnimatedGradientTextProps) {
  return (
    <>
      <style>{`
        @keyframes gradientShift {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
      `}</style>
      <span
        className={cn(
          "inline-block bg-gradient-to-r bg-clip-text text-transparent",
          className
        )}
        style={
          {
            backgroundImage: gradient,
            backgroundSize: "300% 100%",
            animation: `gradientShift ${animationSpeed} ease-in-out infinite`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          } as React.CSSProperties
        }
      >
        {children}
      </span>
    </>
  );
} 
import { cn } from "@/lib/utils";
import React from "react";

interface BorderBeamProps {
  className?: string;
  size?: number;
  duration?: number;
  delay?: number;
  borderWidth?: number;
  anchor?: number;
  colorFrom?: string;
  colorTo?: string;
}

export function BorderBeam({
  className,
  size = 200,
  duration = 20,
  delay = 0,
  borderWidth = 1.5,
  anchor = 90,
  colorFrom = "#FFE600",
  colorTo = "#FF8C00",
}: BorderBeamProps) {
  return (
    <div
      style={
        {
          "--size": size,
          "--duration": duration,
          "--anchor": anchor,
          "--border-width": borderWidth,
          "--color-from": colorFrom,
          "--color-to": colorTo,
          "--delay": `-${delay}s`,
        } as React.CSSProperties
      }
      className={cn(
        "pointer-events-none absolute inset-[0] rounded-[inherit] [border:calc(var(--border-width)*1px)_solid_transparent]",
        // mask styles
        "[background:linear-gradient(transparent,transparent),conic-gradient(from_calc(var(--anchor)*1deg),transparent_0_5deg,var(--color-from)_var(--anchor)*1deg,var(--color-to)_calc(var(--anchor)*1deg*1.5),transparent_calc(var(--anchor)*1deg*2))_border-box]",
        // webkit mask
        "[background-clip:padding-box,border-box]",
        // before element for animation
        "before:absolute before:aspect-square before:w-[calc(var(--size)*1px)] before:smooth-spin before:bg-[conic-gradient(from_0deg,var(--color-from),var(--color-to),transparent)] before:content-[''] before:[animation-delay:var(--delay)] before:[animation-duration:calc(var(--duration)*1s)] before:[border-radius:50%] before:[mask:radial-gradient(farthest-side,transparent_calc(100%-3px),white_calc(100%-3px))]",
        className,
      )}
    ></div>
  );
} 
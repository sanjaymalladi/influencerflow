import { cn } from "@/lib/utils";
import React from "react";

interface AnimatedProgressProps {
  value: number;
  max?: number;
  className?: string;
  showPercentage?: boolean;
  color?: string;
  height?: string;
  animated?: boolean;
}

export function AnimatedProgress({
  value,
  max = 100,
  className,
  showPercentage = true,
  color = "from-blue-400 to-purple-500",
  height = "h-2",
  animated = true,
}: AnimatedProgressProps) {
  const percentage = Math.min((value / max) * 100, 100);

  return (
    <div className={cn("w-full", className)}>
      <div className={cn("relative overflow-hidden rounded-full bg-gray-200", height)}>
        <div
          className={cn(
            "h-full rounded-full bg-gradient-to-r transition-all duration-700 ease-out",
            color,
            animated && "relative"
          )}
          style={{ width: `${percentage}%` }}
        >
          {animated && (
            <>
              {/* Shimmer effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse" />
              
              {/* Moving highlight */}
              <div 
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-20"
                style={{
                  animation: "slide 2s infinite",
                  transform: "translateX(-100%)",
                }}
              />
            </>
          )}
        </div>
        
        {/* Glow effect */}
        {animated && percentage > 0 && (
          <div 
            className={cn(
              "absolute top-0 h-full rounded-full bg-gradient-to-r opacity-50 blur-sm",
              color
            )}
            style={{ width: `${percentage}%` }}
          />
        )}
      </div>
      
      {showPercentage && (
        <div className="flex justify-between items-center mt-1 text-xs">
          <span className="text-gray-600">Progress</span>
          <span className="font-medium text-gray-900">{Math.round(percentage)}%</span>
        </div>
      )}
      

    </div>
  );
} 
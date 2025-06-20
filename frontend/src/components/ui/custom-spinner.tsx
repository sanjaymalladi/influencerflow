import { cn } from "@/lib/utils";
import React from "react";

interface CustomSpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  color?: string;
  className?: string;
}

const sizeClasses = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4', 
  md: 'w-6 h-6',
  lg: 'w-8 h-8'
};

export function CustomSpinner({ 
  size = 'sm', 
  color = 'border-blue-400', 
  className 
}: CustomSpinnerProps) {
  return (
    <div className={cn("relative", className)}>
      {/* Main spinner */}
      <div 
        className={cn(
          "border-2 border-gray-200 rounded-full",
          sizeClasses[size]
        )}
        style={{
          borderTopColor: color.includes('border-') ? 
            color.replace('border-', '') : color,
          animation: 'smoothSpin 1.5s linear infinite'
        }}
      />
      
      {/* Inner dot for better visual */}
      <div 
        className={cn(
          "absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-full",
          size === 'xs' && 'w-1 h-1',
          size === 'sm' && 'w-1.5 h-1.5',
          size === 'md' && 'w-2 h-2',
          size === 'lg' && 'w-3 h-3'
        )}
        style={{
          backgroundColor: color.includes('border-') ? 
            color.replace('border-', '') : color,
          opacity: 0.3
        }}
      />
    </div>
  );
} 
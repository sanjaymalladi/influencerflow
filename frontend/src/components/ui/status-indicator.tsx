import { cn } from "@/lib/utils";
import React from "react";

interface StatusIndicatorProps {
  status: 'idle' | 'processing' | 'success' | 'error' | 'warning';
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  showPulse?: boolean;
  className?: string;
}

const getStatusConfig = (status: StatusIndicatorProps['status']) => {
  switch (status) {
    case 'processing':
      return {
        color: 'bg-blue-500',
        glowColor: 'shadow-blue-500/50',
        label: 'Processing',
        icon: null // We'll use the animated dot instead
      };
    case 'success':
      return {
        color: 'bg-green-500',
        glowColor: 'shadow-green-500/50',
        label: 'Success',
        icon: '✅'
      };
    case 'error':
      return {
        color: 'bg-red-500',
        glowColor: 'shadow-red-500/50',
        label: 'Error',
        icon: '❌'
      };
    case 'warning':
      return {
        color: 'bg-yellow-500',
        glowColor: 'shadow-yellow-500/50',
        label: 'Warning',
        icon: '⚠️'
      };
    default:
      return {
        color: 'bg-gray-500',
        glowColor: 'shadow-gray-500/50',
        label: 'Idle',
        icon: '⭕'
      };
  }
};

const getSizeConfig = (size: StatusIndicatorProps['size']) => {
  switch (size) {
    case 'sm':
      return {
        dot: 'w-2 h-2',
        container: 'text-xs',
        gap: 'gap-1'
      };
    case 'lg':
      return {
        dot: 'w-4 h-4',
        container: 'text-base',
        gap: 'gap-3'
      };
    default:
      return {
        dot: 'w-3 h-3',
        container: 'text-sm',
        gap: 'gap-2'
      };
  }
};

export function StatusIndicator({
  status,
  label,
  size = 'md',
  showPulse = true,
  className
}: StatusIndicatorProps) {
  const statusConfig = getStatusConfig(status);
  const sizeConfig = getSizeConfig(size);

  return (
    <div className={cn(
      "flex items-center",
      sizeConfig.container,
      sizeConfig.gap,
      className
    )}>
      <div className="relative">
        <div className={cn(
          "rounded-full",
          statusConfig.color,
          sizeConfig.dot,
          showPulse && status === 'processing' && "animate-pulse"
        )} />
        
        {/* Glow effect */}
        <div className={cn(
          "absolute inset-0 rounded-full blur-sm",
          statusConfig.color,
          statusConfig.glowColor,
          sizeConfig.dot,
          showPulse && "animate-ping opacity-75"
        )} />
        
        {/* Outer glow ring */}
        {status === 'processing' && showPulse && (
          <div className={cn(
            "absolute inset-0 rounded-full",
            statusConfig.color,
            sizeConfig.dot,
            "animate-ping opacity-50 scale-150"
          )} />
        )}
      </div>
      
      {label && (
        <span className={cn(
          "font-medium",
          status === 'processing' && "text-blue-600",
          status === 'success' && "text-green-600",
          status === 'error' && "text-red-600",
          status === 'warning' && "text-yellow-600",
          status === 'idle' && "text-gray-600"
        )}>
          {label}
        </span>
      )}
    </div>
  );
} 
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

interface NumberTickerProps {
  value: number;
  direction?: "up" | "down";
  delay?: number;
  className?: string;
  decimalPlaces?: number;
}

export function NumberTicker({
  value,
  direction = "up",
  delay = 0,
  className,
  decimalPlaces = 0,
}: NumberTickerProps) {
  const [displayValue, setDisplayValue] = useState(direction === "down" ? value : 0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        setDisplayValue((prev) => {
          if (direction === "down") {
            if (prev <= 0) {
              if (intervalRef.current) clearInterval(intervalRef.current);
              return 0;
            }
            return prev - Math.ceil(prev * 0.1);
          } else {
            if (prev >= value) {
              if (intervalRef.current) clearInterval(intervalRef.current);
              return value;
            }
            return Math.min(prev + Math.ceil((value - prev) * 0.1), value);
          }
        });
      }, 30);
    }, delay);

    return () => {
      clearTimeout(timer);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [value, direction, delay]);

  const formattedValue = displayValue.toLocaleString(undefined, {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  });

  return (
    <span className={cn("tabular-nums tracking-wider", className)}>
      {formattedValue}
    </span>
  );
} 
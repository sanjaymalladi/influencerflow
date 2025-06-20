import { cn } from "@/lib/utils";
import React, { useEffect, useState } from "react";
import { StatusIndicator } from "./status-indicator";

interface Activity {
  id: string;
  type: 'ai-action' | 'system' | 'user-action' | 'notification';
  message: string;
  timestamp: Date;
  status: 'success' | 'error' | 'processing' | 'idle' | 'warning';
  icon?: string;
  details?: string;
}

interface LiveActivityFeedProps {
  activities: Activity[];
  maxItems?: number;
  showTimestamp?: boolean;
  className?: string;
  autoScroll?: boolean;
}

export function LiveActivityFeed({
  activities,
  maxItems = 10,
  showTimestamp = true,
  className,
  autoScroll = true
}: LiveActivityFeedProps) {
  const [displayedActivities, setDisplayedActivities] = useState<Activity[]>([]);
  const [newActivityId, setNewActivityId] = useState<string | null>(null);

  useEffect(() => {
    if (activities.length > displayedActivities.length) {
      const newActivity = activities[activities.length - 1];
      setNewActivityId(newActivity.id);
      
      // Add new activity with animation
      setTimeout(() => {
        setDisplayedActivities(prev => {
          const updated = [...prev, newActivity];
          return updated.slice(-maxItems);
        });
        setNewActivityId(null);
      }, 100);
    }
  }, [activities.length, displayedActivities.length, maxItems]);

  const getActivityIcon = (activity: Activity) => {
    if (activity.icon) return activity.icon;
    
    switch (activity.type) {
      case 'ai-action': return '🤖';
      case 'system': return '⚙️';
      case 'user-action': return '👤';
      case 'notification': return '📢';
      default: return '📝';
    }
  };

  const getActivityColor = (status: Activity['status']) => {
    switch (status) {
      case 'success': return 'border-l-green-500 bg-green-50';
      case 'error': return 'border-l-red-500 bg-red-50';
      case 'processing': return 'border-l-blue-500 bg-blue-50';
      default: return 'border-l-gray-500 bg-gray-50';
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      {displayedActivities.map((activity, index) => (
        <div
          key={activity.id}
          className={cn(
            "flex items-start space-x-3 p-3 rounded-lg border-l-4 transition-all duration-300",
            getActivityColor(activity.status),
            newActivityId === activity.id && "animate-pulse scale-105",
            "hover:shadow-sm"
          )}
          style={{
            animationDelay: `${index * 0.1}s`,
          }}
        >
          {/* Icon and Status */}
          <div className="flex-shrink-0 flex items-center space-x-2">
            <span className="text-lg">{getActivityIcon(activity)}</span>
            <StatusIndicator
              status={activity.status}
              size="sm"
              showPulse={activity.status === 'processing'}
            />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 mb-1">
                  {activity.message}
                </p>
                {activity.details && (
                  <p className="text-xs text-gray-600">
                    {activity.details}
                  </p>
                )}
              </div>
              
              {showTimestamp && (
                <time className="text-xs text-gray-500 flex-shrink-0 ml-2">
                  {activity.timestamp.toLocaleTimeString()}
                </time>
              )}
            </div>
          </div>
        </div>
      ))}

      {displayedActivities.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">🌟</div>
          <p className="text-sm">No recent activity</p>
        </div>
      )}
    </div>
  );
} 
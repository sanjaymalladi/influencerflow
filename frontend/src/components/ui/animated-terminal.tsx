import { cn } from "@/lib/utils";
import React, { useEffect, useRef, useState } from "react";
import { CustomSpinner } from "./custom-spinner";

interface LogEntry {
  id: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'processing' | 'warning';
  timestamp: string;
}

interface AnimatedTerminalProps {
  logs: string[];
  className?: string;
  height?: string;
  showProgress?: boolean;
}

const getLogType = (message: string): LogEntry['type'] => {
  if (message.includes('❌') || message.includes('Error') || message.includes('failed')) return 'error';
  if (message.includes('✅') || message.includes('success') || message.includes('found')) return 'success';
  if (message.includes('🔄') || message.includes('Processing') || message.includes('analyzing')) return 'processing';
  if (message.includes('⚠️') || message.includes('Warning')) return 'warning';
  return 'info';
};

const getLogIcon = (type: LogEntry['type']) => {
  switch (type) {
    case 'success': return '✅';
    case 'error': return '❌';
    case 'processing': return null; // We'll use a CSS spinner instead
    case 'warning': return '⚠️';
    default: return '💬';
  }
};

const getLogColor = (type: LogEntry['type']) => {
  switch (type) {
    case 'success': return 'text-green-600';
    case 'error': return 'text-red-600';
    case 'processing': return 'text-blue-600';
    case 'warning': return 'text-amber-600';
    default: return 'text-gray-700';
  }
};

export function AnimatedTerminal({ 
  logs, 
  className, 
  height = "h-64", 
  showProgress = true 
}: AnimatedTerminalProps) {
  const [displayedLogs, setDisplayedLogs] = useState<LogEntry[]>([]);
  const [typingLogId, setTypingLogId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const logIdCounter = useRef(0);

  useEffect(() => {
    if (logs.length > displayedLogs.length) {
      const newLog = logs[logs.length - 1];
      const logEntry: LogEntry = {
        id: `log-${logIdCounter.current++}`,
        message: newLog.split(': ')[1] || newLog,
        type: getLogType(newLog),
        timestamp: newLog.split(': ')[0] || new Date().toLocaleTimeString()
      };

      setTypingLogId(logEntry.id);
      setDisplayedLogs(prev => [...prev, logEntry]);

      // Auto-scroll to bottom
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
        setTypingLogId(null);
      }, 1000);
    }
  }, [logs.length, displayedLogs.length]);

  const progressSteps = [
    { label: 'Processing Brief', completed: logs.some(log => log.includes('Campaign brief processed')) },
    { label: 'Finding Creators', completed: logs.some(log => log.includes('Found') && log.includes('creators')) },
    { label: 'Analyzing Match', completed: logs.some(log => log.includes('compatibility scores')) },
    { label: 'Ready for Outreach', completed: logs.some(log => log.includes('outreach emails')) }
  ];

  return (
    <div className={cn("relative", className)}>
      {showProgress && (
        <div className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">AI Campaign Progress</span>
            <span className="text-xs text-slate-500">
              {progressSteps.filter(step => step.completed).length}/{progressSteps.length}
            </span>
          </div>
          <div className="flex space-x-2">
            {progressSteps.map((step, index) => (
              <div key={index} className="flex-1">
                <div className={cn(
                  "h-2 rounded-full transition-all duration-500",
                  step.completed 
                    ? "bg-gradient-to-r from-green-500 to-blue-500" 
                    : "bg-slate-200"
                )}>
                  {step.completed && (
                    <div className="h-full bg-gradient-to-r from-green-500 to-blue-500 rounded-full"></div>
                  )}
                </div>
                <span className={cn(
                  "text-xs mt-1 block transition-colors",
                  step.completed ? "text-green-600" : "text-slate-500"
                )}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div 
        className={cn(
          "bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm",
          "relative backdrop-blur-sm",
          height
        )}
      >
        {/* Terminal Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center space-x-2">
            <div className="flex space-x-1">
              <div className="w-3 h-3 bg-red-400 rounded-full"></div>
              <div className="w-3 h-3 bg-amber-400 rounded-full"></div>
              <div className="w-3 h-3 bg-green-400 rounded-full"></div>
            </div>
            <span className="text-sm font-mono text-slate-700">AI Agent Console</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse opacity-70" style={{animationDuration: '2s'}}></div>
            <span className="text-xs text-slate-600">ACTIVE</span>
          </div>
        </div>

        {/* Terminal Content */}
        <div 
          ref={scrollRef}
          className="p-4 overflow-y-auto font-mono text-sm space-y-2 bg-white"
          style={{ maxHeight: 'calc(100% - 60px)' }}
        >
          {displayedLogs.length === 0 ? (
            <div className="flex items-center space-x-2 text-slate-500">
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse opacity-50" style={{animationDuration: '2s'}}></div>
              <span>AI agents ready... Upload a campaign brief to begin.</span>
            </div>
          ) : (
            displayedLogs.map((log) => (
              <AnimatedLogEntry 
                key={log.id} 
                log={log} 
                isTyping={typingLogId === log.id}
              />
            ))
          )}
        </div>

        {/* Typing Indicator */}
        {typingLogId && (
          <div className="absolute bottom-4 left-4 flex items-center space-x-1">
            <div className="flex space-x-1">
              <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce"></div>
              <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
            <span className="text-xs text-blue-600 ml-2">AI thinking...</span>
          </div>
        )}
      </div>
    </div>
  );
}

interface AnimatedLogEntryProps {
  log: LogEntry;
  isTyping: boolean;
}

function AnimatedLogEntry({ log, isTyping }: AnimatedLogEntryProps) {
  const [displayText, setDisplayText] = useState('');
  const [showCursor, setShowCursor] = useState(false);

  useEffect(() => {
    if (isTyping) {
      setShowCursor(true);
      let currentIndex = 0;
      const message = log.message;
      
      const typeInterval = setInterval(() => {
        if (currentIndex <= message.length) {
          setDisplayText(message.slice(0, currentIndex));
          currentIndex++;
        } else {
          clearInterval(typeInterval);
          setShowCursor(false);
        }
      }, 30);

      return () => clearInterval(typeInterval);
    } else {
      setDisplayText(log.message);
      setShowCursor(false);
    }
  }, [isTyping, log.message]);

  return (
    <div className={cn(
      "flex items-start space-x-2 transition-all duration-300",
      "hover:bg-slate-50 p-2 rounded log-entry-enter",
      isTyping ? "animate-pulse" : ""
    )}>
      <span className="text-xs text-slate-500 w-16 flex-shrink-0">
        {log.timestamp}
      </span>
      <span className="flex-shrink-0">
        {log.type === 'processing' ? (
          <CustomSpinner size="sm" color="#2563EB" />
        ) : (
          getLogIcon(log.type)
        )}
      </span>
      <span className={cn("flex-1", getLogColor(log.type))}>
        {displayText}
        {showCursor && (
          <span className="typing-cursor text-slate-800">|</span>
        )}
      </span>
    </div>
  );
} 
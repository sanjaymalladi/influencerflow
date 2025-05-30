import React from 'react';
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CreatorSearchErrorProps {
  message: string;
}

export const CreatorSearchError: React.FC<CreatorSearchErrorProps> = ({ message }) => {
  return (
    <Alert className="border-red-200 bg-red-50 max-w-2xl mx-auto">
      <AlertTriangle className="h-4 w-4 text-red-600" />
      <AlertDescription className="text-red-800">
        {message}
      </AlertDescription>
    </Alert>
  );
}; 
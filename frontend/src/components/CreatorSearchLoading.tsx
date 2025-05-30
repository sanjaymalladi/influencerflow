import React from 'react';
import { Loader2 } from "lucide-react";

export const CreatorSearchLoading: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <Loader2 className="w-12 h-12 animate-spin text-[#FFE600] mb-4" />
      <h3 className="text-xl font-semibold text-[#222222] mb-2">
        Searching for creators...
      </h3>
      <p className="text-gray-600 text-center max-w-md">
        We're using AI to find the best content creators that match your criteria. This may take a moment.
      </p>
    </div>
  );
}; 
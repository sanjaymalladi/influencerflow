import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Loader2 } from "lucide-react";

interface CreatorSearchBarProps {
  onSearch: (query: string) => void;
  isLoading: boolean;
}

export const CreatorSearchBar: React.FC<CreatorSearchBarProps> = ({ onSearch, isLoading }) => {
  const [query, setQuery] = useState<string>('');

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-3 w-full max-w-2xl mx-auto">
      <div className="relative flex-grow">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g., 'travel influencers in japan', 'tech reviewers on YouTube'"
          className="pl-10 pr-4 py-6 text-lg rounded-xl"
          disabled={isLoading}
        />
      </div>
      <Button
        type="submit"
        className="bg-[#FFE600] hover:bg-[#E6CF00] text-[#222222] px-6 py-6 rounded-xl font-semibold"
        disabled={isLoading || !query.trim()}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Searching...
          </>
        ) : (
          <>
            <Search className="w-4 h-4 mr-2" />
            Search Creators
          </>
        )}
      </Button>
    </form>
  );
}; 
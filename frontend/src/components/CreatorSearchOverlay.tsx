import React from "react";
import { Button } from "@/components/ui/button";
import { X, Search, Sparkles } from "lucide-react";
import { useCreatorSearch } from "@/hooks/useCreatorSearch";
import { CreatorSearchBar } from "./CreatorSearchBar";
import { CreatorSearchLoading } from "./CreatorSearchLoading";
import { CreatorSearchError } from "./CreatorSearchError";
import { CreatorSearchResults } from "./CreatorSearchResults";
import type { CreatorProfile } from "@/types/creator";

interface CreatorSearchOverlayProps {
  onClose: () => void;
  onAddToOutreach?: (creator: CreatorProfile) => void;
}

const CreatorSearchOverlay = ({ onClose, onAddToOutreach }: CreatorSearchOverlayProps) => {
  const {
    creators,
    isLoading,
    error,
    hasSearched,
    searchCreators,
    clearResults,
  } = useCreatorSearch();

  const handleNewSearch = () => {
    clearResults();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-60"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative bg-white rounded-2xl m-6 w-full max-w-6xl max-h-[90vh] shadow-2xl animate-scale-in overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#FFE600] rounded-xl">
                <Search className="w-6 h-6 text-[#222222]" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-[#222222]">AI Creator Search</h2>
                <p className="text-gray-600">Discover creators powered by Gemini AI</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Search Bar */}
          <div className="space-y-4">
            <CreatorSearchBar onSearch={searchCreators} isLoading={isLoading} />
            
            {hasSearched && creators.length > 0 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Sparkles className="w-4 h-4 text-[#FFE600]" />
                  <span>AI-powered search results</span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleNewSearch}
                  className="rounded-xl"
                >
                  New Search
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {isLoading && <CreatorSearchLoading />}
          
          {error && !isLoading && (
            <CreatorSearchError message={error} />
          )}

          {!isLoading && !error && creators.length > 0 && (
            <CreatorSearchResults 
              creators={creators} 
              onAddToOutreach={onAddToOutreach}
            />
          )}
          
          {!isLoading && creators.length === 0 && hasSearched && !error && (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-[#222222] mb-2">
                No creators found
              </h3>
              <p className="text-gray-600 max-w-md mx-auto">
                Try adjusting your search terms or being more specific about the type of creator you're looking for.
              </p>
            </div>
          )}
          
          {!isLoading && !error && !hasSearched && (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-gradient-to-br from-[#FFE600] to-[#E6CF00] rounded-full flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-10 h-10 text-[#222222]" />
              </div>
              <h3 className="text-2xl font-bold text-[#222222] mb-3">
                AI-Powered Creator Discovery
              </h3>
              <p className="text-gray-600 max-w-lg mx-auto mb-6">
                Search for content creators using natural language. Our AI will find relevant creators 
                and enrich the results with real YouTube data when available.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto text-sm">
                <div className="p-4 bg-gray-50 rounded-xl">
                  <strong className="block text-[#222222] mb-1">Example searches:</strong>
                  <div className="text-gray-600">
                    "Tech reviewers on YouTube"
                  </div>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <strong className="block text-[#222222] mb-1">Be specific:</strong>
                  <div className="text-gray-600">
                    "Travel vloggers in Japan"
                  </div>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <strong className="block text-[#222222] mb-1">Include niches:</strong>
                  <div className="text-gray-600">
                    "Fitness influencers under 100K"
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreatorSearchOverlay;

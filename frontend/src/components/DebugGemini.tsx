import React, { useState } from 'react';
import { searchCreatorsWithGemini } from '../services/geminiService';

const DebugGemini: React.FC = () => {
  const [query, setQuery] = useState('tech reviewers on YouTube');
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testGemini = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🧪 Testing Gemini with query:', query);
      const results = await searchCreatorsWithGemini(query);
      console.log('🧪 Gemini returned:', results);
      setResults(results);
    } catch (err: any) {
      console.error('🚨 Gemini error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const validateNumber = (value: string | null, label: string) => {
    if (!value) return { isValid: true, message: 'N/A' };
    
    const hasProperFormat = /[MKB%]/.test(value);
    const isJustNumber = !isNaN(parseInt(value)) && !/[MKB%]/.test(value);
    
    if (isJustNumber) {
      return { 
        isValid: false, 
        message: `❌ ${value} (should be formatted like "15.2M" or "875K")`,
        style: 'text-red-600 font-bold'
      };
    } else if (hasProperFormat) {
      return { 
        isValid: true, 
        message: `✅ ${value}`,
        style: 'text-green-600 font-bold'
      };
    } else {
      return { 
        isValid: true, 
        message: value,
        style: ''
      };
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">🧪 Debug Gemini Stats & Number Formatting</h1>
      
      <div className="mb-6">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full p-3 border rounded-lg text-lg"
          placeholder="Enter search query..."
        />
        <button
          onClick={testGemini}
          disabled={loading}
          className="mt-3 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-semibold"
        >
          {loading ? 'Testing...' : 'Test Gemini Number Formatting'}
        </button>
      </div>

      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-bold text-blue-800">Expected Format Examples:</h3>
        <div className="text-sm text-blue-700 mt-2">
          <div>✅ Followers: "15.2M", "875K", "2.1M"</div>
          <div>✅ Views: "1.8M", "500K", "2.3M"</div>
          <div>✅ Engagement: "3.4%", "5.8%", "10.2%"</div>
          <div>❌ Wrong: "16", "18", "542" (these should be formatted)</div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <strong className="text-red-800">Error:</strong> <span className="text-red-600">{error}</span>
        </div>
      )}

      {results && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Results ({results.length} creators):</h2>
          {results.map((creator: any, idx: number) => {
            const followersValidation = validateNumber(creator.followers, 'Followers');
            const viewsValidation = validateNumber(creator.typicalViews, 'Views');
            const engagementValidation = validateNumber(creator.engagementRate, 'Engagement');
            
            return (
              <div key={idx} className="p-6 border-2 rounded-lg bg-white shadow-sm">
                <h3 className="font-bold text-xl text-gray-800 mb-3">{creator.channelName}</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="p-3 bg-gray-50 rounded">
                    <strong>Followers:</strong>
                    <div className={followersValidation.style || 'text-gray-600'}>
                      {followersValidation.message}
                    </div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded">
                    <strong>Typical Views:</strong>
                    <div className={viewsValidation.style || 'text-gray-600'}>
                      {viewsValidation.message}
                    </div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded">
                    <strong>Engagement Rate:</strong>
                    <div className={engagementValidation.style || 'text-gray-600'}>
                      {engagementValidation.message}
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div><strong>Match %:</strong> {creator.matchPercentage || 'N/A'}%</div>
                  <div><strong>Categories:</strong> {creator.categories?.join(', ') || 'N/A'}</div>
                </div>
                
                <div className="mt-3">
                  <strong>Bio:</strong> <span className="text-gray-700">{creator.bio || 'N/A'}</span>
                </div>
                
                <div className="mt-2">
                  <strong>YouTube URL:</strong> 
                  <span className="text-blue-600 ml-2">{creator.youtubeChannelUrl || 'N/A'}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DebugGemini; 
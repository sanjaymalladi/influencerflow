import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import type { GeminiCreatorResponseItem } from '../types/creator';
import { GEMINI_MODEL_NAME, DEFAULT_ERROR_MESSAGE, GEMINI_API_KEY } from '../lib/constants';

const mapGeminiResponseToIntermediateProfile = (item: any): GeminiCreatorResponseItem => {
  const channelName = item.channelName || 'Unknown Channel';
  
  // Validate and potentially fix follower count formatting
  let followers = item.followers || null;
  if (followers && typeof followers === 'string') {
    // Check if it's a properly formatted string (should contain M, K, or B)
    if (!/[MKB]/.test(followers) && !isNaN(parseInt(followers))) {
      console.warn(`⚠️ Gemini returned unformatted follower count for ${channelName}: ${followers}`);
      // Attempt to format it properly
      const num = parseInt(followers);
      if (num >= 1000000) {
        followers = (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
      } else if (num >= 1000) {
        followers = (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
      }
    }
  }
  
  // Validate and potentially fix typical views formatting
  let typicalViews = item.typicalViews || null;
  if (typicalViews && typeof typicalViews === 'string') {
    if (!/[MKB]/.test(typicalViews) && !isNaN(parseInt(typicalViews))) {
      console.warn(`⚠️ Gemini returned unformatted view count for ${channelName}: ${typicalViews}`);
      const num = parseInt(typicalViews);
      if (num >= 1000000) {
        typicalViews = (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
      } else if (num >= 1000) {
        typicalViews = (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
      }
    }
  }
  
  // Validate engagement rate formatting
  let engagementRate = item.engagementRate || null;
  if (engagementRate && typeof engagementRate === 'string' && !engagementRate.includes('%')) {
    console.warn(`⚠️ Gemini returned engagement rate without % for ${channelName}: ${engagementRate}`);
    engagementRate = engagementRate + '%';
  }
  
  return {
    channelName: channelName,
    bio: item.bio || 'No bio provided by Gemini.',
    youtubeChannelUrl: item.youtubeChannelUrl || null,
    matchPercentage: typeof item.matchPercentage === 'number' ? Math.max(0, Math.min(100, item.matchPercentage)) : null,
    followers: followers,
    typicalViews: typicalViews,
    engagementRate: engagementRate,
    categories: Array.isArray(item.categories) ? item.categories : (item.categories ? [String(item.categories)] : null),
  };
};

export const searchCreatorsWithGemini = async (query: string): Promise<GeminiCreatorResponseItem[]> => {
  if (!GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY is not set for Gemini API.");
    throw new Error("Gemini API Key is not configured. Please set the VITE_GEMINI_API_KEY environment variable.");
  }

  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

  const prompt = `
    You are an expert research assistant specializing in identifying influential content creators with ACCURATE and REALISTIC statistics.
    Based on the user's query: "${query}", identify up to 10 distinct content creators that are highly relevant.
    Prioritize creators with a significant online presence, especially YouTube if applicable to the query.

    🚨 CRITICAL REQUIREMENTS FOR NUMBERS:
    - Provide REALISTIC subscriber/follower counts that match ACTUAL creator sizes
    - Use proper formatting: "15.2M", "875K", "2.1M" - NOT small numbers like "16" or "18"
    - For major creators, use their KNOWN subscriber counts from your training data
    - For smaller creators, still use realistic numbers appropriate to their actual size
    - NEVER use unrealistically small numbers for well-known creators

    📊 REFERENCE EXAMPLES (use these as guides for similar-sized creators):
    - MrBeast: "200M" subscribers, "80M" typical views, "10.5%" engagement
    - Linus Tech Tips: "15.2M" subscribers, "1.8M" typical views, "3.4%" engagement  
    - Marques Brownlee (MKBHD): "18.1M" subscribers, "2.1M" typical views, "4.2%" engagement
    - PewDiePie: "111M" subscribers, "3.5M" typical views, "6.8%" engagement
    - Unbox Therapy: "18.2M" subscribers, "1.5M" typical views, "3.1%" engagement
    - Dave2D: "3.5M" subscribers, "800K" typical views, "4.5%" engagement
    - iJustine: "7.1M" subscribers, "400K" typical views, "5.2%" engagement

    For each creator, provide this EXACT JSON structure:
    {
      "channelName": "EXACT official name (e.g., 'Linus Tech Tips', 'MrBeast')",
      "bio": "Concise 2-3 sentence summary of their content and style",
      "youtubeChannelUrl": "Full YouTube URL (e.g., https://www.youtube.com/@LinusTechTips)",
      "matchPercentage": "Integer 0-100 representing relevance to query",
      "followers": "REALISTIC subscriber count as formatted string (e.g., '15.2M', '875K')",
      "typicalViews": "REALISTIC typical views per video as formatted string (e.g., '1.8M', '500K')",
      "engagementRate": "REALISTIC engagement rate as percentage string (e.g., '3.4%', '5.8%')",
      "categories": ["Array", "of", "2-4", "relevant", "categories"]
    }

    🔍 VALIDATION RULES:
    - Major tech channels should have millions of subscribers (use "M" format)
    - Mid-tier creators should have hundreds of thousands (use "K" format)  
    - Engagement rates typically range 1-15% (most are 2-8%)
    - Typical views are usually 5-40% of subscriber count
    - Match percentage should reflect actual relevance to the query

    ⚠️ WHAT NOT TO DO:
    - Don't use small raw numbers like "16" or "542" for major creators
    - Don't use unrealistic engagement rates above 20%
    - Don't make up completely unknown creators
    - Don't return channels with obviously fake statistics

    Return ONLY a valid JSON array. No additional text, explanations, or markdown. Example format:
    [
      {
        "channelName": "Linus Tech Tips",
        "bio": "Leading technology channel focusing on PC hardware reviews, builds, and tech news. Known for in-depth testing and entertaining presentation style.",
        "youtubeChannelUrl": "https://www.youtube.com/@LinusTechTips",
        "matchPercentage": 95,
        "followers": "15.2M",
        "typicalViews": "1.8M",
        "engagementRate": "3.4%",
        "categories": ["Technology", "Hardware Reviews", "PC Building", "Tech News"]
      }
    ]

    If no relevant creators are found, return [].
  `;

  try {
    console.log('🚀 Sending query to Gemini:', query);
    
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.05,
        topP: 0.1,
        topK: 1,
      },
    });

    if (!response.text) {
      throw new Error("Gemini API returned an empty response.");
    }

    console.log('📥 Raw Gemini response:', response.text);

    let jsonStr = response.text.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
      jsonStr = match[2].trim();
    }
    
    let parsedData: any[];
    try {
      parsedData = JSON.parse(jsonStr);
      console.log('✅ Parsed Gemini data:', parsedData);
    } catch (e) {
      console.error("Failed to parse JSON response from Gemini:", jsonStr, e);
      const rawTextPreview = response.text ? response.text.substring(0, 500) : "No response text available";
      throw new Error(`Gemini returned an unexpected response format. Preview: ${rawTextPreview}.`);
    }

    if (!Array.isArray(parsedData)) {
      console.error("Gemini response is not an array:", parsedData);
      if (typeof parsedData === 'object' && parsedData !== null) {
        const keys = Object.keys(parsedData);
        if (keys.length === 1 && Array.isArray((parsedData as any)[keys[0]])) {
          parsedData = (parsedData as any)[keys[0]]; 
        } else {
          throw new Error("Gemini response was not in the expected array format and could not be automatically corrected.");
        }
      } else {
        throw new Error("Gemini response was not in the expected array format.");
      }
    }
    
    const mappedData = parsedData.map(mapGeminiResponseToIntermediateProfile);
    console.log('🎯 Final mapped data:', mappedData);
    
    return mappedData;

  } catch (error: any) {
    console.error("Error querying Gemini API:", error);
    const message = error?.message || DEFAULT_ERROR_MESSAGE;
    if (message.includes("API key not valid")) {
      throw new Error("The Gemini API key is invalid. Please check your configuration.");
    }
    if (message.includes("quota") || error?.status === 429) {
      throw new Error("You have exceeded your Gemini API quota. Please try again later.");
    }
    throw new Error(`Failed to fetch creators from Gemini: ${message}`);
  }
}; 
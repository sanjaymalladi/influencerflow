export const GEMINI_MODEL_NAME = "gemini-1.5-flash-latest";
export const DEFAULT_ERROR_MESSAGE = "An unexpected error occurred while searching for creators.";

// Environment variables
export const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || 'AIzaSyAb5yjQ_xP56PQLwIJ9mDPK7X9V13U3LNc';
export const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;

// API Configuration
const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
export const API_BASE_URL = isProduction 
  ? 'https://influencerflow.onrender.com' 
  : ''; // Empty string uses proxy in development

// Helper function to get full API URL
export const getApiUrl = (endpoint: string) => {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}${cleanEndpoint}`;
};

// YouTube API constants
export const YOUTUBE_SEARCH_BASE_URL = "https://www.googleapis.com/youtube/v3/search";
export const YOUTUBE_CHANNELS_BASE_URL = "https://www.googleapis.com/youtube/v3/channels";
export const YOUTUBE_CHANNEL_URL_REGEX = /(?:https?:\/\/)?(?:www\.)?youtube\.com\/(?:channel\/|c\/|user\/|@)?([a-zA-Z0-9_-]+)/; 
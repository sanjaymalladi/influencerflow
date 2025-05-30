# 🚀 Quick API Setup Guide

## Step 1: Create Environment File

Create a file called `.env` in your `frontend` directory with this content:

```env
# Required for AI creator search
VITE_GEMINI_API_KEY=your_gemini_api_key_here

# Optional but recommended for richer data
VITE_YOUTUBE_API_KEY=your_youtube_api_key_here
```

## Step 2: Get Your Gemini API Key (Free!)

1. **Go to Google AI Studio**: https://aistudio.google.com/app/apikey
2. **Sign in** with your Google account
3. **Click "Create API Key"**
4. **Copy the key** and replace `your_gemini_api_key_here` in your `.env` file

## Step 3: Get YouTube API Key (Optional)

1. **Go to Google Cloud Console**: https://console.developers.google.com/
2. **Create a new project** or select existing one
3. **Enable "YouTube Data API v3"**
4. **Create credentials** → API Key
5. **Copy the key** and replace `your_youtube_api_key_here` in your `.env` file

## Step 4: Test It!

1. **Restart your dev server**: `npm run dev`
2. **Go to Creator Database**: `/creators` 
3. **Try searching**: "tech reviewers on YouTube"

## What You'll Get:

✅ **AI-powered creator discovery**  
✅ **Real YouTube statistics**  
✅ **Popular videos for each creator**  
✅ **Smart filtering**  
✅ **Creator selection for outreach**

## Troubleshooting:

- **"API Key not configured"** → Check your `.env` file is in the `frontend` folder
- **No results** → Try different search terms like "gaming streamers" or "travel vloggers"
- **Limited data** → Add YouTube API key for richer profiles

The AI search works directly in your Creator Database page now - no more overlay! 🎉 
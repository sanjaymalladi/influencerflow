# Creator Search Demo Instructions

## Quick Start Demo

1. **Set up environment variables** (create `.env` file in frontend directory):
   ```env
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
   VITE_YOUTUBE_API_KEY=your_youtube_api_key_here
   ```

2. **Start the development server**:
   ```bash
   cd frontend
   npm run dev
   ```

3. **Navigate to Creator Database**:
   - Open your browser to the development URL (usually http://localhost:5173)
   - Go to `/creators` or click "Creator Database" in the navigation

4. **Test the AI Creator Search**:
   - Click the "Search Creators" button
   - Try these example searches:
     - "Tech reviewers on YouTube"
     - "Travel vloggers in Japan"
     - "Gaming streamers with high engagement"
     - "Food bloggers under 100K subscribers"
     - "Educational content creators in science"

## What You'll See

### Search Interface
- Modern search modal with AI branding
- Natural language search input
- Real-time loading states
- Error handling with helpful messages

### Search Results
- Creator cards with profile images
- Match percentage badges (AI confidence)
- Subscriber counts and view statistics
- Content categories and tags
- Bio descriptions
- Data source indicators (YouTube vs Gemini)
- "Add to Outreach" buttons (if callback provided)

### Data Sources
- **Hybrid (YouTube primary)**: Best results with real YouTube data
- **Gemini (YouTube lookup failed)**: AI data when YouTube channel not found
- **Gemini**: AI-only data when YouTube API not configured

## Testing Different Scenarios

### With Both API Keys
- Rich profiles with real YouTube statistics
- High-quality profile images from YouTube
- Accurate subscriber and view counts
- Video counts and channel descriptions

### With Only Gemini API Key
- AI-generated creator suggestions
- Estimated follower counts and engagement rates
- Fallback avatar images
- Still functional but less detailed

### Error Scenarios
- Invalid API keys → Clear error messages
- No results found → Helpful suggestions
- Network issues → Graceful error handling

## Integration Points

The creator search is already integrated into:
- **Creator Database page** (`/creators`)
- **CreatorSearchOverlay component** (modal interface)
- **Navigation flow** (accessible from main creator management)

You can also integrate it into other parts of your app by:
1. Importing the `useCreatorSearch` hook
2. Using individual components like `CreatorSearchBar`
3. Customizing the `onAddToOutreach` callback for your workflow

## Next Steps

After testing the demo:
1. Customize the UI to match your brand
2. Integrate with your outreach management system
3. Add creator profile persistence/saving
4. Implement advanced filtering and sorting
5. Add export functionality for creator lists

The creator search functionality is production-ready and can handle real user queries! 
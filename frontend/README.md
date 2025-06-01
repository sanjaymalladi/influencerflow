# InfluencerFlow Frontend

Modern React/TypeScript frontend for the InfluencerFlow platform with AI-powered creator discovery and campaign management.

## 🚀 Features

- **AI Creator Discovery**: Natural language search powered by Gemini AI
- **Campaign Management**: Create and manage influencer marketing campaigns
- **Outreach Automation**: Email templates and automated outreach
- **AI Conversations**: Monitor and manage AI-handled creator conversations
- **Analytics Dashboard**: Track performance and engagement metrics
- **Modern UI**: Built with Tailwind CSS and responsive design
- **Real-time Updates**: Live conversation tracking and notifications

## 🛠️ Technology Stack

- **React 18** with TypeScript
- **Vite** for fast development and building
- **React Router** for navigation
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **Axios** for API communication
- **React Query** for state management
- **Sonner** for notifications

## 📦 Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env
   ```
   
   Fill in your API keys and configuration in the `.env` file.

3. **Start the development server**
   ```bash
   npm run dev
   ```

   The frontend will start on http://localhost:5173

## 🔧 Configuration

### Environment Variables

```env
# API Configuration
VITE_API_URL=http://localhost:5000

# Google API Configuration
VITE_GOOGLE_API_KEY=your-google-api-key
VITE_YOUTUBE_API_KEY=your-youtube-api-key

# Feature Flags
VITE_ENABLE_AI_FEATURES=true
VITE_ENABLE_ANALYTICS=true
```

## 🎯 Usage

### 1. Creator Discovery
- Navigate to "Creators" section
- Use natural language search (e.g., "tech reviewers on YouTube")
- Apply filters for platform, size, engagement, and region
- Save creators to your database
- Select multiple creators for bulk actions

### 2. Campaign Management
- Go to "Campaigns" section
- Create new campaigns with budget and goals
- Select target creators
- Set campaign parameters and deliverables

### 3. Outreach Management
- Use "Outreach" section for email management
- Create personalized email templates
- Send bulk outreach emails
- Track email performance (sent, opened, replied)

### 4. AI Conversations
- Monitor "AI Conversations" tab
- Review AI-handled responses
- Approve or modify AI suggestions
- Track conversation progress through stages

### 5. Human Approvals
- Check "AI Approvals" for pending decisions
- Review creator negotiations
- Approve or provide custom responses
- Monitor escalated conversations

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/       # Reusable UI components
│   │   ├── auth/        # Authentication components
│   │   ├── campaigns/   # Campaign management
│   │   ├── creators/    # Creator discovery and management
│   │   ├── outreach/    # Email and conversation management
│   │   └── ui/          # Base UI components
│   ├── pages/           # Page components
│   ├── services/        # API services
│   ├── contexts/        # React contexts (Auth)
│   ├── hooks/           # Custom React hooks
│   ├── types/           # TypeScript type definitions
│   └── lib/             # Utility functions
├── public/              # Static assets
├── .env.example         # Environment variables template
├── package.json         # Dependencies and scripts
└── README.md           # This file
```

## 🎨 UI Components

### Core Components
- **CreatorCard**: Display creator information and statistics
- **CampaignCard**: Show campaign details and status
- **ConversationView**: AI conversation interface with message history
- **EmailComposer**: Rich email template editor
- **SearchFilters**: Advanced filtering for creator discovery

### AI Features
- **ConversationStage**: Visual representation of conversation progress
- **ApprovalInterface**: Human approval system for AI decisions
- **NegotiationTracker**: Track terms and changes in negotiations
- **ResponseSuggestions**: AI-generated response options

## 🔒 Authentication

The frontend uses JWT-based authentication with the backend API:

- **Login/Register**: User authentication forms
- **Protected Routes**: Automatic redirection for unauthenticated users
- **Role-based Access**: Different features for different user types
- **Token Management**: Automatic token refresh and storage

## 📱 Responsive Design

The application is fully responsive and works on:
- **Desktop**: Full feature set with multi-column layouts
- **Tablet**: Optimized layouts for medium screens
- **Mobile**: Touch-friendly interface with collapsible navigation

## 🚀 Build and Deployment

### Development
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking
```

### Production Build
```bash
npm run build
```

The build artifacts will be stored in the `dist/` directory.

### Deployment Options
- **Vercel**: Zero-config deployment
- **Netlify**: Static site hosting
- **AWS S3 + CloudFront**: Scalable hosting
- **Docker**: Containerized deployment

## 🧪 Testing

```bash
npm run test         # Run unit tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Generate coverage report
```

## 🔧 Development Tools

- **Vite**: Fast build tool and dev server
- **TypeScript**: Type safety and better developer experience
- **ESLint**: Code linting and formatting
- **Prettier**: Code formatting
- **Tailwind CSS**: Utility-first CSS framework

## 🤝 Contributing

See the main [CONTRIBUTING.md](../CONTRIBUTING.md) file for contribution guidelines.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.

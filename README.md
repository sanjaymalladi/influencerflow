# InfluencerFlow - AI-Powered Influencer Marketing Platform

InfluencerFlow is a comprehensive platform that connects brands with content creators through AI-powered discovery, campaign management, and automated outreach.

## 🚀 Features

### Frontend (React + TypeScript)
- **AI Creator Discovery**: Natural language search powered by Gemini AI
- **YouTube Integration**: Real-time data enrichment from YouTube API
- **User Authentication**: Role-based access (Brand, Creator, Agency, Admin)
- **Campaign Management**: Create and manage influencer campaigns
- **Outreach Automation**: Email templates and automated outreach
- **Analytics Dashboard**: Track performance and engagement metrics
- **Modern UI**: Built with Tailwind CSS and shadcn/ui components

### Backend (Node.js + Express)
- **RESTful API**: Comprehensive API for all platform features
- **JWT Authentication**: Secure token-based authentication
- **Role-based Authorization**: Different permissions for different user types
- **Campaign System**: Full CRUD operations for campaigns
- **Creator Database**: Save and manage creator profiles
- **Outreach Management**: Email campaign creation and tracking
- **Rate Limiting**: API protection and security middleware

## 🛠️ Tech Stack

### Frontend
- React 18 with TypeScript
- Vite for build tooling
- React Router for navigation
- Tailwind CSS for styling
- shadcn/ui for UI components
- Axios for API communication
- React Query for state management
- Sonner for notifications

### Backend
- Node.js with Express
- JWT for authentication
- bcryptjs for password hashing
- CORS for cross-origin requests
- Helmet for security headers
- Morgan for logging
- Express Rate Limit for API protection

## 📋 Prerequisites

- Node.js (v16 or higher)
- npm or pnpm
- Google API key (for Gemini AI and YouTube API)

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone <repository-url>
cd influencerflow
```

### 2. Setup Backend

```bash
cd backend
npm install
```

Create a `.env` file in the backend directory:
```env
PORT=3001
JWT_SECRET=your-super-secret-jwt-key-here
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

Start the backend server:
```bash
npm run dev
```

The backend server will start on http://localhost:3001

### 3. Setup Frontend

```bash
cd frontend
npm install
```

Create a `.env` file in the frontend directory:
```env
VITE_GOOGLE_API_KEY=your-google-api-key
VITE_YOUTUBE_API_KEY=your-youtube-api-key
```

Start the frontend development server:
```bash
npm run dev
```

The frontend will start on http://localhost:5173

## 🔧 Configuration

### Google API Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - YouTube Data API v3
   - Generative AI API (for Gemini)
4. Create credentials (API Key)
5. Add the API key to your frontend `.env` file

### Environment Variables

#### Backend (.env)
```env
PORT=3001                           # Server port
JWT_SECRET=your-jwt-secret          # JWT signing secret
NODE_ENV=development                # Environment
FRONTEND_URL=http://localhost:5173  # Frontend URL for CORS
```

#### Frontend (.env)
```env
VITE_GOOGLE_API_KEY=your-api-key    # Google API key for Gemini
VITE_YOUTUBE_API_KEY=your-api-key   # YouTube API key (can be same as above)
```

## 🎯 Usage

### 1. User Registration & Authentication

1. Navigate to http://localhost:5173
2. Click "Get Started" to register
3. Choose your role:
   - **Brand**: Create campaigns and find creators
   - **Creator**: Apply to campaigns and manage profile
   - **Agency**: Manage campaigns for clients
   - **Admin**: Full platform access

#### Demo Account
For testing, use the demo account:
- Email: `demo@influencerflow.com`
- Password: `password123`

### 2. Creator Discovery

1. Go to the "Creators" page
2. Use natural language search:
   - "tech reviewers on YouTube"
   - "travel vloggers in Japan"
   - "fitness influencers under 100K subscribers"
3. Apply filters for platform, size, engagement, and region
4. Save creators to your database
5. Select multiple creators for bulk actions

### 3. Campaign Management

1. Navigate to "Campaigns"
2. Click "Create Campaign"
3. Fill in campaign details:
   - Name and description
   - Budget and timeline
   - Deliverables and pricing
4. Manage campaign status and applications

### 4. Outreach Automation

1. Go to "Outreach"
2. Create email templates
3. Send personalized outreach to creators
4. Track email performance (sent, opened, replied)

## 🏗️ Project Structure

```
influencerflow/
├── frontend/                   # React frontend
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── pages/            # Page components
│   │   ├── services/         # API services
│   │   ├── contexts/         # React contexts (Auth)
│   │   ├── hooks/            # Custom React hooks
│   │   ├── types/            # TypeScript type definitions
│   │   └── lib/              # Utility functions
│   ├── public/               # Static assets
│   └── package.json
├── backend/                    # Node.js backend
│   ├── src/
│   │   ├── routes/           # API route handlers
│   │   ├── middleware/       # Express middleware
│   │   ├── controllers/      # Route controllers
│   │   ├── models/           # Data models (mock)
│   │   ├── services/         # Business logic
│   │   └── utils/            # Utility functions
│   └── package.json
└── README.md
```

## 🔐 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update user profile
- `POST /api/auth/logout` - User logout

### Creators
- `GET /api/creators` - Get all creators
- `POST /api/creators` - Save new creator
- `GET /api/creators/:id` - Get specific creator
- `PUT /api/creators/:id` - Update creator
- `DELETE /api/creators/:id` - Delete creator

### Campaigns
- `GET /api/campaigns` - Get all campaigns
- `POST /api/campaigns` - Create new campaign
- `GET /api/campaigns/:id` - Get specific campaign
- `PUT /api/campaigns/:id` - Update campaign
- `DELETE /api/campaigns/:id` - Delete campaign
- `POST /api/campaigns/:id/apply` - Apply to campaign

### Outreach
- `GET /api/outreach/emails` - Get outreach emails
- `POST /api/outreach/emails` - Create new email
- `POST /api/outreach/emails/:id/send` - Send email
- `GET /api/outreach/stats` - Get outreach statistics
- `GET /api/outreach/templates` - Get email templates

## 🔍 Features Deep Dive

### AI-Powered Creator Discovery
- Natural language queries processed by Google's Gemini AI
- Real-time YouTube data enrichment
- Smart matching algorithms with percentage scores
- Category-based filtering and recommendations

### Campaign Management
- Multi-deliverable campaign creation
- Budget tracking and management
- Application system for creators
- Role-based permissions and visibility

### Outreach Automation
- Template-based email creation
- Personalization variables
- Delivery tracking and analytics
- Response management

### User Authentication
- JWT-based secure authentication
- Role-based access control
- Protected routes and API endpoints
- Profile management

## 🚦 Development

### Running Tests
```bash
# Backend
cd backend
npm test

# Frontend
cd frontend
npm test
```

### Building for Production
```bash
# Frontend
cd frontend
npm run build

# Backend
cd backend
npm start
```

### API Testing
Use the included test script:
```bash
cd backend
node test-api.js
```

## 🐛 Troubleshooting

### Backend Won't Start
1. Check if port 3001 is already in use
2. Kill existing Node processes: `taskkill /F /IM node.exe` (Windows)
3. Try a different port by setting `PORT` environment variable

### Frontend API Errors
1. Ensure backend is running on port 3001
2. Check CORS configuration in backend
3. Verify API endpoints in browser dev tools

### Google API Issues
1. Verify API keys are correct and active
2. Check API quotas and billing
3. Ensure APIs are enabled in Google Cloud Console

## 📝 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For support and questions:
- Create an issue in the repository
- Check the troubleshooting section above
- Review the API documentation

---

**InfluencerFlow** - Connecting brands with creators through the power of AI! 🚀 
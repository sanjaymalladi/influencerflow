# InfluencerFlow Backend

Node.js/Express API server for the InfluencerFlow platform with AI-powered conversation handling and email automation.

## 🚀 Features

- **RESTful API**: Comprehensive API for all platform features
- **AI Conversation Handling**: Intelligent reply detection and response generation
- **Gmail Integration**: Real-time email processing and reply detection
- **JWT Authentication**: Secure token-based authentication
- **Role-based Authorization**: Different permissions for different user types
- **Campaign Management**: Full CRUD operations for campaigns
- **Creator Database**: Save and manage creator profiles
- **Outreach Automation**: Email campaign creation and tracking

## 🛠️ Technology Stack

- **Node.js** with Express.js
- **Gmail API** for email integration
- **Google Gemini AI** for conversation analysis
- **SocialBlade API** for creator analytics
- **JWT** for authentication
- **File-based storage** (easily upgradeable to database)

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

3. **Start the server**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

## 🔧 Configuration

### Required Environment Variables

```env
# Server Configuration
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRE=7d

# Gmail API Configuration
GMAIL_CLIENT_ID=your-gmail-client-id
GMAIL_CLIENT_SECRET=your-gmail-client-secret
GMAIL_REDIRECT_URI=http://localhost:5000/auth/gmail/callback
GMAIL_REFRESH_TOKEN=your-gmail-refresh-token

# Email Configuration
DEFAULT_FROM_EMAIL=outreach@yourdomain.com
DEFAULT_FROM_NAME=Your Company Name
```

### Optional Environment Variables

```env
# AI Configuration
GEMINI_API_KEY=your-gemini-api-key

# SocialBlade Configuration
SOCIALBLADE_API_KEY=your-socialblade-api-key

# MailerSend Configuration
MAILERSEND_API_KEY=your-mailersend-api-key
MAILERSEND_DOMAIN=your-verified-domain.com
```

## 📊 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user

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

### Outreach
- `GET /api/outreach/emails` - Get outreach emails
- `POST /api/outreach/emails` - Create new email
- `PUT /api/outreach/emails/:id/send` - Send email
- `GET /api/outreach/conversations` - Get AI conversations
- `GET /api/outreach/pending-approvals` - Get pending human approvals

### Automation
- `POST /api/automation/process-negotiation` - Process negotiation with AI
- `GET /api/automation/negotiations/:campaignId` - Get campaign negotiations

## 🤖 AI Features

### Conversation Analysis
- **Intent Detection**: Automatically identifies creator intent (interest, negotiation, rejection)
- **Sentiment Analysis**: Analyzes tone and sentiment of responses
- **Term Extraction**: Extracts negotiation terms (budget, timeline, deliverables)
- **Smart Escalation**: Escalates complex negotiations to humans

### Response Generation
- **Context-Aware**: Generates responses based on conversation stage
- **Professional Tone**: Maintains brand voice and professionalism
- **Negotiation Handling**: Handles counter-offers and terms discussions
- **Contract Preparation**: Initiates contract generation for agreed terms

## 🔒 Security

- **JWT Authentication**: Secure token-based authentication
- **Rate Limiting**: API rate limiting to prevent abuse
- **Input Validation**: Comprehensive input sanitization
- **CORS Configuration**: Proper cross-origin resource sharing
- **Helmet**: Security headers for protection

## 📁 Project Structure

```
backend/
├── src/
│   ├── routes/           # API route handlers
│   ├── services/         # Business logic services
│   ├── middleware/       # Express middleware
│   ├── utils/           # Utility functions
│   └── index.js         # Main application entry
├── data/                # File-based data storage
├── .env.example         # Environment variables template
├── package.json         # Dependencies and scripts
└── README.md           # This file
```

## 🚀 Deployment

### Production Checklist
- [ ] Set up production database
- [ ] Configure production environment variables
- [ ] Set up SSL certificates
- [ ] Configure email authentication (DKIM/SPF)
- [ ] Set up monitoring and logging
- [ ] Configure backup systems

### Health Check
The server provides a health check endpoint at `/health` that returns:
```json
{
  "status": "OK",
  "message": "InfluencerFlow API is running",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "environment": "development",
  "port": 5000
}
```

## 🤝 Contributing

See the main [CONTRIBUTING.md](../CONTRIBUTING.md) file for contribution guidelines.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details. 
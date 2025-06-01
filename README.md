# InfluencerFlow - AI-Powered Influencer Marketing Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18+-blue.svg)](https://reactjs.org/)

A comprehensive influencer marketing platform with AI-powered conversation handling, automated outreach, and intelligent creator discovery.

## 🚀 Features

### 🤖 AI-Powered Conversations
- **Intelligent Reply Detection**: Automatically detects and analyzes creator responses
- **Smart Escalation**: AI handles routine responses, escalates complex negotiations to humans
- **Context-Aware Responses**: Generates appropriate responses based on conversation stage
- **Multi-Stage Tracking**: Tracks conversations from initial contact to contract signing

### 📧 Advanced Email Management
- **Gmail Integration**: Real-time reply detection and processing
- **Multi-Provider Support**: MailerSend, Gmail, and extensible architecture
- **Email Templates**: Customizable templates with personalization
- **Delivery Tracking**: Open rates, reply rates, and engagement analytics

### 👥 Creator Discovery & Management
- **SocialBlade Integration**: Real-time creator statistics and analytics
- **Advanced Search**: Filter by platform, followers, engagement rate, categories
- **Creator Profiles**: Comprehensive creator information and contact management
- **Performance Analytics**: Track creator performance and campaign success

### 📊 Campaign Management
- **Campaign Creation**: Multi-creator campaign management
- **Budget Tracking**: Real-time budget allocation and spending
- **Performance Metrics**: Detailed analytics and reporting
- **ROI Analysis**: Campaign effectiveness and return on investment

### 🔄 Workflow Automation
- **Automated Outreach**: Bulk email sending with personalization
- **Follow-up Sequences**: Automated follow-up campaigns
- **Contract Management**: Digital contract generation and tracking
- **Payment Integration**: Automated payment processing for creators

## 🛠️ Technology Stack

### Backend
- **Node.js** with Express.js
- **Gmail API** for email integration
- **Google Gemini AI** for intelligent conversation analysis
- **SocialBlade API** for creator analytics
- **JWT Authentication** for secure access
- **File-based storage** (easily upgradeable to database)

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for modern styling
- **Lucide React** for icons
- **Responsive Design** for all devices

## 📦 Installation

### Prerequisites
- Node.js 18+ installed
- Gmail account for email integration
- Google Cloud Project with Gmail API enabled
- SocialBlade API access (optional)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/influencerflow.git
   cd influencerflow
   ```

2. **Install dependencies**
   ```bash
   # Install backend dependencies
   cd backend
   npm install

   # Install frontend dependencies
   cd ../frontend
   npm install
   ```

3. **Environment Setup**
   
   Create `backend/.env` file:
   ```env
   # Server Configuration
   PORT=5000
   NODE_ENV=development
   FRONTEND_URL=http://localhost:5173

   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key-here
   JWT_EXPIRE=7d

   # Gmail API Configuration
   GMAIL_CLIENT_ID=your-gmail-client-id
   GMAIL_CLIENT_SECRET=your-gmail-client-secret
   GMAIL_REDIRECT_URI=http://localhost:5000/auth/gmail/callback
   GMAIL_REFRESH_TOKEN=your-gmail-refresh-token

   # Email Configuration
   DEFAULT_FROM_EMAIL=outreach@yourdomain.com
   DEFAULT_FROM_NAME=Your Company Name

   # AI Configuration (Optional)
   GEMINI_API_KEY=your-gemini-api-key

   # SocialBlade Configuration (Optional)
   SOCIALBLADE_API_KEY=your-socialblade-api-key
   ```

4. **Start the application**
   ```bash
   # Start both frontend and backend
   npm run dev
   ```

   Or start them separately:
   ```bash
   # Backend (from backend directory)
   npm start

   # Frontend (from frontend directory)
   npm run dev
   ```

5. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5000
   - Health Check: http://localhost:5000/health

## 🔧 Configuration

### Gmail API Setup

1. **Create Google Cloud Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Enable Gmail API

2. **Create OAuth2 Credentials**
   - Go to Credentials section
   - Create OAuth2 client ID
   - Add authorized redirect URI: `http://localhost:5000/auth/gmail/callback`

3. **Get Refresh Token**
   - Use the provided OAuth flow in the application
   - Or use Google OAuth2 Playground

### SocialBlade Integration (Optional)

1. **Get API Access**
   - Contact SocialBlade for API access
   - Add your API key to environment variables

2. **Configure Rate Limits**
   - SocialBlade has rate limits
   - The application handles rate limiting automatically

## 🎯 Usage

### 1. Creator Discovery
- Navigate to "Creators" section
- Use advanced search filters
- View detailed creator profiles
- Add creators to campaigns

### 2. Campaign Creation
- Go to "Campaigns" section
- Create new campaign with budget and goals
- Select target creators
- Set campaign parameters

### 3. Outreach Management
- Use "Outreach" section for email management
- Create personalized email templates
- Send bulk outreach emails
- Track email performance

### 4. AI Conversations
- Monitor "AI Conversations" tab
- Review AI-handled responses
- Approve or modify AI suggestions
- Track conversation progress

### 5. Analytics & Reporting
- View campaign performance metrics
- Analyze creator engagement rates
- Track ROI and conversion rates
- Export data for further analysis

## 🤖 AI Features

### Conversation Analysis
The AI system analyzes incoming creator responses for:
- **Intent Detection**: Interest, negotiation, rejection, questions
- **Sentiment Analysis**: Positive, negative, neutral tone
- **Term Extraction**: Budget mentions, timeline changes, deliverable modifications
- **Escalation Rules**: Automatic human escalation for complex negotiations

### Smart Responses
AI generates contextually appropriate responses:
- **Interest Confirmation**: Detailed campaign information
- **Negotiation Handling**: Professional counter-offers
- **Contract Preparation**: Legal document generation
- **Follow-up Sequences**: Automated nurture campaigns

## 📊 API Documentation

### Authentication
```javascript
POST /api/auth/login
POST /api/auth/register
GET /api/auth/me
```

### Creators
```javascript
GET /api/creators
POST /api/creators
GET /api/creators/:id
PUT /api/creators/:id
DELETE /api/creators/:id
```

### Campaigns
```javascript
GET /api/campaigns
POST /api/campaigns
GET /api/campaigns/:id
PUT /api/campaigns/:id
DELETE /api/campaigns/:id
```

### Outreach
```javascript
GET /api/outreach/emails
POST /api/outreach/emails
PUT /api/outreach/emails/:id/send
GET /api/outreach/conversations
GET /api/outreach/pending-approvals
```

## 🔒 Security

- **JWT Authentication**: Secure token-based authentication
- **Rate Limiting**: API rate limiting to prevent abuse
- **Input Validation**: Comprehensive input sanitization
- **CORS Configuration**: Proper cross-origin resource sharing
- **Environment Variables**: Secure configuration management

## 🚀 Deployment

### Production Checklist
- [ ] Set up production database (PostgreSQL recommended)
- [ ] Configure production environment variables
- [ ] Set up SSL certificates
- [ ] Configure email authentication (DKIM/SPF)
- [ ] Set up monitoring and logging
- [ ] Configure backup systems

### Docker Deployment (Coming Soon)
```bash
docker-compose up -d
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check the inline code documentation
- **Issues**: Report bugs via GitHub Issues
- **Discussions**: Use GitHub Discussions for questions

## 🎯 Roadmap

### Phase 1 (Current)
- [x] Basic AI conversation handling
- [x] Gmail integration
- [x] Creator discovery
- [x] Campaign management

### Phase 2 (Next 3 months)
- [ ] Advanced AI with LLM integration
- [ ] Database persistence
- [ ] Advanced analytics
- [ ] Mobile application

### Phase 3 (6-12 months)
- [ ] Enterprise features
- [ ] Multi-language support
- [ ] Advanced integrations
- [ ] White-label solutions

## 🏆 Acknowledgments

- Google Gemini AI for intelligent conversation analysis
- SocialBlade for creator analytics
- Gmail API for email integration
- React and Node.js communities

---

**Built with ❤️ for the influencer marketing community** 
# InfluencerFlow Backend

> Express.js API server with Supabase integration for the InfluencerFlow platform

## 🚀 Quick Start

### Environment Variables
Create a `.env` file with the following variables:

```env
# Database
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key

# Authentication
JWT_SECRET=your_jwt_secret_key

# Email Integration
GMAIL_CLIENT_ID=your_gmail_client_id
GMAIL_CLIENT_SECRET=your_gmail_client_secret
GMAIL_REFRESH_TOKEN=your_gmail_refresh_token

# Server Configuration
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

### Installation
```bash
npm install
npm run dev
```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/profile` - Get user profile

### Creators
- `GET /api/creators` - Get saved creators
- `POST /api/creators` - Save a creator
- `PUT /api/creators/:id` - Update creator
- `DELETE /api/creators/:id` - Delete creator
- `GET /api/creators/search` - Search creators

### Campaigns
- `GET /api/campaigns` - Get campaigns
- `POST /api/campaigns` - Create campaign
- `PUT /api/campaigns/:id` - Update campaign
- `DELETE /api/campaigns/:id` - Delete campaign

### Outreach
- `GET /api/outreach/emails` - Get emails
- `POST /api/outreach/send` - Send email
- `GET /api/outreach/templates` - Get templates

### Automation
- `POST /api/automation/contracts` - Generate contracts
- `GET /api/automation/conversations` - Get conversations

### Admin
- `POST /api/setup-demo` - Setup demo user and data (requires service key)

## 🔧 Setup Demo Data

To populate the database with demo creators, call the setup endpoint:

```bash
curl -X POST http://localhost:5000/api/setup-demo
```

This will:
1. Create a demo user in Supabase Auth
2. Add sample creators to the database
3. Setup initial data for testing

## 🐳 Docker Deployment

The backend includes a Dockerfile for containerized deployment:

```bash
docker build -t influencerflow-backend .
docker run -p 5000:5000 influencerflow-backend
```

## 📊 Database Schema

The API uses Supabase (PostgreSQL) with these main tables:
- `users` - User authentication and profiles
- `creators` - Influencer data and analytics
- `campaigns` - Marketing campaigns
- `outreach_emails` - Email tracking
- `conversations` - AI conversation analysis

See `../database-schema.sql` for the complete schema.

## 🛡️ Security Features

- JWT authentication
- Rate limiting (100 requests per 15 minutes)
- CORS protection
- Input validation
- Password hashing with bcrypt
- Environment variable protection

## 📝 Development

### Scripts
- `npm run dev` - Development server with nodemon
- `npm start` - Production server
- `npm test` - Run tests (if available)

### Project Structure
```
src/
├── config/          # Configuration files
├── middleware/      # Express middleware
├── routes/         # API route handlers
├── services/       # Business logic
└── index.js        # Main server file
```

## 🌐 Production Deployment

The backend is configured for deployment on Render with automatic Docker builds.

Environment variables are managed through the Render dashboard and `render.yaml` configuration. 
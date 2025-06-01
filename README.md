# InfluencerFlow

> 🚀 **AI-powered influencer discovery and outreach platform** for seamless creator collaborations

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-influencerflow.vercel.app-blue?style=for-the-badge)](https://influencerflow.vercel.app)
[![API Status](https://img.shields.io/badge/🔗_API-influencerflow.onrender.com-green?style=for-the-badge)](https://influencerflow.onrender.com/health)

## ✨ Features

### 🔍 **AI-Powered Creator Discovery**
- **Smart Search**: Find creators using natural language with Gemini AI
- **YouTube Integration**: Real-time channel data, analytics, and insights
- **Advanced Filtering**: Platform, audience size, engagement rate, categories
- **Match Scoring**: AI-powered relevance scoring for brand-creator fit

### 📧 **Automated Outreach**
- **Gmail Integration**: Send personalized emails directly from the platform
- **Email Templates**: Pre-built templates for different campaign types
- **Tracking**: Monitor email opens, clicks, and responses
- **Follow-ups**: Automated sequence management

### 📊 **Campaign Management**
- **Project Organization**: Create and manage multiple campaigns
- **Creator Lists**: Save and organize discovered creators
- **Collaboration Tools**: Team-friendly workflow management
- **Analytics Dashboard**: Track campaign performance and ROI

### 🤖 **AI Features**
- **Content Analysis**: AI-powered creator content evaluation
- **Bio Generation**: Smart creator bio summarization
- **Match Analysis**: Intelligent brand-creator compatibility scoring
- **Email Personalization**: AI-generated personalized outreach content

## 🛠️ Tech Stack

### **Frontend**
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for modern styling
- **Lucide React** for icons
- **Date-fns** for date handling

### **Backend**
- **Node.js** with Express.js
- **JWT** for authentication
- **Supabase** for database and real-time features
- **Gmail API** for email integration
- **bcryptjs** for password hashing

### **AI & APIs**
- **Google Gemini AI** for smart search and analysis
- **YouTube Data API v3** for creator insights
- **Gmail API** for outreach automation

### **Deployment**
- **Frontend**: Vercel (Automatic deployments)
- **Backend**: Render (Docker containers)
- **Database**: Supabase (PostgreSQL)

## 🚀 Quick Start

### **1. Clone the Repository**
```bash
git clone https://github.com/sanjaymalladi/influencerflow.git
cd influencerflow
```

### **2. Environment Setup**

#### Frontend (.env)
```env
VITE_API_URL=http://localhost:5000/api
VITE_GEMINI_API_KEY=your_gemini_api_key
VITE_YOUTUBE_API_KEY=your_youtube_api_key
```

#### Backend (.env)
```env
# Database
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key

# Authentication
JWT_SECRET=your_jwt_secret

# Email Integration
GMAIL_CLIENT_ID=your_gmail_client_id
GMAIL_CLIENT_SECRET=your_gmail_client_secret
GMAIL_REFRESH_TOKEN=your_gmail_refresh_token

# Frontend URL
FRONTEND_URL=http://localhost:5173
```

### **3. Installation & Development**

#### Backend Setup
```bash
cd backend
npm install
npm run dev
```

#### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### **4. Database Setup**

Run the SQL schema in your Supabase dashboard:
```bash
psql -f database-schema.sql
```

Or use the provided schema in `database-schema.sql`

## 📱 Usage

### **Demo Account**
- **Email**: `demo@influencerflow.com`
- **Password**: `password123`

### **Key Workflows**

1. **🔍 Discover Creators**
   - Use natural language search: "tech reviewers with 100k+ subscribers"
   - Filter by platform, engagement, location
   - Save interesting creators to your list

2. **📧 Launch Outreach**
   - Create email campaigns
   - Use personalized templates
   - Track responses and engagement

3. **📊 Manage Campaigns**
   - Organize creators by projects
   - Monitor campaign progress
   - Analyze performance metrics

## 🔧 Configuration

### **API Keys Required**

| Service | Required For | Get API Key |
|---------|-------------|-------------|
| **Gemini AI** | Smart search, content analysis | [Google AI Studio](https://makersuite.google.com/) |
| **YouTube Data API** | Creator discovery, analytics | [Google Cloud Console](https://console.cloud.google.com/) |
| **Gmail API** | Email outreach | [Google Cloud Console](https://console.cloud.google.com/) |
| **Supabase** | Database, authentication | [Supabase Dashboard](https://supabase.com/dashboard) |

### **Database Schema**

The platform uses PostgreSQL with the following main tables:
- `users` - User accounts and authentication
- `creators` - Discovered influencers and their data
- `campaigns` - Outreach campaigns and projects
- `outreach_emails` - Email tracking and management
- `conversations` - AI-powered conversation analysis

## 🌐 Deployment

### **Production URLs**
- **Frontend**: https://influencerflow.vercel.app
- **Backend API**: https://influencerflow.onrender.com
- **API Health**: https://influencerflow.onrender.com/health

### **Deploy Your Own**

#### Vercel (Frontend)
1. Connect your GitHub repository
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main

#### Render (Backend)
1. Connect your GitHub repository
2. Set build command: `docker build`
3. Configure environment variables
4. Deploy automatically on push to main

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### **Development Setup**
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Google Gemini AI** for intelligent search capabilities
- **YouTube Data API** for creator insights
- **Supabase** for backend infrastructure
- **Vercel & Render** for hosting and deployment

## 📞 Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/sanjaymalladi/influencerflow/issues)
- **Email**: demo@influencerflow.com
- **Documentation**: Check the `/docs` folder for detailed guides

---

<div align="center">

**⭐ Star this repository if you found it helpful!**

Built with ❤️ for the creator economy

</div>

# 🚀 InfluencerFlow Deployment Guide

## 📋 Prerequisites

- [Supabase Account](https://supabase.com) (Free tier available)
- [Vercel Account](https://vercel.com) (Free tier available)
- [Railway Account](https://railway.app) (Free tier available)

## 🗄️ Database Setup (Supabase)

### 1. Create Supabase Project
- Go to [Supabase Dashboard](https://app.supabase.com)
- Click "New Project"
- Choose your organization
- Enter project name: `influencerflow`
- Set database password (save this!)
- Select region closest to your users
- Click "Create new project"

### 2. Run Database Schema
1. Navigate to **SQL Editor** in your Supabase dashboard
2. Copy the entire content from `database-schema.sql`
3. Paste into the SQL Editor
4. Click **Run** to execute

This creates:
- ✅ All tables (users, creators, campaigns, conversations, etc.)
- ✅ Indexes for performance
- ✅ Row Level Security (RLS) policies
- ✅ Storage buckets for file uploads
- ✅ Triggers for automatic timestamps

### 3. Get Your Credentials
From your Supabase project settings:
- **Project URL**: `https://your-project-id.supabase.co`
- **Anon Key**: Found in Settings > API
- **Service Role Key**: Found in Settings > API (keep this secret!)

## 🖥️ Backend Deployment (Railway)

### 1. Prepare for Deployment
```bash
# Make sure all dependencies are installed
cd backend
npm install

# Test locally first
npm start
```

### 2. Deploy to Railway
1. Go to [Railway](https://railway.app)
2. Click "Start a New Project"
3. Choose "Deploy from GitHub repo"
4. Connect your GitHub account
5. Select your repository
6. Choose the `backend` folder as root directory

### 3. Set Environment Variables
In Railway dashboard, go to Variables tab and add:

```env
# Server Configuration
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://your-frontend-domain.vercel.app

# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d

# Gmail API Configuration (if using Gmail integration)
GMAIL_CLIENT_ID=your-gmail-client-id
GMAIL_CLIENT_SECRET=your-gmail-client-secret
GMAIL_REDIRECT_URI=https://your-backend-domain.railway.app/api/auth/gmail/callback
GMAIL_REFRESH_TOKEN=your-gmail-refresh-token

# Email Configuration
DEFAULT_FROM_EMAIL=your-email@domain.com
DEFAULT_FROM_NAME=InfluencerFlow
```

### 4. Deploy
Railway will automatically deploy when you push to your main branch.

## 🌐 Frontend Deployment (Vercel)

### 1. Prepare Frontend
```bash
cd frontend
npm install

# Make sure environment variables are set
# Check that VITE_API_URL points to your backend
cat .env  # or type .env on Windows

npm run build  # Test build locally
```

### 2. Deploy to Vercel
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository
4. Select the `frontend` folder as root directory
5. Set build command: `npm run build`
6. Set output directory: `dist`

### 3. Set Environment Variables
In Vercel dashboard, go to Settings > Environment Variables:

```env
# API Configuration (CRITICAL - tells frontend where backend is)
VITE_API_URL=https://your-backend-domain.railway.app/api

# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# External APIs (if using)
VITE_GEMINI_API_KEY=your-gemini-api-key
VITE_YOUTUBE_API_KEY=your-youtube-api-key
```

### 4. Deploy
Vercel will automatically deploy and provide you with a URL.

## 🔗 Frontend-Backend Connection

**CRITICAL**: The frontend needs to know where your backend is deployed.

### Local Development
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`
- Frontend .env: `VITE_API_URL=http://localhost:5000/api`

### Production
- Frontend: `https://your-app.vercel.app`
- Backend: `https://your-api.railway.app`  
- Frontend .env: `VITE_API_URL=https://your-api.railway.app/api`

### Environment Variable Examples

**Frontend (.env)**:
```env
# Points to your deployed backend
VITE_API_URL=https://influencerflow-api.railway.app/api
VITE_SUPABASE_URL=https://udfseqeriqtshxttgdac.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**Backend (.env)**:
```env
# Points to your deployed frontend
FRONTEND_URL=https://influencerflow.vercel.app
SUPABASE_URL=https://udfseqeriqtshxttgdac.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

## 🔧 Post-Deployment Setup

### 1. Update CORS Settings
Update your backend CORS configuration to include your frontend domain:

```javascript
// In backend/src/index.js
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://your-frontend-domain.vercel.app'
  ],
  credentials: true
}));
```

### 2. Test the Integration
1. Visit your frontend URL
2. Try creating an account
3. Test creator search and saving
4. Verify database entries in Supabase dashboard

### 3. Set up Authentication (Optional)
If you want to use Supabase Auth instead of JWT:

1. In Supabase dashboard, go to Authentication > Settings
2. Configure your site URL: `https://your-frontend-domain.vercel.app`
3. Add redirect URLs for OAuth providers
4. Update your frontend to use Supabase Auth

## 📊 Monitoring & Analytics

### 1. Supabase Dashboard
- Monitor database usage
- Check API requests
- View real-time data

### 2. Vercel Analytics
- Enable Vercel Analytics for frontend performance
- Monitor page views and user interactions

### 3. Railway Metrics
- Monitor backend performance
- Check memory and CPU usage
- View deployment logs

## 🔒 Security Checklist

- ✅ Environment variables are set correctly
- ✅ Supabase RLS policies are enabled
- ✅ JWT secrets are strong and unique
- ✅ CORS is configured properly
- ✅ API keys are kept secret
- ✅ Database backups are enabled (Supabase Pro)

## 💰 Cost Estimation

### Free Tier Limits:
- **Supabase**: 500MB database, 2GB bandwidth/month
- **Vercel**: 100GB bandwidth, unlimited deployments
- **Railway**: $5/month after trial, 500 hours/month

### Scaling:
- **Supabase Pro**: $25/month (8GB database, 250GB bandwidth)
- **Vercel Pro**: $20/month (1TB bandwidth)
- **Railway**: Pay-as-you-scale pricing

## 🚨 Troubleshooting

### Common Issues:

1. **Database Connection Error**
   - Check Supabase URL and keys
   - Verify database schema is created
   - Check network connectivity

2. **CORS Errors**
   - Update backend CORS configuration
   - Verify frontend domain is whitelisted

3. **Environment Variables Not Loading**
   - Check variable names (VITE_ prefix for frontend)
   - Restart deployments after adding variables
   - Verify no typos in variable names

4. **Build Failures**
   - Check Node.js version compatibility
   - Verify all dependencies are installed
   - Check for TypeScript errors

## 📞 Support

- **Supabase**: [Documentation](https://supabase.com/docs) | [Discord](https://discord.supabase.com)
- **Vercel**: [Documentation](https://vercel.com/docs) | [Support](https://vercel.com/support)
- **Railway**: [Documentation](https://docs.railway.app) | [Discord](https://discord.gg/railway)

---

## 🎉 You're Live!

Once deployed, your InfluencerFlow platform will be:
- ✅ **Scalable**: Handles thousands of users
- ✅ **Secure**: Enterprise-grade security
- ✅ **Fast**: Global CDN and optimized database
- ✅ **Reliable**: 99.9% uptime SLA
- ✅ **Cost-effective**: Free tier for getting started

Your platform is now ready to help brands connect with influencers at scale! 🚀 
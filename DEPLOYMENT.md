# InfluencerFlow Deployment Guide

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- Git

### Environment Setup
1. Copy `environment.example` to `.env`
2. Fill in your API keys and configuration
3. Ensure Supabase database is set up

### Local Development
```bash
# Install dependencies
npm run install:all

# Start development servers
npm run dev

# Or with Docker
docker-compose up
```

## 📦 Production Deployment

### Option 1: Docker Deployment
```bash
# Build and run production containers
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

### Option 2: Platform Deployment

#### Backend (Render/Railway/DigitalOcean)
- Set environment variables from `environment.example`
- Deploy from `backend/` directory
- Use `backend/Dockerfile` for containerized deployment

#### Frontend (Vercel/Netlify)
- Deploy from `frontend/` directory
- Set `VITE_API_URL` to your backend URL
- Build command: `npm run build`
- Output directory: `dist`

### Option 3: VPS Deployment
```bash
# Clone repository
git clone <your-repo-url>
cd influencerflow

# Set up environment
cp environment.example .env
# Edit .env with your values

# Install dependencies
npm run install:all

# Build frontend
cd frontend && npm run build

# Start backend with PM2
cd ../backend
npm install -g pm2
pm2 start src/index.js --name influencerflow-api

# Set up Nginx reverse proxy (optional)
sudo nginx -t && sudo systemctl reload nginx
```

## 🔧 Configuration

### Required Environment Variables
```env
# Database
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key

# Authentication
JWT_SECRET=your_secret_key

# Email Service (choose one)
SENDGRID_API_KEY=your_sendgrid_key
# OR
RESEND_API_KEY=your_resend_key

# AI Services
GEMINI_API_KEY=your_gemini_key
```

### Optional Services
- **YouTube API**: For creator discovery
- **Twilio**: For voice calling features
- **Redis**: For caching and sessions
- **Sentry**: For error monitoring

## 🔍 Health Checks

### Backend Health Check
```bash
curl http://your-backend-url/health
```

### Frontend Health Check
```bash
curl http://your-frontend-url/health
```

## 📊 Monitoring

### Application Logs
```bash
# Docker
docker-compose logs -f backend
docker-compose logs -f frontend

# PM2
pm2 logs influencerflow-api
pm2 monit
```

### Database Monitoring
- Check Supabase dashboard
- Monitor API usage and rate limits

## 🔒 Security

### SSL Certificate
- Use Let's Encrypt for free SSL
- Configure in Nginx or cloud provider

### Environment Security
- Never commit `.env` files
- Use secret management in production
- Rotate API keys regularly

## 🚨 Troubleshooting

### Common Issues

**Backend won't start:**
- Check environment variables
- Verify Supabase connection
- Check port availability

**Frontend build fails:**
- Verify API URL configuration
- Check for TypeScript errors
- Clear node_modules and reinstall

**Database connection issues:**
- Verify Supabase credentials
- Check RLS policies
- Ensure network connectivity

### Getting Help
1. Check application logs
2. Verify environment configuration
3. Test API endpoints individually
4. Check Supabase dashboard for errors

## 📈 Scaling

### Horizontal Scaling
- Use load balancer (Nginx/CloudFlare)
- Multiple backend instances
- CDN for frontend assets

### Database Optimization
- Connection pooling
- Read replicas
- Query optimization

### Caching Strategy
- Redis for session storage
- API response caching
- Static asset caching

## 🔄 Updates & Maintenance

### Updating the Application
```bash
# Pull latest changes
git pull origin main

# Update dependencies
npm run install:all

# Rebuild and restart
docker-compose down
docker-compose up -d --build
```

### Database Migrations
```bash
# Apply new migrations
cd backend
npm run migrate
```

### Backup Strategy
- Regular database backups via Supabase
- Environment variable backups
- Code repository backup to GitHub 
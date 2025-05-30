# InfluencerFlow - Quick Setup Guide

## 🚀 Quick Start (5 minutes)

### Prerequisites Check
- ✅ Node.js installed (v16+)
- ✅ npm or pnpm available
- ✅ Google API key (optional for testing)

### 1. Install Dependencies

**Backend:**
```bash
cd backend
npm install
```

**Frontend:**
```bash
cd frontend
npm install
```

### 2. Environment Setup

**Backend Environment (backend/.env):**
```env
PORT=3001
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

**Frontend Environment (frontend/.env):**
```env
VITE_GOOGLE_API_KEY=your-google-api-key-here
VITE_YOUTUBE_API_KEY=your-youtube-api-key-here
```

> 💡 **Note**: You can test without API keys, but creator search won't work fully.

### 3. Start Servers

**Option A: Automatic (Windows)**
```bash
start-dev.bat
```

**Option B: Manual**
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### 4. Access Application

- 🌐 **Frontend**: http://localhost:5173
- 📊 **Backend API**: http://localhost:3001
- 💚 **Health Check**: http://localhost:3001/health

### 5. Test Login

Use the demo account:
- **Email**: `demo@influencerflow.com`
- **Password**: `password123`

## 🎯 What You Can Do

### ✅ Working Features (No API Keys Needed)
- User registration and login
- Campaign creation and management
- Creator database management
- Outreach email creation
- Role-based access control
- Protected routes
- Full UI navigation

### 🔑 Features Requiring API Keys
- AI-powered creator search via Gemini
- YouTube data enrichment
- Real-time creator statistics

## 🏗️ Architecture Overview

```
Frontend (React/TypeScript) ← → Backend (Node.js/Express)
     ↓                              ↓
   Port 5173                    Port 3001
     ↓                              ↓
  Modern UI                     RESTful API
 Tailwind CSS                  JWT Auth
  React Router                 Role-based Access
```

## 🔐 User Roles

| Role | Permissions |
|------|-------------|
| **Brand** | Create campaigns, search creators, manage outreach |
| **Creator** | Apply to campaigns, manage profile |
| **Agency** | Manage campaigns for clients |
| **Admin** | Full platform access |

## 📁 Key Files

- `frontend/src/services/apiService.ts` - API communication
- `frontend/src/contexts/AuthContext.tsx` - User authentication
- `backend/src/routes/` - API endpoints
- `backend/src/middleware/auth.js` - JWT authentication

## 🐛 Common Issues

### Port Already in Use
```bash
# Windows
taskkill /F /IM node.exe

# Then restart servers
```

### CORS Errors
- Ensure backend is running on port 3001
- Check FRONTEND_URL in backend .env

### API Errors
- Check browser console for errors
- Verify backend logs for issues

## 🎨 UI Components

Built with:
- shadcn/ui components
- Tailwind CSS styling
- Lucide React icons
- Responsive design
- Modern animations

## 📞 Need Help?

1. Check browser console for errors
2. Check backend logs in terminal
3. Review the full README.md
4. Test API endpoints with `node backend/test-api.js`

---

**Happy coding! 🚀** 
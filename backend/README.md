# InfluencerFlow Backend API

Backend API for the InfluencerFlow platform - Creator Discovery and Campaign Management System.

## 🚀 Features

- **Authentication & Authorization** - JWT-based auth with role-based access control
- **Creator Management** - Save, organize, and manage creator profiles
- **Campaign Management** - Create and manage influencer marketing campaigns
- **Outreach Automation** - Automated email campaigns to creators
- **Application System** - Creators can apply to campaigns
- **Role-based Access** - Support for Brands, Creators, Agencies, and Admins

## 🛠 Technology Stack

- **Node.js** with Express.js
- **JWT** for authentication
- **bcryptjs** for password hashing
- **CORS** for cross-origin requests
- **Helmet** for security headers
- **Morgan** for logging
- **Rate limiting** for API protection

## 📂 Project Structure

```
backend/
├── src/
│   ├── controllers/     # Route controllers (future)
│   ├── middleware/      # Custom middleware
│   │   └── auth.js      # Authentication middleware
│   ├── routes/          # API routes
│   │   ├── auth.js      # Authentication routes
│   │   ├── creators.js  # Creator management
│   │   ├── campaigns.js # Campaign management
│   │   └── outreach.js  # Outreach automation
│   ├── models/          # Database models (future)
│   ├── services/        # Business logic services (future)
│   ├── utils/           # Utility functions (future)
│   ├── config/          # Configuration files (future)
│   └── index.js         # Main server file
├── .env                 # Environment variables
├── .env.example         # Environment template
├── package.json         # Dependencies and scripts
└── README.md           # This file
```

## 🚦 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. **Clone the repository** (if not already done):
   ```bash
   git clone <repository-url>
   cd influencerflow/backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your values
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```

   The server will start on `http://localhost:5000`

### Environment Variables

```env
PORT=5000                                    # Server port
NODE_ENV=development                         # Environment
JWT_SECRET=your_jwt_secret_here              # JWT secret key
JWT_EXPIRES_IN=7d                           # JWT expiration
FRONTEND_URL=http://localhost:5173          # Frontend URL for CORS
```

## 📡 API Endpoints

### Authentication (`/api/auth`)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| POST | `/register` | Register new user | Public |
| POST | `/login` | User login | Public |
| GET | `/me` | Get current user | Private |
| PUT | `/profile` | Update profile | Private |

### Creators (`/api/creators`)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| GET | `/search` | Search creators (logs) | Public |
| POST | `/` | Save creator | Private |
| GET | `/` | Get saved creators | Private |
| GET | `/:id` | Get specific creator | Private |
| PUT | `/:id` | Update creator | Private |
| DELETE | `/:id` | Delete creator | Private |
| POST | `/lists` | Create creator list | Private |
| GET | `/lists` | Get creator lists | Private |

### Campaigns (`/api/campaigns`)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| POST | `/` | Create campaign | Brand/Agency |
| GET | `/` | Get campaigns | Private |
| GET | `/:id` | Get specific campaign | Private |
| PUT | `/:id` | Update campaign | Owner |
| DELETE | `/:id` | Delete campaign | Owner |
| POST | `/:id/apply` | Apply to campaign | Creator |
| PUT | `/:id/applications/:appId` | Update application | Owner |

### Outreach (`/api/outreach`)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| POST | `/campaigns` | Create outreach campaign | Brand/Agency |
| GET | `/campaigns` | Get outreach campaigns | Private |
| GET | `/campaigns/:id` | Get specific campaign | Private |
| POST | `/campaigns/:id/send` | Send emails | Private |
| GET | `/emails` | Get outreach emails | Private |
| PUT | `/emails/:id` | Update email status | Private |
| GET | `/stats` | Get outreach stats | Private |

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### User Roles

- **brand** - Can create campaigns, send outreach
- **creator** - Can apply to campaigns, manage profile
- **agency** - Same as brand, manages multiple clients
- **admin** - Full access to all resources

## 📝 API Response Format

All API responses follow this format:

```json
{
  "success": true|false,
  "message": "Description of the result",
  "data": {
    // Response data
  }
}
```

### Example Requests

#### Register User
```bash
curl -X POST http://localhost:5000/api/auth/register \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "name": "John Doe",
    "role": "brand",
    "company": "My Company"
  }'
```

#### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "demo@influencerflow.com",
    "password": "password123"
  }'
```

#### Save Creator
```bash
curl -X POST http://localhost:5000/api/creators \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer <your-token>" \\
  -d '{
    "channelName": "Tech Creator",
    "youtubeChannelUrl": "https://youtube.com/@techcreator",
    "subscriberCount": "1.2M",
    "categories": ["Technology", "Reviews"]
  }'
```

## 🧪 Testing

### Using the Demo Account

A demo account is pre-configured:
- **Email**: `demo@influencerflow.com`
- **Password**: `password123`
- **Role**: `brand`

### Health Check

Test if the server is running:
```bash
curl http://localhost:5000/health
```

## 🔄 Integration with Frontend

This backend is designed to work with the existing React frontend. The frontend handles:
- Creator search using Gemini AI
- YouTube API integration
- Real-time creator discovery

The backend provides:
- User authentication
- Data persistence
- Campaign management
- Outreach automation

## 🚀 Deployment

### Development
```bash
npm run dev  # Uses nodemon for auto-restart
```

### Production
```bash
npm start    # Standard Node.js start
```

### Environment Setup for Production
- Set `NODE_ENV=production`
- Use a strong JWT secret
- Configure proper CORS origins
- Set up database connection (when added)

## 🔮 Future Enhancements

- **Database Integration** (PostgreSQL/MongoDB)
- **Email Service Integration** (SendGrid/Mailgun)
- **Payment Processing** (Stripe)
- **File Upload** for media assets
- **Real-time Notifications** (Socket.io)
- **Analytics & Reporting**
- **Contract Management**
- **Performance Tracking**

## 📞 Support

For questions or issues:
1. Check the [API documentation](#api-endpoints)
2. Review the [example requests](#example-requests)
3. Open an issue in the repository

---

**Note**: This backend currently uses in-memory storage for demo purposes. In production, integrate with a proper database like PostgreSQL or MongoDB. 
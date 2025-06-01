const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const creatorRoutes = require('./routes/creators');
const campaignRoutes = require('./routes/campaigns');
const outreachRoutes = require('./routes/outreach');
const socialbladeRoutes = require('./routes/socialblade');
const automationRoutes = require('./routes/automation');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// CORS configuration
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://influencerflow.vercel.app'
  ],
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use(morgan('combined'));

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to InfluencerFlow API',
    version: '1.0.4',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      creators: '/api/creators', 
      campaigns: '/api/campaigns',
      outreach: '/api/outreach',
      automation: '/api/automation'
    },
    docs: 'https://github.com/sanjaymalladi/influencerflow',
    frontend: 'https://influencerflow.vercel.app'
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'InfluencerFlow API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    port: PORT
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/creators', creatorRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/outreach', outreachRoutes);
app.use('/api/socialblade', socialbladeRoutes);
app.use('/api/automation', automationRoutes);

// Setup endpoint for demo data (admin only)
app.post('/api/setup-demo', async (req, res) => {
  try {
    const { createDemoUserAndData } = require('../create-demo-user-and-data');
    const result = await createDemoUserAndData();
    
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error setting up demo data: ' + error.message
    });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  // Default error
  let error = { ...err };
  error.message = err.message;

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = { message, status: 404 };
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = { message, status: 400 };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message);
    error = { message, status: 400 };
  }

  res.status(error.status || 500).json({
    success: false,
    error: error.message || 'Server Error'
  });
});

// Start server with better error handling
const server = app.listen(PORT, () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const apiUrl = isProduction ? 'https://influencerflow.onrender.com' : `http://localhost:${PORT}`;
  const frontendUrl = process.env.FRONTEND_URL || 'https://influencerflow.vercel.app';
  
  console.log(`🚀 InfluencerFlow API Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Frontend URL: ${frontendUrl}`);
  console.log(`🔗 API URL: ${apiUrl}`);
  console.log(`💚 Health Check: ${apiUrl}/health`);
});

// Handle server errors
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use!`);
    console.log(`💡 Try one of these solutions:`);
    console.log(`   1. Kill processes using port ${PORT}: taskkill /F /IM node.exe`);
    console.log(`   2. Use a different port by setting PORT environment variable`);
    console.log(`   3. Wait a moment and try again`);
    process.exit(1);
  } else {
    console.error('❌ Server error:', err);
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('\n👋 SIGINT received. Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Process terminated');
    process.exit(0);
  });
}); 
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const gmailService = require('../services/gmailService');

const router = express.Router();

// Mock user database (replace with real database later)
let users = [
  {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'demo@influencerflow.com',
    password: '$2a$12$unqrPixbdVQ4H5AkHgjl6u3X9Sg11/WbJi5CnmvgiNYcBEHa96Dnm', // "password123"
    name: 'Demo User',
    role: 'admin',
    company: 'Demo Company',
    createdAt: new Date().toISOString()
  }
];

// Generate JWT token
const generateToken = (user) => {
  console.log('Generating token for user:', user.email);
  console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, role, company } = req.body;

    // Validation
    if (!email || !password || !name || !role) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email, password, name, and role'
      });
    }

    // Check if user already exists
    const existingUser = users.find(user => user.email === email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Validate role
    const validRoles = ['brand', 'creator', 'agency', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be one of: brand, creator, agency, admin'
      });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new user
    const newUser = {
      id: uuidv4(),
      email,
      password: hashedPassword,
      name,
      role,
      company: company || null,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);

    // Generate token
    const token = generateToken(newUser);

    // Remove password from response
    const { password: _, ...userWithoutPassword } = newUser;

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: userWithoutPassword,
        token
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', async (req, res) => {
  try {
    console.log('Login attempt:', req.body.email);
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      console.log('Missing email or password');
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Find user
    const user = users.find(u => u.email === email);
    console.log('User found:', !!user);
    if (!user) {
      console.log('User not found for email:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check password
    console.log('Checking password...');
    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log('Password valid:', isPasswordValid);
    if (!isPasswordValid) {
      console.log('Invalid password for user:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate token
    console.log('Generating token...');
    const token = generateToken(user);
    console.log('Token generated, length:', token.length);

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    console.log('Login successful for:', email);
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: userWithoutPassword,
        token
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user profile
// @access  Private
router.get('/me', authenticateToken, (req, res) => {
  try {
    const user = users.find(u => u.id === req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      data: {
        user: userWithoutPassword
      }
    });

  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching profile'
    });
  }
});

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', authenticateToken, (req, res) => {
  try {
    const { name, company } = req.body;

    const userIndex = users.findIndex(u => u.id === req.user.id);
    if (userIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update user
    if (name) users[userIndex].name = name;
    if (company !== undefined) users[userIndex].company = company;
    users[userIndex].updatedAt = new Date().toISOString();

    const { password: _, ...userWithoutPassword } = users[userIndex];

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: userWithoutPassword
      }
    });

  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating profile'
    });
  }
});

// @route   GET /api/auth/gmail
// @desc    Get Gmail OAuth URL for authentication
// @access  Private (Admin only)
router.get('/gmail', authenticateToken, authorizeRole('admin'), (req, res) => {
  try {
    const authUrl = gmailService.getAuthUrl();
    res.json({
      success: true,
      data: { authUrl },
      message: 'Gmail OAuth URL generated'
    });
  } catch (error) {
    console.error('Gmail OAuth URL error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating Gmail OAuth URL'
    });
  }
});

// @route   GET /api/auth/gmail/callback
// @desc    Handle Gmail OAuth callback
// @access  Public (OAuth callback)
router.get('/gmail/callback', async (req, res) => {
  try {
    const { code } = req.query;
    
    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Authorization code required'
      });
    }

    const tokens = await gmailService.authenticate(code);
    
    res.json({
      success: true,
      message: '✅ Gmail authenticated successfully! Check server console for refresh token to add to .env',
      data: { 
        refreshToken: tokens.refresh_token,
        status: gmailService.getStatus()
      }
    });
  } catch (error) {
    console.error('Gmail OAuth callback error:', error);
    res.status(500).json({
      success: false,
      message: 'Gmail authentication failed: ' + error.message
    });
  }
});

// @route   GET /api/auth/gmail/status
// @desc    Get Gmail authentication status
// @access  Private (Admin only)
router.get('/gmail/status', authenticateToken, authorizeRole('admin'), (req, res) => {
  try {
    const status = gmailService.getStatus();
    res.json({
      success: true,
      data: status,
      message: 'Gmail status retrieved'
    });
  } catch (error) {
    console.error('Gmail status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting Gmail status'
    });
  }
});

module.exports = router; 
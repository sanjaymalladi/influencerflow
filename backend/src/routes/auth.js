const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const gmailService = require('../services/gmailService');
const { createOAuth2Client } = require('../services/gmailService');
const { supabase } = require('../config/supabase');

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
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { name, company, avatar_url } = req.body;
    const userId = req.user.id;

    // Mock DB update:
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    if (name) users[userIndex].name = name;
    if (company !== undefined) users[userIndex].company = company;
    if (avatar_url !== undefined) users[userIndex].avatar_url = avatar_url;
    users[userIndex].updated_at = new Date().toISOString();
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
      message: error.message || 'Server error updating profile'
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
// @desc    Callback URL for Gmail OAuth2 flow
// @access  Public (but processes authenticated user context via state)
router.get('/gmail/callback', async (req, res) => {
  const queryCode = req.query.code;
  const queryState = req.query.state;
  const queryOAuthError = req.query.error;

  const frontendRedirectBase = process.env.FRONTEND_URL || 'http://localhost:5173';

  if (queryOAuthError) {
    console.error('Gmail OAuth callback error:', queryOAuthError);
    return res.redirect(`${frontendRedirectBase}/settings?gmail_error=${encodeURIComponent(queryOAuthError)}`);
  }

  if (!queryCode) {
    console.error('No code received in Gmail OAuth callback');
    return res.redirect(`${frontendRedirectBase}/settings?gmail_error=authorization_code_missing`);
  }

  try {
    let userId;
    if (queryState) {
      try {
        const decodedState = JSON.parse(Buffer.from(queryState, 'base64url').toString('utf-8'));
        userId = decodedState.userId;
      } catch (e) {
        console.error('Invalid state parameter:', e);
        return res.redirect(`${frontendRedirectBase}/settings?gmail_error=invalid_state`);
      }
    }

    if (!userId) {
      console.error('User ID not found in state parameter.');
      return res.redirect(`${frontendRedirectBase}/settings?gmail_error=user_id_missing_in_state`);
    }

    const oauth2Client = createOAuth2Client();
    const { tokens } = await oauth2Client.getToken(queryCode);
    // oauth2Client.setCredentials(tokens); // Not strictly needed here if we only store them

    console.log(`Received Gmail tokens for user ${userId}:`, {
      accessToken: !!tokens.access_token,
      refreshToken: !!tokens.refresh_token,
      expiresIn: tokens.expiry_date
    });

    const updateData = {
      gmail_access_token: tokens.access_token,
      // gmail_refresh_token: tokens.refresh_token, // Only update refresh token IF a new one is granted
      gmail_token_expiry: tokens.expiry_date,
      gmail_last_sync: new Date().toISOString()
    };
    if (tokens.refresh_token) { // Google sometimes doesn't send a new refresh token if one is already active
        updateData.gmail_refresh_token = tokens.refresh_token;
    }

    // Mock DB update:
    const userIndex = users.findIndex(u => u.id === userId);
    let dbError = null;
    if (userIndex !== -1) {
      users[userIndex] = { ...users[userIndex], ...updateData };
      // Ensure existing refresh token is not overwritten with undefined if a new one isn't provided
      if (!updateData.gmail_refresh_token && users[userIndex].gmail_refresh_token) {
          updateData.gmail_refresh_token = users[userIndex].gmail_refresh_token;
      }
      users[userIndex] = { ...users[userIndex], ...updateData }; 
      console.log('Mock DB: Updated user with Gmail tokens:', users[userIndex].email);
    } else {
      dbError = { message: 'User not found in mock DB for token storage' };
    }

    if (dbError) {
      console.error('Failed to store Gmail tokens in DB:', dbError);
      return res.redirect(`${frontendRedirectBase}/settings?gmail_error=db_token_storage_failed`);
    }

    console.log(`Gmail tokens stored successfully for user ${userId}`);
    res.redirect(`${frontendRedirectBase}/settings?gmail_success=true`);

  } catch (error) {
    console.error('Error exchanging Gmail code for tokens or storing them:', error.response ? error.response.data : error);
    const errorMessage = error.message || 'token_exchange_failed';
    res.redirect(`${frontendRedirectBase}/settings?gmail_error=${encodeURIComponent(errorMessage)}`);
  }
});

// @route   POST /api/auth/gmail/disconnect
// @desc    Disconnect Gmail and remove tokens
// @access  Private
router.post('/gmail/disconnect', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Mock DB fetch & update:
    const userIndex = users.findIndex(u => u.id === userId);
    let dbError = null;

    if (userIndex === -1) {
        return res.status(404).json({ success: false, message: 'User not found.' });
    }
    const user = users[userIndex];

    if (user.gmail_refresh_token) {
      try {
        const oauth2Client = createOAuth2Client();
        // It's important to set the credentials on the client IF you have an access token that can be used to make the revoke call
        // However, revokeToken typically only needs the token itself (refresh or access).
        // For refresh token revocation, often it's just the token string.
        // The googleapis library might handle this a bit differently, let's assume revokeToken(string) is what's needed.
        await oauth2Client.revokeToken(user.gmail_refresh_token);
        console.log(`Gmail token revoked successfully for user ${userId}`);
      } catch (revokeError) {
        console.warn('Failed to revoke Gmail token (it might have been already invalid or expired):', revokeError.message);
        // Continue to clear tokens from DB even if revocation fails
      }
    }

    // Clear tokens from the mock DB
    users[userIndex].gmail_access_token = null;
    users[userIndex].gmail_refresh_token = null;
    users[userIndex].gmail_token_expiry = null;
    users[userIndex].gmail_last_sync = null;
    console.log('Mock DB: Cleared Gmail tokens for user:', users[userIndex].email);
    
    // In real app, update Supabase here to set fields to null

    res.json({ success: true, message: 'Gmail disconnected successfully.' });

  } catch (error) {
    console.error('Error disconnecting Gmail:', error);
    res.status(500).json({ success: false, message: 'Server error disconnecting Gmail.' });
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

// --- Gmail OAuth Routes ---

const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify', 
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
];

// @route   GET /api/auth/gmail/connect
// @desc    Initiate Gmail OAuth2 flow
// @access  Private (User must be logged in)
router.get('/gmail/connect', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID not found in token.'});
    }

    const oauth2Client = createOAuth2Client(); 

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline', 
      scope: GMAIL_SCOPES,
      prompt: 'consent', 
      state: Buffer.from(JSON.stringify({ userId })).toString('base64url') 
    });

    console.log(`Redirecting user ${userId} to Gmail auth URL: ${authUrl}`);
    res.redirect(authUrl);

  } catch (error) {
    console.error('Error initiating Gmail OAuth:', error);
    res.status(500).json({ success: false, message: 'Failed to initiate Gmail connection.' });
  }
});

module.exports = router; 
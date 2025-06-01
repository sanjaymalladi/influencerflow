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
  const { code, state, error: oauthError } = req.query;
  const userId = state; // Retrieve userId from state

  if (oauthError) {
    console.error('Error from Google OAuth:', oauthError);
    return res.status(400).redirect('/error?message=Gmail+authentication+failed'); // Redirect to an error page on your frontend
  }

  if (!code || !userId) {
    console.error('Missing code or state from Google OAuth callback');
    return res.status(400).redirect('/error?message=Invalid+Gmail+callback');
  }

  console.log(`Gmail OAuth callback received for user ID (from state): ${userId} with code: ${code}`)

  try {
    const oAuth2Client = createOAuth2Client();
    const { tokens } = await oAuth2Client.getToken(code);
    console.log('Tokens received from Google:', { hasAccessToken: !!tokens.access_token, hasRefreshToken: !!tokens.refresh_token, expiry_date: tokens.expiry_date });

    // Store tokens in Supabase users table
    if (supabase) {
      const updatePayload = {
        gmail_access_token: tokens.access_token,
        gmail_token_expiry: tokens.expiry_date,
        gmail_last_sync: new Date().toISOString(),
      };
      if (tokens.refresh_token) { // Refresh token is not always sent, only store if received
        updatePayload.gmail_refresh_token = tokens.refresh_token;
      }

      const { error: updateError } = await supabase
        .from('users')
        .update(updatePayload)
        .eq('id', userId);

      if (updateError) {
        console.error(`Supabase error updating tokens for user ${userId}:`, updateError);
        // Even if DB update fails, log it but consider the connection made for now, or redirect to error
        return res.status(500).redirect('/error?message=Failed+to+save+Gmail+connection');
      }
      console.log(`Successfully stored Gmail tokens in Supabase for user ${userId}`);
    } else {
      // Fallback to mock users array IF NEEDED (but ideally should fail if Supabase isn't up)
      console.warn('Supabase client not available. Storing tokens in mock user array (NOT RECOMMENDED FOR PRODUCTION)');
      const userIndex = users.findIndex(u => u.id === userId);
      if (userIndex !== -1) {
        users[userIndex].gmail_access_token = tokens.access_token;
        if (tokens.refresh_token) {
            users[userIndex].gmail_refresh_token = tokens.refresh_token;
        }
        users[userIndex].gmail_token_expiry = tokens.expiry_date;
        users[userIndex].gmail_last_sync = new Date().toISOString();
        console.log(`Stored Gmail tokens in mock user array for user ${userId}`);
      } else {
        console.error(`User with ID ${userId} not found in mock array during Gmail callback.`);
        return res.status(404).redirect('/error?message=User+not+found+after+Gmail+auth');
      }
    }

    // Redirect to a success page on your frontend
    // Example: res.redirect('http://localhost:3000/dashboard?gmail_connected=true');
    res.redirect('/gmail-success'); // Simple success page for now

  } catch (error) {
    console.error('Error exchanging code for tokens or updating DB:', error.message);
    // Check if error is from Google (e.g. oAuth2Client.getToken)
    if (error.response && error.response.data) {
        console.error('Google API Error Details:', error.response.data);
    }
    res.status(500).redirect('/error?message=Error+processing+Gmail+authentication');
  }
});

// @route   POST /api/auth/gmail/disconnect
// @desc    Disconnect Gmail and remove tokens
// @access  Private
router.post('/gmail/disconnect', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  console.log(`Attempting to disconnect Gmail for user ${userId}`);

  try {
    let userTokens = null;
    // Fetch current refresh token from Supabase to attempt revocation
    if (supabase) {
        const { data: user, error: fetchError } = await supabase
            .from('users')
            .select('gmail_refresh_token')
            .eq('id', userId)
            .single();
        if (fetchError) {
            console.error('Error fetching user refresh token for disconnect:', fetchError.message);
            // Proceed to clear tokens even if fetch fails
        } else if (user && user.gmail_refresh_token) {
            userTokens = { refresh_token: user.gmail_refresh_token };
        }
    }

    if (userTokens && userTokens.refresh_token) {
      const oAuth2Client = createOAuth2Client();
      oAuth2Client.setCredentials(userTokens); // Only refresh token is needed for revocation
      try {
        await oAuth2Client.revokeToken(userTokens.refresh_token);
        console.log(`Successfully revoked Gmail token for user ${userId}`);
      } catch (revokeError) {
        console.error(`Failed to revoke Gmail token for user ${userId}:`, revokeError.message);
        // Don't block clearing tokens in DB if revocation fails
      }
    }

    // Clear Gmail tokens from Supabase users table
    if (supabase) {
      const { error: updateError } = await supabase
        .from('users')
        .update({
          gmail_access_token: null,
          gmail_refresh_token: null,
          gmail_token_expiry: null,
          gmail_last_sync: null
        })
        .eq('id', userId);

      if (updateError) {
        console.error(`Supabase error clearing tokens for user ${userId}:`, updateError);
        return res.status(500).json({ success: false, message: 'Error clearing Gmail connection details.' });
      }
      console.log(`Successfully cleared Gmail tokens in Supabase for user ${userId}`);
    } else {
        console.warn('Supabase client not available. Clearing tokens from mock user array (NOT RECOMMENDED FOR PRODUCTION)');
        const userIndex = users.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
            users[userIndex].gmail_access_token = null;
            users[userIndex].gmail_refresh_token = null;
            users[userIndex].gmail_token_expiry = null;
            users[userIndex].gmail_last_sync = null;
            console.log(`Cleared Gmail tokens in mock user array for user ${userId}`);
        } else {
            console.error(`User with ID ${userId} not found in mock array during Gmail disconnect.`);
            // Still return success as there's nothing to clear
        }
    }

    res.json({ success: true, message: 'Gmail account disconnected successfully.' });

  } catch (error) {
    console.error('Error disconnecting Gmail account:', error.message);
    res.status(500).json({ success: false, message: 'Server error disconnecting Gmail account' });
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
    const userId = req.user.id; // Get userId from authenticated session
    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID not found in token.' });
    }

    const oAuth2Client = createOAuth2Client();
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent', // Important to get a refresh token every time
      scope: ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.send'],
      state: userId, // Pass userId in state to link tokens on callback
    });
    console.log('Generated Gmail Auth URL:', authUrl);
    res.redirect(authUrl);
  } catch (error) {
    console.error('Error initiating Gmail auth:', error);
    res.status(500).json({ success: false, message: 'Error initiating Gmail authentication' });
  }
});

module.exports = router; 
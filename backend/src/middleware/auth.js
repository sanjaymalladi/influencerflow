const jwt = require('jsonwebtoken');
const { supabase } = require('../config/supabase');

// Middleware to verify JWT token (keeping for backward compatibility)
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    // First try Supabase JWT verification
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (user && !error) {
      // Supabase user found, get additional profile info
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      req.user = {
        id: user.id,
        email: user.email,
        name: profile?.name || user.user_metadata?.name || 'User',
        role: profile?.role || 'brand',
        company: profile?.company,
        isSupabaseUser: true
      };
      return next();
    }

    // Fallback to JWT verification for backward compatibility
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(403).json({
          success: false,
          message: 'Invalid or expired token'
        });
      }
      
      req.user = {
        ...user,
        isSupabaseUser: false
      };
      next();
    });

  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
};

// Middleware to check user role
const authorizeRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

// Optional authentication - proceeds even if no token
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      req.user = null;
      return next();
    }

    // Try Supabase first
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (user && !error) {
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      req.user = {
        id: user.id,
        email: user.email,
        name: profile?.name || user.user_metadata?.name || 'User',
        role: profile?.role || 'brand',
        company: profile?.company,
        isSupabaseUser: true
      };
      return next();
    }

    // Fallback to JWT
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        req.user = null;
      } else {
        req.user = {
          ...user,
          isSupabaseUser: false
        };
      }
      next();
    });

  } catch (error) {
    console.error('Optional auth error:', error);
    req.user = null;
    next();
  }
};

// Supabase-specific middleware for direct Supabase auth
const supabaseAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Supabase access token required'
      });
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(403).json({
        success: false,
        message: 'Invalid Supabase token'
      });
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    req.user = {
      id: user.id,
      email: user.email,
      name: profile?.name || user.user_metadata?.name || 'User',
      role: profile?.role || 'brand',
      company: profile?.company,
      isSupabaseUser: true
    };

    next();

  } catch (error) {
    console.error('Supabase auth error:', error);
    return res.status(500).json({
      success: false,
      message: 'Supabase authentication error'
    });
  }
};

module.exports = {
  authenticateToken,
  authorizeRole,
  optionalAuth,
  supabaseAuth
}; 
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// Initialize clients with fallback handling
let supabase = null;
let supabaseAdmin = null;

try {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('⚠️ Supabase environment variables not found. Using fallback mode.');
    console.warn('⚠️ SUPABASE_URL:', supabaseUrl ? 'SET' : 'MISSING');
    console.warn('⚠️ SUPABASE_ANON_KEY:', supabaseAnonKey ? 'SET' : 'MISSING');
    console.warn('⚠️ SUPABASE_SERVICE_KEY:', supabaseServiceKey ? 'SET' : 'MISSING');
  } else {
    // Client for user operations (with RLS)
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    console.log('✅ Supabase client initialized');

    // Admin client for server operations (bypasses RLS)
    if (supabaseServiceKey) {
      supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });
      console.log('✅ Supabase admin client initialized');
    } else {
      console.warn('⚠️ Supabase service key not available - admin operations limited');
    }
  }
} catch (error) {
  console.error('❌ Supabase initialization error:', error.message);
}

module.exports = {
  supabase,
  supabaseAdmin
}; 
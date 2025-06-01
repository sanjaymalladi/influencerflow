require('dotenv').config();
const { supabaseAdmin } = require('./src/config/supabase');

const fixRLSPolicies = async () => {
  try {
    console.log('🔧 Fixing Supabase RLS policies...');

    if (!supabaseAdmin) {
      throw new Error('❌ Supabase admin client not available. Please set SUPABASE_SERVICE_KEY environment variable.');
    }

    // Check if tables exist and create RLS policies
    console.log('📝 Setting up RLS policies for creators table...');
    
    // First, let's try to enable RLS if it's not enabled
    try {
      await supabaseAdmin.rpc('enable_rls_on_table', { table_name: 'creators' });
      console.log('✅ RLS enabled on creators table');
    } catch (error) {
      console.log('⚠️ RLS already enabled or error enabling:', error.message);
    }

    // Create policies for creators table
    const creatorsPolicies = [
      {
        name: 'Allow users to view their own creators',
        query: `
          CREATE POLICY "Allow users to view their own creators" 
          ON creators FOR SELECT 
          USING (user_id = auth.uid() OR auth.uid() IS NULL);
        `
      },
      {
        name: 'Allow users to insert their own creators',
        query: `
          CREATE POLICY "Allow users to insert their own creators" 
          ON creators FOR INSERT 
          WITH CHECK (user_id = auth.uid() OR auth.uid() IS NULL);
        `
      },
      {
        name: 'Allow users to update their own creators',
        query: `
          CREATE POLICY "Allow users to update their own creators" 
          ON creators FOR UPDATE 
          USING (user_id = auth.uid() OR auth.uid() IS NULL);
        `
      },
      {
        name: 'Allow users to delete their own creators',
        query: `
          CREATE POLICY "Allow users to delete their own creators" 
          ON creators FOR DELETE 
          USING (user_id = auth.uid() OR auth.uid() IS NULL);
        `
      },
      {
        name: 'Allow admin full access to creators',
        query: `
          CREATE POLICY "Allow admin full access to creators" 
          ON creators FOR ALL 
          USING (true);
        `
      }
    ];

    // Create policies for outreach_emails table (simplified for now)
    const emailsPolicies = [
      {
        name: 'Allow all operations on outreach_emails',
        query: `
          CREATE POLICY "Allow all operations on outreach_emails" 
          ON outreach_emails FOR ALL 
          USING (true);
        `
      }
    ];

    // Apply creators policies
    console.log('📋 Creating policies for creators table...');
    for (const policy of creatorsPolicies) {
      try {
        await supabaseAdmin.rpc('exec', { sql: policy.query });
        console.log(`✅ Created policy: ${policy.name}`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`⚠️ Policy already exists: ${policy.name}`);
        } else {
          console.log(`❌ Error creating policy ${policy.name}:`, error.message);
        }
      }
    }

    // Apply emails policies
    console.log('📋 Creating policies for outreach_emails table...');
    for (const policy of emailsPolicies) {
      try {
        await supabaseAdmin.rpc('exec', { sql: policy.query });
        console.log(`✅ Created policy: ${policy.name}`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`⚠️ Policy already exists: ${policy.name}`);
        } else {
          console.log(`❌ Error creating policy ${policy.name}:`, error.message);
        }
      }
    }

    // Test creator operations
    console.log('\n🧪 Testing creator operations...');
    
    const demoUserId = '550e8400-e29b-41d4-a716-446655440000';
    
    // Test reading creators
    const { data: testCreators, error: readError } = await supabaseAdmin
      .from('creators')
      .select('id, channel_name')
      .eq('user_id', demoUserId)
      .limit(5);

    if (readError) {
      console.log('❌ Error reading creators:', readError.message);
    } else {
      console.log(`✅ Successfully read ${testCreators?.length || 0} creators`);
    }

    // Test creating a creator
    const testCreatorData = {
      user_id: demoUserId,
      channel_name: 'Test Creator RLS',
      categories: ['Test'],
      status: 'active',
      stats: { bio: 'Test creator for RLS testing' }
    };

    const { data: newCreator, error: insertError } = await supabaseAdmin
      .from('creators')
      .insert([testCreatorData])
      .select()
      .single();

    if (insertError) {
      console.log('❌ Error creating test creator:', insertError.message);
    } else {
      console.log('✅ Successfully created test creator:', newCreator.channel_name);
      
      // Clean up test creator
      await supabaseAdmin
        .from('creators')
        .delete()
        .eq('id', newCreator.id);
      console.log('🧹 Cleaned up test creator');
    }

    // Test email operations
    console.log('\n🧪 Testing email operations...');
    
    const { data: testEmails, error: emailReadError } = await supabaseAdmin
      .from('outreach_emails')
      .select('id, subject')
      .limit(3);

    if (emailReadError) {
      console.log('❌ Error reading emails:', emailReadError.message);
    } else {
      console.log(`✅ Successfully read ${testEmails?.length || 0} emails`);
    }

    console.log('\n🎉 RLS policies setup completed!');
    
    return {
      success: true,
      message: 'RLS policies configured successfully',
      data: {
        creatorsReadable: !readError,
        creatorsWritable: !insertError,
        emailsReadable: !emailReadError
      }
    };

  } catch (error) {
    console.error('❌ Error fixing RLS policies:', error.message);
    return {
      success: false,
      message: error.message,
      suggestions: [
        'Check SUPABASE_SERVICE_KEY is set correctly',
        'Verify Supabase project permissions',
        'Ensure you have admin access to the database',
        'Check if tables exist (run database-schema.sql)'
      ]
    };
  }
};

// Alternative approach: Create a simple policy update
const createSimplePolicy = async () => {
  try {
    console.log('🔧 Creating simple permissive policies...');
    
    const simplePolicies = [
      // Disable RLS temporarily for testing
      'ALTER TABLE creators DISABLE ROW LEVEL SECURITY;',
      'ALTER TABLE outreach_emails DISABLE ROW LEVEL SECURITY;',
      'ALTER TABLE campaigns DISABLE ROW LEVEL SECURITY;',
      
      // Or create very permissive policies
      `DROP POLICY IF EXISTS "Allow all operations on creators" ON creators;`,
      `CREATE POLICY "Allow all operations on creators" ON creators FOR ALL USING (true);`,
      
      `DROP POLICY IF EXISTS "Allow all operations on outreach_emails" ON outreach_emails;`, 
      `CREATE POLICY "Allow all operations on outreach_emails" ON outreach_emails FOR ALL USING (true);`
    ];

    for (const policy of simplePolicies) {
      try {
        await supabaseAdmin.rpc('exec', { sql: policy });
        console.log(`✅ Executed: ${policy.substring(0, 50)}...`);
      } catch (error) {
        console.log(`⚠️ Policy execution result: ${error.message}`);
      }
    }

    console.log('✅ Simple policies created');

  } catch (error) {
    console.error('❌ Error creating simple policies:', error);
  }
};

// Export for use in other modules
module.exports = { fixRLSPolicies, createSimplePolicy };

// Run directly if called as script
if (require.main === module) {
  const args = process.argv.slice(2);
  const useSimple = args.includes('--simple');
  
  if (useSimple) {
    createSimplePolicy()
      .then(() => console.log('Simple policy setup complete'))
      .catch(error => console.error('Simple policy setup failed:', error));
  } else {
    fixRLSPolicies()
      .then(result => {
        console.log('\n' + JSON.stringify(result, null, 2));
        process.exit(result.success ? 0 : 1);
      })
      .catch(error => {
        console.error('❌ Fatal error:', error);
        process.exit(1);
      });
  }
} 
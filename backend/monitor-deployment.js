const axios = require('axios');

const monitorDeployment = async () => {
  console.log('🔍 Monitoring Render deployment status...\n');
  
  const checkDeployment = async () => {
    try {
      console.log(`[${new Date().toISOString()}] Checking production API...`);
      
      const response = await axios.get('https://influencerflow.onrender.com/api/outreach/emails', {
        headers: {
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjU1MGU4NDAwLWUyOWItNDFkNC1hNzE2LTQ0NjY1NTQ0MDAwMCIsImVtYWlsIjoiZGVtb0BpbmZsdWVuY2VyZmxvdy5jb20iLCJyb2xlIjoiYWRtaW4iLCJuYW1lIjoiRGVtbyBVc2VyIiwiaWF0IjoxNzQ4Nzc4MTIyLCJleHAiOjE3NDkzODI5MjJ9.VJBoAMGekNRwopaZsR9w2XVVqWOr0eJJ13mgbZ4bI-A'
        }
      });
      
      const emails = response.data.data.emails;
      
      if (emails.length > 0) {
        const firstEmail = emails[0];
        const isUUID = typeof firstEmail.id === 'string' && firstEmail.id.includes('-');
        
        if (isUUID) {
          console.log('🎉 DEPLOYMENT UPDATED! API now using Supabase with UUID IDs');
          console.log(`✅ Found ${emails.length} emails with UUID-based IDs`);
          console.log(`   Sample ID: ${firstEmail.id}`);
          return true;
        } else {
          console.log(`⏳ Still using old system: ${emails.length} emails with numeric IDs`);
          console.log(`   Sample ID: ${firstEmail.id} (numeric)`);
          return false;
        }
      } else {
        console.log('⚠️ No emails returned from API');
        return false;
      }
      
    } catch (error) {
      console.log(`❌ Error checking API: ${error.response?.status || 'Network error'}`);
      return false;
    }
  };
  
  // Check immediately
  const isUpdated = await checkDeployment();
  
  if (isUpdated) {
    console.log('\n🚀 Deployment is complete! You can now try sending emails again.');
    return;
  }
  
  // Monitor every 30 seconds for up to 10 minutes
  console.log('\n⏳ Waiting for deployment to complete...');
  console.log('💡 This typically takes 3-5 minutes for Render deployments');
  
  let attempts = 0;
  const maxAttempts = 20; // 10 minutes with 30-second intervals
  
  const interval = setInterval(async () => {
    attempts++;
    
    if (attempts > maxAttempts) {
      console.log('\n⏰ Timeout reached. Deployment may be taking longer than expected.');
      console.log('💡 You can manually check: https://influencerflow.onrender.com/api/outreach/emails');
      clearInterval(interval);
      return;
    }
    
    const updated = await checkDeployment();
    
    if (updated) {
      console.log('\n🎉 SUCCESS! Deployment completed successfully!');
      console.log('✅ Your email sending should now work with proper creator lookup');
      clearInterval(interval);
    }
  }, 30000); // Check every 30 seconds
};

monitorDeployment(); 
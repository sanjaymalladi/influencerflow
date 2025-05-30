const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function testAPI() {
  console.log('🧪 Testing InfluencerFlow Backend API\n');

  try {
    // Test 1: Health check
    console.log('1. Testing health check...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health check passed:', healthResponse.data);
    console.log('');

    // Test 2: Register a new user
    console.log('2. Testing user registration...');
    const registerData = {
      email: `test${Date.now()}@example.com`,
      password: 'password123',
      name: 'Test User',
      role: 'brand',
      company: 'Test Company'
    };

    const registerResponse = await axios.post(`${BASE_URL}/api/auth/register`, registerData);
    console.log('✅ Registration successful:', registerResponse.data.message);
    const token = registerResponse.data.data.token;
    console.log('');

    // Test 3: Login with demo account
    console.log('3. Testing login with demo account...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'demo@influencerflow.com',
      password: 'password123'
    });
    console.log('✅ Login successful:', loginResponse.data.message);
    const demoToken = loginResponse.data.data.token;
    console.log('');

    // Test 4: Get current user profile
    console.log('4. Testing get user profile...');
    const profileResponse = await axios.get(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${demoToken}` }
    });
    console.log('✅ Profile fetched:', profileResponse.data.data.user.name);
    console.log('');

    // Test 5: Get creators
    console.log('5. Testing get creators...');
    const creatorsResponse = await axios.get(`${BASE_URL}/api/creators`, {
      headers: { Authorization: `Bearer ${demoToken}` }
    });
    console.log('✅ Creators fetched:', creatorsResponse.data.data.creators.length, 'creators found');
    console.log('');

    // Test 6: Save a new creator
    console.log('6. Testing save creator...');
    const creatorData = {
      channelName: 'Test Tech Creator',
      youtubeChannelUrl: 'https://youtube.com/@testtechcreator',
      bio: 'A test creator for API testing',
      subscriberCount: '500K',
      categories: ['Technology', 'Reviews'],
      typicalViews: '100K',
      engagementRate: '4.5%',
      dataSource: 'Manual'
    };

    const saveCreatorResponse = await axios.post(`${BASE_URL}/api/creators`, creatorData, {
      headers: { Authorization: `Bearer ${demoToken}` }
    });
    console.log('✅ Creator saved:', saveCreatorResponse.data.message);
    console.log('');

    // Test 7: Get campaigns
    console.log('7. Testing get campaigns...');
    const campaignsResponse = await axios.get(`${BASE_URL}/api/campaigns`, {
      headers: { Authorization: `Bearer ${demoToken}` }
    });
    console.log('✅ Campaigns fetched:', campaignsResponse.data.data.campaigns.length, 'campaigns found');
    console.log('');

    // Test 8: Create a new campaign
    console.log('8. Testing create campaign...');
    const campaignData = {
      name: 'Test Campaign API',
      description: 'This is a test campaign created via API',
      budget: 10000,
      startDate: '2024-02-01',
      endDate: '2024-02-29',
      goals: ['Brand Awareness', 'Product Reviews'],
      deliverables: [
        { type: 'Video Review', quantity: 2, price: 2000 },
        { type: 'Social Media Posts', quantity: 5, price: 500 }
      ]
    };

    const createCampaignResponse = await axios.post(`${BASE_URL}/api/campaigns`, campaignData, {
      headers: { Authorization: `Bearer ${demoToken}` }
    });
    console.log('✅ Campaign created:', createCampaignResponse.data.message);
    console.log('');

    // Test 9: Get outreach stats
    console.log('9. Testing get outreach stats...');
    const statsResponse = await axios.get(`${BASE_URL}/api/outreach/stats`, {
      headers: { Authorization: `Bearer ${demoToken}` }
    });
    console.log('✅ Outreach stats:', statsResponse.data.data.stats);
    console.log('');

    console.log('🎉 All API tests passed successfully!\n');
    console.log('📊 Summary:');
    console.log('- Health check: ✅');
    console.log('- User registration: ✅');
    console.log('- User login: ✅');
    console.log('- Profile access: ✅');
    console.log('- Creator management: ✅');
    console.log('- Campaign management: ✅');
    console.log('- Outreach features: ✅');

  } catch (error) {
    console.error('❌ API test failed:', error.response?.data || error.message);
    if (error.response?.status === 404 || error.code === 'ECONNREFUSED') {
      console.log('\n💡 Make sure the backend server is running on http://localhost:3001');
      console.log('   Run: cd backend && npm run dev');
    }
  }
}

// Run the tests
testAPI(); 
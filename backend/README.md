# InfluencerFlow Calling Agent

An AI-powered voice calling system for automated influencer negotiations using LiveKit, Sarvam AI, and Twilio.

## 🚀 Features

- **Voice Negotiations**: Automated phone-based negotiations with influencers
- **Multi-language Support**: Support for Indian languages via Sarvam AI
- **Real-time Communication**: LiveKit integration for seamless voice streaming
- **Intent Analysis**: AI-powered analysis of conversation intent and sentiment
- **Negotiation Strategies**: Multiple negotiation approaches (collaborative, competitive, accommodating, compromising)
- **Call Management**: Full call lifecycle management with status tracking
- **Transcript Generation**: Real-time conversation transcription and analysis

## 🛠 Tech Stack

- **Backend**: Node.js, Express.js
- **Voice Calling**: Twilio
- **Real-time Communication**: LiveKit
- **Speech Processing**: Sarvam AI (STT/TTS)
- **AI/LLM**: Google Gemini
- **Database**: MongoDB (optional)
- **Caching**: Redis (optional)

## 📋 Prerequisites

- Node.js 18.0+
- Twilio account with phone number
- Sarvam AI API key
- LiveKit server setup
- Google Gemini API key

## 🔧 Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp env.example .env
# Edit .env with your actual credentials
```

4. **Start the server**
```bash
# Development mode
npm run dev

# Production mode
npm start
```

## 🔑 Environment Configuration

Create a `.env` file with the following variables:

```env
# Server Configuration
PORT=3001
NODE_ENV=development
BASE_URL=http://localhost:3001

# Twilio Configuration
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Sarvam AI Configuration
SARVAM_API_KEY=your_sarvam_ai_api_key

# LiveKit Configuration
LIVEKIT_URL=wss://your-livekit-server.com
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret

# Google Gemini AI Configuration
GEMINI_API_KEY=your_gemini_api_key
```

## 📚 API Documentation

### Initiate Negotiation Call

**POST** `/api/calling/initiate`

Start a new negotiation call with an influencer.

```bash
curl -X POST http://localhost:3001/api/calling/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "creatorPhone": "+1234567890",
    "creatorName": "John Doe",
    "campaignTitle": "Summer Fashion Campaign",
    "negotiationContext": {
      "budget": 5000,
      "deliverables": ["Instagram posts", "Stories"],
      "timeline": "2 weeks"
    },
    "strategy": "collaborative"
  }'
```

**Response:**
```json
{
  "success": true,
  "callSid": "CA1234567890abcdef",
  "negotiationId": "NEG-1234567890",
  "roomName": "negotiation-1234567890",
  "creatorToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "status": "call_initiated"
}
```

### Get Active Calls

**GET** `/api/calling/active-calls`

Retrieve list of currently active calls.

```bash
curl http://localhost:3001/api/calling/active-calls
```

### Get Negotiation Details

**GET** `/api/calling/negotiation/:negotiationId`

Get detailed information about a specific negotiation.

```bash
curl http://localhost:3001/api/calling/negotiation/NEG-1234567890
```

### Process Audio

**POST** `/api/calling/process-audio`

Process audio data for speech-to-text and generate AI response.

```bash
curl -X POST http://localhost:3001/api/calling/process-audio \
  -H "Content-Type: application/json" \
  -d '{
    "audioData": "base64_encoded_audio_data",
    "languageCode": "en-IN",
    "negotiationId": "NEG-1234567890"
  }'
```

### End Negotiation

**POST** `/api/calling/end-negotiation/:negotiationId`

Manually end a negotiation session.

```bash
curl -X POST http://localhost:3001/api/calling/end-negotiation/NEG-1234567890 \
  -H "Content-Type: application/json" \
  -d '{"reason": "manual_end"}'
```

## 🎯 Usage Examples

### Basic Call Initiation

```javascript
const axios = require('axios');

const initiateCall = async () => {
  try {
    const response = await axios.post('http://localhost:3001/api/calling/initiate', {
      creatorPhone: '+91-9876543210',
      creatorName: 'Priya Sharma',
      campaignTitle: 'Diwali Special Campaign',
      negotiationContext: {
        budget: 25000,
        deliverables: ['Instagram Reels', 'Story Posts', 'IGTV'],
        timeline: '10 days',
        targetAudience: 'Fashion enthusiasts aged 18-35'
      },
      strategy: 'collaborative'
    });
    
    console.log('Call initiated:', response.data);
  } catch (error) {
    console.error('Error:', error.response.data);
  }
};

initiateCall();
```

### Monitor Call Status

```javascript
const getCallStatus = async (negotiationId) => {
  try {
    const response = await axios.get(`http://localhost:3001/api/calling/negotiation/${negotiationId}`);
    console.log('Negotiation status:', response.data.negotiation.status);
    console.log('Transcript:', response.data.negotiation.transcript);
  } catch (error) {
    console.error('Error:', error.response.data);
  }
};
```

## 🧠 AI Components

### Speech-to-Text (Sarvam AI)

The system uses Sarvam AI's speech recognition for:
- Multi-language support (Hindi, English, Tamil, Telugu, etc.)
- Code-mixed language processing
- Real-time transcription

### Text-to-Speech (Sarvam AI)

Natural voice synthesis with:
- Multiple voice options (Anushka, Manisha, Vidya, etc.)
- Emotional tone control
- Regional accent support

### Intent Analysis

The system analyzes conversation for:
- **Accept**: Agreement or positive response
- **Reject**: Disagreement or negative response  
- **Counteroffer**: Alternative proposal
- **Question**: Information seeking
- **Clarification**: Need for more details

### Negotiation Strategies

- **Collaborative**: Win-win approach
- **Competitive**: Maximize client value
- **Accommodating**: Flexible and understanding
- **Compromising**: Middle-ground solutions

## 🔄 Call Flow

1. **Initiation**: API call starts negotiation process
2. **Twilio Call**: Automated phone call to creator
3. **LiveKit Connection**: Real-time audio streaming setup
4. **AI Conversation**: Sarvam AI processes speech/generates responses
5. **Intent Analysis**: Gemini AI analyzes conversation context
6. **Response Generation**: Context-aware responses
7. **Call Completion**: Summary and next steps generation

## 🛡️ Security & Privacy

- All API endpoints are rate-limited
- Audio data is processed in real-time (not stored)
- Conversation transcripts can be encrypted
- GDPR-compliant data handling
- Secure token-based authentication for LiveKit

## 📊 Monitoring & Logging

The system provides comprehensive logging for:
- Call initiation and completion
- Speech processing results
- Intent analysis accuracy
- System performance metrics
- Error tracking and debugging

View logs:
```bash
curl http://localhost:3001/api/calling/logs
```

## 🔧 Troubleshooting

### Common Issues

1. **Call not connecting**
   - Check Twilio credentials
   - Verify phone number format
   - Ensure webhook URLs are accessible

2. **Speech recognition failing**
   - Verify Sarvam AI API key
   - Check audio format compatibility
   - Ensure stable internet connection

3. **LiveKit connection issues**
   - Confirm LiveKit server is running
   - Check API key/secret configuration
   - Verify firewall settings

### Debug Mode

Enable debug logging:
```env
LOG_LEVEL=debug
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Email: support@influencerflow.com
- Documentation: [Context7 Docs](https://context7.ai)

## 🚀 Deployment

### Production Setup

1. **Environment Variables**: Set all production credentials
2. **SSL Certificates**: Enable HTTPS for webhooks
3. **Database**: Configure MongoDB/Redis for persistence
4. **Monitoring**: Set up logging and monitoring tools
5. **Scaling**: Use PM2 or Docker for process management

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

### Health Check

**GET** `/api/health`

```bash
curl http://localhost:3001/api/health
```

---

**Built with ❤️ by the InfluencerFlow Team** 
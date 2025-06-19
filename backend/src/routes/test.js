const express = require('express');
const sendGridService = require('../services/sendGridService');

const router = express.Router();

// Simple test endpoint for sending emails
router.post('/send-simple-email', async (req, res) => {
  try {
    const { to, from, fromName, subject, body } = req.body;
    
    console.log(`📧 Test endpoint: Sending email to ${to}`);
    
    const result = await sendGridService.sendEmail({
      to,
      from,
      fromName,
      subject,
      body
    });
    
    res.json({
      success: true,
      messageId: result.messageId,
      statusCode: result.statusCode
    });
    
  } catch (error) {
    console.error('❌ Test email error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router; 
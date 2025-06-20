const express = require('express');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const emailService = require('../services/emailService');
const contractService = require('../services/contractService');
const paymentService = require('../services/paymentService');
const { v4: uuidv4 } = require('uuid');
const geminiAiService = require('../services/geminiAiService');

const router = express.Router();

// In-memory storage for demo (replace with database in production)
const campaignNegotiations = new Map();
const contractData = new Map();
const paymentRecords = new Map();

// @route   POST /api/automation/send-email
// @desc    Send real email for negotiations
// @access  Public (for real negotiation system)
router.post('/send-email', async (req, res) => {
  try {
    const { to, subject, message } = req.body;

    if (!to || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Please provide to, subject, and message fields'
      });
    }

    console.log('Sending negotiation email to:', to);
    
    const emailData = {
      to,
      subject,
      body: message,
      from: process.env.SENDGRID_FROM_EMAIL || 'malladisanjay29@gmail.com',
      fromName: process.env.SENDGRID_FROM_NAME || 'InfluencerFlow Team'
    };

    const result = await emailService.sendEmail(emailData);

    // Store the email for tracking
    const emailRecord = await emailService.storeOutreachEmail({
      campaignId: req.body.campaignId || 'unknown',
      creatorId: req.body.creatorId || 'unknown', 
      subject,
      body: message,
      status: 'sent',
      createdBy: '1', // Default user for now
      recipientEmail: to,
      messageId: result.messageId,
      provider: result.provider
    });

    res.json({
      success: true,
      message: 'Email sent successfully!',
      data: {
        to,
        subject,
        provider: result.provider,
        messageId: result.messageId,
        emailId: emailRecord.id,
        sentAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Email sending error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send email',
      error: error.message
    });
  }
});

// @route   POST /api/automation/send-outreach
// @desc    Send automated outreach emails
// @access  Private (Brand/Agency only)
router.post('/send-outreach', authenticateToken, authorizeRole('brand', 'agency', 'admin'), async (req, res) => {
  try {
    const { campaignId, creatorEmails, subject, messageTemplate, personalizations } = req.body;

    if (!campaignId || !creatorEmails || !subject || !messageTemplate) {
      return res.status(400).json({
        success: false,
        message: 'Please provide campaignId, creatorEmails, subject, and messageTemplate'
      });
    }

    const results = [];

    for (const creatorData of creatorEmails) {
      try {
        // Create a fresh copy of the template for each creator to avoid shared state issues
        let personalizedMessage = messageTemplate;
        if (personalizations && personalizations[creatorData.email]) {
          const personalization = personalizations[creatorData.email];
          // Create a new string instance for each creator
          personalizedMessage = String(messageTemplate)
            .replace(/{{creatorName}}/g, personalization.name || 'there')
            .replace(/{{platform}}/g, personalization.platform || 'social media')
            .replace(/{{followers}}/g, personalization.followers || 'your audience');
        } else {
          // If no personalization data available, use fallback values
          personalizedMessage = String(messageTemplate)
            .replace(/{{creatorName}}/g, creatorData.name || 'there')
            .replace(/{{platform}}/g, 'social media')
            .replace(/{{followers}}/g, 'your audience');
        }

        // Send email
        const emailResult = await emailService.sendEmail({
          to: creatorData.email,
          subject,
          body: personalizedMessage,
          from: process.env.DEFAULT_FROM_EMAIL || 'outreach@influencerflow.com'
        });

        results.push({
          email: creatorData.email,
          status: 'sent',
          messageId: emailResult.messageId,
          provider: emailResult.provider
        });

      } catch (error) {
        console.error(`Email send error for ${creatorData.email}:`, error);
        results.push({
          email: creatorData.email,
          status: 'failed',
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: 'Outreach emails processed',
      data: {
        campaignId,
        results,
        sentCount: results.filter(r => r.status === 'sent').length,
        failedCount: results.filter(r => r.status === 'failed').length
      }
    });

  } catch (error) {
    console.error('Outreach automation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error processing outreach'
    });
  }
});

// @route   POST /api/automation/check-replies
// @desc    Check for email replies from specific creator using SendGrid Activity API
// @access  Public (for testing)
router.post('/check-replies', async (req, res) => {
  try {
    const { originalSubject, creatorEmail } = req.body;

    if (!originalSubject || !creatorEmail) {
      return res.status(400).json({
        success: false,
        message: 'Please provide originalSubject and creatorEmail'
      });
    }

    console.log(`🔍 Checking for replies from ${creatorEmail} for subject: ${originalSubject}`);

    const replies = await emailService.checkReplies(originalSubject, creatorEmail);
    
    res.json({
      success: true,
      data: {
        creatorEmail,
        originalSubject,
        replies,
        replyCount: replies.length,
        hasNewReplies: replies.length > 0,
        latestReply: replies.length > 0 ? replies[0] : null,
        provider: 'sendgrid'
      }
    });

  } catch (error) {
    console.error('Reply check error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking replies',
      error: error.message
    });
  }
});

// @route   POST /api/automation/webhook/sendgrid-inbound
// @desc    Handle incoming emails from SendGrid Inbound Parse webhook
// @access  Public (webhook)
router.post('/webhook/sendgrid-inbound', async (req, res) => {
  try {
    console.log('📨 Received SendGrid inbound webhook');
    
    // SendGrid sends form data, not JSON
    const emailData = req.body;
    
    // Process the incoming email
    const sendGridService = require('../services/sendGridService');
    const processedEmail = await sendGridService.processInboundEmail(emailData);
    
    console.log(`📧 Processed inbound email from: ${processedEmail.from}`);
    console.log(`📧 Subject: ${processedEmail.subject}`);
    console.log(`📧 Is Reply: ${processedEmail.isReply}`);
    
    // If it's a reply to a campaign, trigger negotiation processing
    if (processedEmail.isReply && processedEmail.campaignId) {
      try {
        // Here you could trigger the negotiation agent to process the reply
        console.log(`🤝 Triggering negotiation processing for campaign: ${processedEmail.campaignId}`);
        
        // This would call your negotiation service to handle the reply
        // const negotiationService = require('../services/negotiationService');
        // await negotiationService.processReply(processedEmail);
        
      } catch (negotiationError) {
        console.error('❌ Error processing negotiation:', negotiationError);
      }
    }
    
    // Always respond with success to SendGrid
    res.status(200).json({
      success: true,
      message: 'Email processed successfully',
      emailId: processedEmail.id
    });

  } catch (error) {
    console.error('❌ Error processing SendGrid webhook:', error);
    
    // Still respond with success to prevent SendGrid retries
    res.status(200).json({
      success: false,
      message: 'Error processing email',
      error: error.message
    });
  }
});

// @route   POST /api/automation/setup-sendgrid-webhook
// @desc    Setup SendGrid Inbound Parse webhook configuration
// @access  Private (Admin only)
router.post('/setup-sendgrid-webhook', async (req, res) => {
  try {
    const { hostname, webhookUrl } = req.body;
    
    if (!hostname || !webhookUrl) {
      return res.status(400).json({
        success: false,
        message: 'Please provide hostname and webhookUrl'
      });
    }

    const sendGridService = require('../services/sendGridService');
    const result = await sendGridService.setupInboundParse(webhookUrl, hostname);
    
    res.json({
      success: true,
      message: 'SendGrid Inbound Parse configured successfully',
      data: result
    });

  } catch (error) {
    console.error('Error setting up SendGrid webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Error setting up webhook',
      error: error.message
    });
  }
});

// @route   POST /api/automation/track-replies
// @desc    Check for and track email replies
// @access  Private
router.post('/track-replies', authenticateToken, async (req, res) => {
  try {
    const { campaignId, originalSubject, creatorEmails } = req.body;

    const replies = [];

    for (const creatorEmail of creatorEmails) {
      try {
        const creatorReplies = await emailService.checkReplies(originalSubject, creatorEmail);
        
        if (creatorReplies.length > 0) {
          replies.push({
            creatorEmail,
            replies: creatorReplies,
            replyCount: creatorReplies.length,
            latestReply: creatorReplies[0] // Most recent first
          });
        }
      } catch (error) {
        console.error(`Reply check error for ${creatorEmail}:`, error);
      }
    }

    res.json({
      success: true,
      data: {
        campaignId,
        replies,
        totalReplies: replies.reduce((sum, r) => sum + r.replyCount, 0)
      }
    });

  } catch (error) {
    console.error('Reply tracking error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error tracking replies'
    });
  }
});

// @route   POST /api/automation/process-negotiation
// @desc    Process negotiation message with AI
// @access  Private
router.post('/process-negotiation', authenticateToken, async (req, res) => {
  try {
    const { 
      campaignId, 
      creatorEmail, 
      messageContent, 
      campaignDetails,
      forceHumanReview = false 
    } = req.body;

    if (!campaignId || !creatorEmail || !messageContent || !campaignDetails) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // Get negotiation history
    const negotiationKey = `${campaignId}_${creatorEmail}`;
    const negotiationHistory = campaignNegotiations.get(negotiationKey) || [];

    // Add current message to history
    negotiationHistory.push({
      sender: 'creator',
      message: messageContent,
      timestamp: new Date().toISOString()
    });

    let response;

    if (forceHumanReview) {
      response = {
        id: uuidv4(),
        status: 'pending_human_review',
        action: 'escalate_to_human',
        responseMessage: "Thank you for your message. Our team is reviewing your proposal and will respond within 24 hours.",
        escalationReason: 'Manual review requested',
        timestamp: new Date().toISOString()
      };
    } else {
      // Process with AI
      response = await aiService.processNegotiation(
        messageContent,
        campaignDetails,
        negotiationHistory
      );
    }

    // Add AI response to history if not escalated
    if (response.status !== 'pending_human_review') {
      negotiationHistory.push({
        sender: 'ai',
        message: response.responseMessage,
        timestamp: response.timestamp,
        negotiationId: response.id
      });

      // Send response email if auto-responding
      if (response.status !== 'error') {
        try {
          await emailService.sendEmail({
            to: creatorEmail,
            subject: `Re: ${campaignDetails.title || 'Campaign Proposal'}`,
            body: response.responseMessage
          });
        } catch (emailError) {
          console.error('Response email send error:', emailError);
        }
      }
    }

    // Update negotiation history
    campaignNegotiations.set(negotiationKey, negotiationHistory);

    res.json({
      success: true,
      data: {
        negotiation: response,
        requiresHumanReview: response.status === 'pending_human_review',
        negotiationHistory: negotiationHistory.slice(-5) // Last 5 messages
      }
    });

  } catch (error) {
    console.error('Negotiation processing error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error processing negotiation'
    });
  }
});

// @route   GET /api/automation/negotiations/:campaignId
// @desc    Get all negotiations for a campaign
// @access  Private
router.get('/negotiations/:campaignId', authenticateToken, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const negotiations = [];

    // Get all negotiations for this campaign
    for (const [key, history] of campaignNegotiations.entries()) {
      if (key.startsWith(`${campaignId}_`)) {
        const creatorEmail = key.split('_')[1];
        
        // Generate AI summary
        const summary = await aiService.generateNegotiationSummary(history);
        
        negotiations.push({
          creatorEmail,
          messageCount: history.length,
          lastActivity: history[history.length - 1]?.timestamp,
          status: history[history.length - 1]?.sender === 'ai' ? 'ai_responded' : 'awaiting_response',
          summary,
          history: history.slice(-3) // Last 3 messages for preview
        });
      }
    }

    res.json({
      success: true,
      data: {
        campaignId,
        negotiations,
        totalNegotiations: negotiations.length,
        pendingReview: negotiations.filter(n => n.status === 'pending_human_review').length
      }
    });

  } catch (error) {
    console.error('Negotiations fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching negotiations'
    });
  }
});

// @route   POST /api/automation/generate-contract
// @desc    Generate and send contract after successful negotiation
// @access  Private (Brand/Agency only)
router.post('/generate-contract', authenticateToken, authorizeRole('brand', 'agency', 'admin'), async (req, res) => {
  try {
    const {
      campaignId,
      creatorEmail,
      creatorName,
      negotiationResult,
      campaignData
    } = req.body;

    if (!campaignId || !creatorEmail || !negotiationResult || !campaignData) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required contract details'
      });
    }

    // Generate and send contract
    const contractResult = await contractService.generateAndSendContract(
      campaignData,
      {
        ...negotiationResult,
        creatorEmail,
        creatorName
      }
    );

    // Store contract data
    contractData.set(contractResult.contractId, {
      ...contractResult,
      campaignId,
      creatorEmail,
      createdBy: req.user.id
    });

    res.json({
      success: true,
      message: 'Contract generated and sent successfully',
      data: contractResult
    });

  } catch (error) {
    console.error('Contract generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error generating contract'
    });
  }
});

// @route   GET /api/automation/contracts
// @desc    Get all contracts
// @access  Private
router.get('/contracts', authenticateToken, async (req, res) => {
  try {
    const contracts = Array.from(contractData.values()).filter(contract => 
      req.user.role === 'admin' || contract.createdBy === req.user.id
    );

    res.json({
      success: true,
      data: {
        contracts,
        total: contracts.length,
        pending: contracts.filter(c => c.status === 'sent_for_signature').length,
        completed: contracts.filter(c => c.status === 'completed').length
      }
    });

  } catch (error) {
    console.error('Contracts fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching contracts'
    });
  }
});

// @route   POST /api/automation/process-payment
// @desc    Process payment after contract completion
// @access  Private (Brand/Agency only)
router.post('/process-payment', authenticateToken, authorizeRole('brand', 'agency', 'admin'), async (req, res) => {
  try {
    const { contractId } = req.body;

    if (!contractId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide contractId'
      });
    }

    // Get contract data
    const contract = contractData.get(contractId);
    if (!contract) {
      return res.status(404).json({
        success: false,
        message: 'Contract not found'
      });
    }

    // Process payment
    const paymentResult = await paymentService.processContractPayment({
      contractId,
      creatorId: contract.creatorEmail, // Using email as ID for demo
      campaignId: contract.campaignId,
      finalBudget: contract.contractData.budget,
      creatorEmail: contract.creatorEmail,
      creatorName: contract.contractData.creatorName
    });

    // Store payment record
    paymentRecords.set(paymentResult.paymentRecord.id, paymentResult.paymentRecord);

    res.json({
      success: true,
      message: 'Payment processed successfully',
      data: paymentResult
    });

  } catch (error) {
    console.error('Payment processing error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error processing payment'
    });
  }
});

// @route   GET /api/automation/payments
// @desc    Get all payments
// @access  Private
router.get('/payments', authenticateToken, async (req, res) => {
  try {
    const payments = Array.from(paymentRecords.values());

    res.json({
      success: true,
      data: {
        payments,
        total: payments.length,
        totalAmount: payments.reduce((sum, p) => sum + p.amount, 0),
        pending: payments.filter(p => p.status === 'pending').length,
        completed: payments.filter(p => p.status === 'completed').length
      }
    });

  } catch (error) {
    console.error('Payments fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching payments'
    });
  }
});

// @route   POST /api/automation/webhooks/pandadoc
// @desc    Handle PandaDoc webhooks for contract signatures
// @access  Public (webhook)
router.post('/webhooks/pandadoc', async (req, res) => {
  try {
    const webhookResult = await contractService.handleSignatureWebhook(req.body);
    
    // Update contract status if completed
    if (webhookResult.status === 'completed') {
      for (const [id, contract] of contractData.entries()) {
        if (contract.documentId === webhookResult.documentId) {
          contractData.set(id, {
            ...contract,
            status: 'completed',
            completedAt: webhookResult.completedAt,
            signedDocumentPath: webhookResult.signedDocumentPath
          });
          break;
        }
      }
    }

    res.json({ success: true, data: webhookResult });
  } catch (error) {
    console.error('PandaDoc webhook error:', error);
    res.status(500).json({ success: false, message: 'Webhook processing error' });
  }
});

// @route   POST /api/automation/webhooks/razorpay
// @desc    Handle Razorpay webhooks for payments
// @access  Public (webhook)
router.post('/webhooks/razorpay', async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const webhookResult = await paymentService.handlePaymentWebhook(req.body, signature);
    
    // Update payment record if completed
    if (webhookResult.status === 'success') {
      for (const [id, payment] of paymentRecords.entries()) {
        if (payment.orderId === webhookResult.orderId) {
          paymentRecords.set(id, {
            ...payment,
            ...webhookResult.updateData
          });
          break;
        }
      }
    }

    res.json({ success: true, data: webhookResult });
  } catch (error) {
    console.error('Razorpay webhook error:', error);
    res.status(500).json({ success: false, message: 'Webhook processing error' });
  }
});

// @route   GET /api/automation/dashboard
// @desc    Get automation dashboard data
// @access  Private
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const userContracts = Array.from(contractData.values()).filter(contract => 
      req.user.role === 'admin' || contract.createdBy === req.user.id
    );
    
    const userPayments = Array.from(paymentRecords.values());
    
    const negotiations = [];
    for (const [key, history] of campaignNegotiations.entries()) {
      negotiations.push({
        key,
        messageCount: history.length,
        lastActivity: history[history.length - 1]?.timestamp,
        status: history[history.length - 1]?.sender === 'ai' ? 'ai_responded' : 'awaiting_response'
      });
    }

    const dashboard = {
      summary: {
        totalNegotiations: negotiations.length,
        activeNegotiations: negotiations.filter(n => n.status === 'awaiting_response').length,
        totalContracts: userContracts.length,
        signedContracts: userContracts.filter(c => c.status === 'completed').length,
        totalPayments: userPayments.length,
        completedPayments: userPayments.filter(p => p.status === 'completed').length,
        totalRevenue: userPayments.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0)
      },
      recentActivity: [
        ...negotiations.slice(-5).map(n => ({
          type: 'negotiation',
          description: `Negotiation activity for ${n.key}`,
          timestamp: n.lastActivity
        })),
        ...userContracts.slice(-5).map(c => ({
          type: 'contract',
          description: `Contract ${c.status} for ${c.contractData.creatorName}`,
          timestamp: c.sentAt
        })),
        ...userPayments.slice(-5).map(p => ({
          type: 'payment',
          description: `Payment ${p.status} - $${p.amount}`,
          timestamp: p.createdAt
        }))
      ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 10)
    };

    res.json({
      success: true,
      data: dashboard
    });

  } catch (error) {
    console.error('Dashboard data error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching dashboard data'
    });
  }
});

// Simulate Sanjay's response for quick testing
router.post('/simulate-sanjay-response', async (req, res) => {
  try {
    console.log('🎭 Simulating Sanjay response...');
    
    const { originalMessage, campaign, creatorEmail } = req.body;
    
    if (!originalMessage || !campaign) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: originalMessage and campaign'
      });
    }

    // Check if this is for Sanjay's email
    const isSanjay = creatorEmail && creatorEmail.toLowerCase().includes('sanjay');
    
    if (!isSanjay) {
      return res.status(400).json({
        success: false,
        error: 'Response simulation is only available for Sanjay (sanjaymallladi12@gmail.com)'
      });
    }

    // Generate simulated response using Gemini AI
    const simulatedResponse = await geminiAiService.simulateSanjayResponse(originalMessage, campaign);
    
    // Optionally store the simulated response in the database as a received email
    // This would help with testing the full negotiation flow
    
    console.log('✅ Sanjay response simulated successfully');
    
    res.json({
      success: true,
      simulatedResponse: simulatedResponse,
      creator: 'Sanjay Tech Solutions',
      timestamp: new Date().toISOString(),
      isSimulated: true
    });

  } catch (error) {
    console.error('Error simulating Sanjay response:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to simulate response'
    });
  }
});

module.exports = router; 
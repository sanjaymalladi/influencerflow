const express = require('express');

const router = express.Router();

// Initialize payments agent (lazy load)
let paymentsAgent;

const getPaymentsAgent = () => {
  if (!paymentsAgent) {
    const PaymentsCoordinatorAgent = require('../agents/PaymentsCoordinatorAgent');
    paymentsAgent = new PaymentsCoordinatorAgent();
  }
  return paymentsAgent;
};

/**
 * Initialize payment workflow for a contract
 * POST /api/payments/initialize
 */
router.post('/initialize', async (req, res) => {
  try {
    const { contractData } = req.body;

    if (!contractData) {
      return res.status(400).json({
        success: false,
        error: 'contractData is required'
      });
    }

    console.log('💳 [API] Initializing payment workflow...');

    const paymentsAgent = getPaymentsAgent();
    const result = await paymentsAgent.initializePaymentWorkflow(contractData);

    res.json(result);
  } catch (error) {
    console.error('❌ Payment initialization API error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Process milestone completion and trigger payment
 * POST /api/payments/milestone-complete
 */
router.post('/milestone-complete', async (req, res) => {
  try {
    const { milestoneData } = req.body;

    if (!milestoneData) {
      return res.status(400).json({
        success: false,
        error: 'milestoneData is required'
      });
    }

    console.log('💳 [API] Processing milestone completion...');

    const paymentsAgent = getPaymentsAgent();
    const result = await paymentsAgent.processMilestoneCompletion(milestoneData);

    res.json(result);
  } catch (error) {
    console.error('❌ Milestone completion API error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Process multiple milestones for a campaign
 * POST /api/payments/campaign-milestones
 */
router.post('/campaign-milestones', async (req, res) => {
  try {
    const { campaignData } = req.body;

    if (!campaignData) {
      return res.status(400).json({
        success: false,
        error: 'campaignData is required'
      });
    }

    console.log('💳 [API] Processing campaign milestones...');

    const paymentsAgent = getPaymentsAgent();
    const result = await paymentsAgent.processCampaignMilestones(campaignData);

    res.json(result);
  } catch (error) {
    console.error('❌ Campaign milestones API error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get payment status for a contract
 * GET /api/payments/contract/:contractId
 */
router.get('/contract/:contractId', async (req, res) => {
  try {
    const { contractId } = req.params;

    const paymentsAgent = getPaymentsAgent();
    const paymentStatus = paymentsAgent.getContractPaymentStatus(contractId);

    res.json({
      success: true,
      contractId,
      payment: paymentStatus
    });
  } catch (error) {
    console.error('❌ Payment status API error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Generate payment analytics
 * GET /api/payments/analytics
 */
router.get('/analytics', async (req, res) => {
  try {
    console.log('💳 [API] Generating payment analytics...');

    const paymentsAgent = getPaymentsAgent();
    const result = await paymentsAgent.generatePaymentAnalytics();

    res.json(result);
  } catch (error) {
    console.error('❌ Payment analytics API error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * List all payment records
 * GET /api/payments
 */
router.get('/', async (req, res) => {
  try {
    const paymentsAgent = getPaymentsAgent();
    const payments = paymentsAgent.listAllPayments();

    res.json({
      success: true,
      payments,
      count: payments.length
    });
  } catch (error) {
    console.error('❌ Payment list API error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Handle milestone completion notification
 * POST /api/payments/milestone-notification
 */
router.post('/milestone-notification', async (req, res) => {
  try {
    const { notificationData } = req.body;

    if (!notificationData) {
      return res.status(400).json({
        success: false,
        error: 'notificationData is required'
      });
    }

    console.log('💳 [API] Handling milestone completion notification...');

    const paymentsAgent = getPaymentsAgent();
    const result = await paymentsAgent.handleMilestoneNotification(notificationData);

    res.json(result);
  } catch (error) {
    console.error('❌ Milestone notification API error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get payments agent logs
 * GET /api/payments/agent/logs
 */
router.get('/agent/logs', async (req, res) => {
  try {
    const paymentsAgent = getPaymentsAgent();
    const logs = paymentsAgent.getLogs();

    res.json({
      success: true,
      logs,
      agent: 'PaymentsCoordinator'
    });
  } catch (error) {
    console.error('❌ Payments agent logs API error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Simulate milestone completion (for testing)
 * POST /api/payments/simulate-milestone
 */
router.post('/simulate-milestone', async (req, res) => {
  try {
    const { contractId, milestoneId, completionType = 'content_approved' } = req.body;

    if (!contractId || !milestoneId) {
      return res.status(400).json({
        success: false,
        error: 'contractId and milestoneId are required'
      });
    }

    console.log('💳 [API] Simulating milestone completion...');

    // Simulate milestone completion notification
    const notificationData = {
      contractId,
      milestoneId,
      completionType,
      evidence: {
        submissionDate: new Date().toISOString(),
        contentType: 'social_media_post',
        status: 'approved'
      },
      submittedBy: 'system_simulation'
    };

    const paymentsAgent = getPaymentsAgent();
    const result = await paymentsAgent.handleMilestoneNotification(notificationData);

    res.json(result);
  } catch (error) {
    console.error('❌ Milestone simulation API error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router; 
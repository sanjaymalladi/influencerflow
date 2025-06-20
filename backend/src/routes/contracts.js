const express = require('express');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Initialize agents (using require with .js files when using ES modules in agents)
let contractAgent, paymentsAgent;

// Lazy load to avoid circular dependencies
const getAgents = () => {
  if (!contractAgent) {
    const ContractManagerAgent = require('../agents/ContractManagerAgent');
    const PaymentsCoordinatorAgent = require('../agents/PaymentsCoordinatorAgent');
    contractAgent = new ContractManagerAgent();
    paymentsAgent = new PaymentsCoordinatorAgent();
  }
  return { contractAgent, paymentsAgent };
};

/**
 * Generate contract from negotiation outcome
 * POST /api/contracts/generate
 */
router.post('/generate', async (req, res) => {
  try {
    const { negotiationOutcome } = req.body;

    if (!negotiationOutcome) {
      return res.status(400).json({
        success: false,
        error: 'negotiationOutcome is required'
      });
    }

    console.log('📄 [API] Generating contract from negotiation outcome...');

    const { contractAgent, paymentsAgent } = getAgents();
    const result = await contractAgent.generateContractFromNegotiation(negotiationOutcome);

    if (result.success) {
      // Initialize payment workflow after contract generation
      const contractData = {
        contractId: result.contract.contractId,
        creatorData: {
          id: negotiationOutcome.creatorId,
          name: negotiationOutcome.creatorName || negotiationOutcome.creator?.name,
          email: negotiationOutcome.creatorEmail || negotiationOutcome.creator?.email
        },
        paymentMilestones: result.contract.terms.paymentMilestones,
        campaignTitle: negotiationOutcome.campaignTitle || negotiationOutcome.campaignName,
        totalAmount: result.contract.terms.paymentAmount
      };

      const paymentResult = await paymentsAgent.initializePaymentWorkflow(contractData);

      res.json({
        success: true,
        contract: result.contract,
        paymentSetup: paymentResult,
        downloadUrl: result.downloadUrl,
        nextStep: 'send_for_esignature'
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('❌ Contract generation API error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Process batch contracts for a campaign
 * POST /api/contracts/batch-generate
 */
router.post('/batch-generate', async (req, res) => {
  try {
    const { campaignData } = req.body;

    if (!campaignData) {
      return res.status(400).json({
        success: false,
        error: 'campaignData is required'
      });
    }

    console.log('📄 [API] Processing batch contract generation...');

    const { contractAgent } = getAgents();
    const result = await contractAgent.processCampaignContracts(campaignData);

    res.json(result);
  } catch (error) {
    console.error('❌ Batch contract generation API error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Download contract PDF
 * GET /api/contracts/:contractId/download
 */
router.get('/:contractId/download', async (req, res) => {
  try {
    const { contractId } = req.params;

    const { contractAgent } = getAgents();
    const contractStatus = contractAgent.getContractStatus(contractId);

    if (contractStatus.status === 'ready') {
      const filePath = contractStatus.path;
      
      if (fs.existsSync(filePath)) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${contractId}.pdf"`);
        
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
      } else {
        res.status(404).json({
          success: false,
          error: 'Contract file not found'
        });
      }
    } else {
      res.status(404).json({
        success: false,
        error: 'Contract not found'
      });
    }
  } catch (error) {
    console.error('❌ Contract download API error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get contract status
 * GET /api/contracts/:contractId/status
 */
router.get('/:contractId/status', async (req, res) => {
  try {
    const { contractId } = req.params;

    const { contractAgent, paymentsAgent } = getAgents();
    const contractStatus = contractAgent.getContractStatus(contractId);
    const paymentStatus = paymentsAgent.getContractPaymentStatus(contractId);

    res.json({
      success: true,
      contractId,
      contract: contractStatus,
      payments: paymentStatus
    });
  } catch (error) {
    console.error('❌ Contract status API error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * List all contracts
 * GET /api/contracts
 */
router.get('/', async (req, res) => {
  try {
    const { contractAgent } = getAgents();
    const contracts = contractAgent.listContracts();
    
    res.json({
      success: true,
      contracts,
      count: contracts.length
    });
  } catch (error) {
    console.error('❌ Contract list API error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Send contract for e-signature
 * POST /api/contracts/:contractId/send-for-signature
 */
router.post('/:contractId/send-for-signature', async (req, res) => {
  try {
    const { contractId } = req.params;
    const { signatories } = req.body;

    if (!signatories) {
      return res.status(400).json({
        success: false,
        error: 'signatories is required'
      });
    }

    const { contractAgent } = getAgents();
    const result = await contractAgent.sendForESignature(contractId, signatories);

    res.json(result);
  } catch (error) {
    console.error('❌ E-signature API error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Generate demo contract (for testing Phase 3)
 * POST /api/contracts/demo
 */
router.post('/demo', async (req, res) => {
  try {
    console.log('📄 [API] Generating demo contract for Phase 3 testing...');

    const { contractAgent, paymentsAgent } = getAgents();

    // Demo negotiation outcome data
    const demoNegotiationOutcome = {
      campaignId: 'campaign_demo_' + Date.now(),
      creatorId: 'creator_demo_' + Date.now(),
      creatorName: 'Demo Creator',
      creatorEmail: 'demo@creator.com',
      brandName: 'InfluencerFlow Demo Brand',
      campaignTitle: 'Phase 3 Demo Campaign',
              agreedAmount: 166000,
      paymentSchedule: [
        { phase: 'Contract Signing', amount: 500, dueDate: 'Upon signature' },
        { phase: 'Content Creation', amount: 1000, dueDate: '14 days after signature' },
        { phase: 'Campaign Completion', amount: 500, dueDate: '30 days after signature' }
      ],
      deliverables: [
        { description: 'Instagram posts', quantity: 3 },
        { description: 'YouTube video', quantity: 1 },
        { description: 'Analytics report', quantity: 1 }
      ]
    };

    // Generate contract
    const contractResult = await contractAgent.generateContractFromNegotiation(demoNegotiationOutcome);

    if (contractResult.success) {
      // Initialize payment workflow
      const contractData = {
        contractId: contractResult.contract.contractId,
        creatorData: {
          id: demoNegotiationOutcome.creatorId,
          name: demoNegotiationOutcome.creatorName,
          email: demoNegotiationOutcome.creatorEmail
        },
        paymentMilestones: demoNegotiationOutcome.paymentSchedule,
        campaignTitle: demoNegotiationOutcome.campaignTitle,
        totalAmount: demoNegotiationOutcome.agreedAmount
      };

      const paymentResult = await paymentsAgent.initializePaymentWorkflow(contractData);

      res.json({
        success: true,
        message: 'Demo contract and payment workflow created successfully!',
        contract: contractResult.contract,
        paymentSetup: paymentResult,
        downloadUrl: contractResult.downloadUrl,
        testEndpoints: {
          viewContract: `/api/contracts/${contractResult.contract.contractId}/status`,
          downloadContract: contractResult.downloadUrl,
          paymentStatus: `/api/payments/contract/${contractResult.contract.contractId}`,
          simulatePayment: `/api/payments/simulate-milestone`,
          paymentAnalytics: '/api/payments/analytics'
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: contractResult.error
      });
    }
  } catch (error) {
    console.error('❌ Demo contract generation API error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get contract agent logs
 * GET /api/contracts/agent/logs
 */
router.get('/agent/logs', async (req, res) => {
  try {
    const { contractAgent } = getAgents();
    const logs = contractAgent.getLogs();
    
    res.json({
      success: true,
      logs,
      agent: 'ContractManager'
    });
  } catch (error) {
    console.error('❌ Contract agent logs API error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router; 
const contractService = require('../services/contractService');
const { GoogleGenerativeAI } = require('@google/generative-ai');

class ContractManagerAgent {
  constructor() {
    this.contractService = contractService;
    this.logs = [];
    
    // Initialize Gemini AI if API key is available
    if (process.env.GEMINI_API_KEY) {
      this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
              this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    }
  }

  /**
   * Add log entry
   * @param {string} message - Log message
   * @param {string} type - Log type (info, success, error)
   */
  addLog(message, type = 'info') {
    const log = {
      timestamp: new Date().toISOString(),
      message,
      type,
      agent: 'ContractManager'
    };
    this.logs.push(log);
    console.log(`📄 [ContractManager] ${message}`);
  }

  /**
   * Parse negotiation outcome and extract contract terms
   * @param {Object} negotiationData - Results from negotiation agent
   * @returns {Object} Parsed contract terms
   */
  async parseNegotiationOutcome(negotiationData) {
    try {
      this.addLog('Parsing negotiation outcome to extract contract terms...');

      // If we have AI available, use it to extract terms intelligently
      if (this.model) {
        const prompt = `
        Parse the following negotiation outcome and extract contract terms in JSON format:
        
        Negotiation Data: ${JSON.stringify(negotiationData, null, 2)}
        
        Extract and return a JSON object with these fields:
        {
          "deliverables": [{"description": "string", "quantity": number}],
          "paymentAmount": number,
          "paymentMilestones": [{"phase": "string", "amount": number, "dueDate": "string"}],
          "deadlines": {"contentCreation": "date", "campaignLaunch": "date", "finalReporting": "date"},
          "specialTerms": ["string"],
          "revisionRights": number,
          "usageRights": "string",
          "exclusivityPeriod": "string"
        }
        
        Only return the JSON object, no other text.
        `;

        const result = await this.model.generateContent(prompt);
        const response = result.response;
        const text = response.text();
        
        try {
          const parsedTerms = JSON.parse(text);
          this.addLog('Successfully extracted contract terms using AI', 'success');
          return parsedTerms;
        } catch (parseError) {
          this.addLog('AI response was not valid JSON, using fallback parsing', 'error');
        }
      }

      // Fallback: Extract basic terms from negotiation data
      const extractedTerms = {
        deliverables: negotiationData.deliverables || [
          { description: 'Social media posts', quantity: 3 },
          { description: 'Video content', quantity: 1 }
        ],
        paymentAmount: negotiationData.agreedAmount || negotiationData.totalBudget || 1000,
        paymentMilestones: negotiationData.paymentSchedule || [
          { phase: 'Contract Signing', amount: 500, dueDate: 'Upon signature' },
          { phase: 'Content Delivery', amount: 500, dueDate: '30 days after signature' }
        ],
        deadlines: {
          contentCreation: negotiationData.contentDeadline || this.addDays(new Date(), 14).toISOString().split('T')[0],
          campaignLaunch: negotiationData.launchDate || this.addDays(new Date(), 21).toISOString().split('T')[0],
          finalReporting: negotiationData.reportingDeadline || this.addDays(new Date(), 35).toISOString().split('T')[0]
        },
        specialTerms: negotiationData.specialRequirements || [],
        revisionRights: negotiationData.revisions || 2,
        usageRights: negotiationData.usage || 'Perpetual license for marketing purposes',
        exclusivityPeriod: negotiationData.exclusivity || '30 days'
      };

      this.addLog('Extracted contract terms using fallback method', 'success');
      return extractedTerms;

    } catch (error) {
      this.addLog(`Failed to parse negotiation outcome: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Generate contract from negotiation outcome
   * @param {Object} negotiationOutcome - Complete negotiation data
   * @returns {Object} Contract generation result
   */
  async generateContractFromNegotiation(negotiationOutcome) {
    try {
      this.addLog('Starting contract generation from negotiation outcome...');

      // Parse the negotiation to extract terms
      const contractTerms = await this.parseNegotiationOutcome(negotiationOutcome);

      // Prepare contract data
      const contractData = {
        campaignId: negotiationOutcome.campaignId,
        creatorId: negotiationOutcome.creatorId,
        creatorName: negotiationOutcome.creatorName || negotiationOutcome.creator?.name,
        creatorEmail: negotiationOutcome.creatorEmail || negotiationOutcome.creator?.email,
        brandName: negotiationOutcome.brandName || 'InfluencerFlow Client',
        campaignTitle: negotiationOutcome.campaignTitle || negotiationOutcome.campaignName,
        deliverables: contractTerms.deliverables,
        paymentAmount: contractTerms.paymentAmount,
        paymentMilestones: contractTerms.paymentMilestones,
        deadlines: contractTerms.deadlines,
        contractId: `CONTRACT-${negotiationOutcome.campaignId}-${negotiationOutcome.creatorId}-${Date.now()}`.substring(0, 50)
      };

      this.addLog(`Generating contract for ${contractData.creatorName}...`);

      // Generate the contract using existing contractService
      const result = await this.contractService.generateContractPDF({
        campaignTitle: contractData.campaignTitle,
        brandName: contractData.brandName,
        creatorName: contractData.creatorName,
        creatorEmail: contractData.creatorEmail,
        budget: contractData.paymentAmount,
        deliverables: contractTerms.deliverables.map(d => d.description).join('\n'),
        timeline: contractTerms.deadlines.contentCreation,
        paymentTerms: `Total: $${contractData.paymentAmount}`,
        additionalTerms: contractTerms.specialTerms?.join('\n')
      });

      this.addLog(`Contract generated successfully for ${contractData.creatorName}!`, 'success');
      
      // Store contract metadata (in a real app, this would go to database)
      const contractMetadata = {
        contractId: contractData.contractId,
        campaignId: contractData.campaignId,
        creatorId: contractData.creatorId,
        status: 'awaiting_signatures',
        createdAt: new Date().toISOString(),
        terms: contractTerms,
        filePath: result.filePath,
        fileName: result.fileName
      };

      return {
        success: true,
        contract: contractMetadata,
        filePath: result.filePath,
        fileName: result.fileName,
        downloadUrl: `/api/contracts/${contractData.contractId}/download`,
        nextStep: 'send_for_esignature'
      };

    } catch (error) {
      this.addLog(`Contract generation failed: ${error.message}`, 'error');
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Process multiple contracts from a campaign
   * @param {Object} campaignData - Campaign with multiple creator deals
   * @returns {Object} Batch contract generation result
   */
  async processCampaignContracts(campaignData) {
    try {
      this.addLog(`Processing contracts for campaign: ${campaignData.campaignTitle}`);

      const results = [];
      const deals = campaignData.finalizedDeals || [];

      for (const deal of deals) {
        this.addLog(`Processing contract for ${deal.creatorName}...`);
        
        const contractResult = await this.generateContractFromNegotiation(deal);
        results.push({
          creatorId: deal.creatorId,
          creatorName: deal.creatorName,
          result: contractResult
        });

        // Small delay between contracts
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      const successCount = results.filter(r => r.result.success).length;
      const failureCount = results.length - successCount;

      this.addLog(`Batch processing complete: ${successCount} successful, ${failureCount} failed`, 'success');

      return {
        success: true,
        campaignId: campaignData.campaignId,
        totalContracts: results.length,
        successCount,
        failureCount,
        contracts: results
      };

    } catch (error) {
      this.addLog(`Batch contract processing failed: ${error.message}`, 'error');
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get contract status
   * @param {string} contractId - Contract identifier
   * @returns {Object} Contract status
   */
  getContractStatus(contractId) {
    // Simplified contract status for demo
    return {
      contractId,
      status: 'ready',
      createdAt: new Date().toISOString()
    };
  }

  /**
   * List all contracts
   * @returns {Array} List of contracts
   */
  listContracts() {
    // Simplified contract listing for demo
    return [
      {
        contractId: 'demo-contract-001',
        fileName: 'demo-contract-001.pdf',
        createdAt: new Date().toISOString(),
        status: 'ready'
      }
    ];
  }

  /**
   * Get agent logs
   * @returns {Array} Recent logs
   */
  getLogs() {
    return this.logs.slice(-20); // Return last 20 logs
  }

  /**
   * Clear agent logs
   */
  clearLogs() {
    this.logs = [];
    this.addLog('Logs cleared');
  }

  /**
   * Helper function to add days to a date
   * @param {Date} date - Base date
   * @param {number} days - Days to add
   * @returns {Date} New date
   */
  addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  /**
   * Simulate e-signature process (placeholder for DocuSign integration)
   * @param {string} contractId - Contract to send for signature
   * @param {Object} signatories - Email addresses for signatures
   * @returns {Object} E-signature process result
   */
  async sendForESignature(contractId, signatories) {
    try {
      this.addLog(`Initiating e-signature process for contract ${contractId}...`);

      // This is a simulation - in production, you'd integrate with DocuSign, HelloSign, etc.
      const mockESignatureResult = {
        success: true,
        envelopeId: `ENV-${Date.now()}`,
        contractId,
        signatories: signatories,
        status: 'sent',
        signUrl: `https://mock-esign.com/sign/${contractId}`,
        expiresAt: this.addDays(new Date(), 30).toISOString()
      };

      this.addLog(`E-signature envelope sent. Envelope ID: ${mockESignatureResult.envelopeId}`, 'success');

      return mockESignatureResult;

    } catch (error) {
      this.addLog(`E-signature process failed: ${error.message}`, 'error');
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = ContractManagerAgent; 
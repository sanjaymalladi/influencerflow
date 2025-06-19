const PaymentsCoordinatorService = require('../services/PaymentsCoordinatorService');
const { GoogleGenerativeAI } = require('@google/generative-ai');

class PaymentsCoordinatorAgent {
  constructor() {
    this.paymentsService = new PaymentsCoordinatorService();
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
      agent: 'PaymentsCoordinator'
    };
    this.logs.push(log);
    console.log(`💳 [PaymentsCoordinator] ${message}`);
  }

  /**
   * Initialize payment workflow from a signed contract
   * @param {Object} contractData - Signed contract information
   * @returns {Object} Payment initialization result
   */
  async initializePaymentWorkflow(contractData) {
    try {
      this.addLog('Initializing payment workflow from signed contract...');

      const {
        contractId,
        creatorData,
        paymentMilestones,
        campaignTitle,
        totalAmount
      } = contractData;

      // Setup payment milestones in Stripe
      const setupResult = await this.paymentsService.setupPaymentMilestones({
        contractId,
        creatorData,
        paymentMilestones,
        campaignTitle
      });

      if (setupResult.success) {
        this.addLog(`Payment milestones created: ${setupResult.successfulMilestones}/${setupResult.totalMilestones}`, 'success');
        
        return {
          success: true,
          contractId,
          paymentSetup: setupResult,
          nextSteps: [
            'Payment milestones are ready',
            'Invoices created for each milestone',
            'Waiting for milestone completion to trigger payments'
          ]
        };
      } else {
        this.addLog(`Payment setup failed: ${setupResult.error}`, 'error');
        return {
          success: false,
          error: setupResult.error
        };
      }

    } catch (error) {
      this.addLog(`Payment workflow initialization failed: ${error.message}`, 'error');
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Process milestone completion and trigger payment
   * @param {Object} milestoneData - Milestone completion data
   * @returns {Object} Payment processing result
   */
  async processMilestoneCompletion(milestoneData) {
    try {
      const {
        contractId,
        milestoneId,
        completionData,
        approvalStatus = 'approved'
      } = milestoneData;

      this.addLog(`Processing milestone completion: ${milestoneId} for contract ${contractId}`);

      // Check if milestone is approved
      if (approvalStatus !== 'approved') {
        this.addLog(`Milestone ${milestoneId} not approved. Status: ${approvalStatus}`, 'error');
        return {
          success: false,
          error: `Milestone not approved: ${approvalStatus}`
        };
      }

      // Get payment record
      const paymentStatus = this.paymentsService.getPaymentStatus(contractId);
      if (!paymentStatus.found) {
        throw new Error('Payment record not found for contract');
      }

      // Find the specific milestone
      const milestone = paymentStatus.milestoneDetails.find(m => m.milestoneId === milestoneId);
      if (!milestone) {
        throw new Error('Milestone not found in payment record');
      }

      if (milestone.status === 'paid') {
        this.addLog(`Milestone ${milestoneId} already paid`, 'info');
        return {
          success: true,
          alreadyPaid: true,
          milestone
        };
      }

      // Process the payment
      const paymentResult = await this.paymentsService.processMilestonePayment({
        contractId,
        milestoneId
      });

      if (paymentResult.success) {
        this.addLog(`Milestone payment processed successfully: ${milestoneId}`, 'success');
        
        // Check if this was the final milestone
        const updatedStatus = this.paymentsService.getPaymentStatus(contractId);
        const isContractComplete = updatedStatus.status === 'completed';

        return {
          success: true,
          contractId,
          milestoneId,
          payment: paymentResult.payment,
          contractComplete: isContractComplete,
          remainingAmount: updatedStatus.remaining,
          nextMilestone: this.getNextPendingMilestone(updatedStatus.milestoneDetails)
        };
      } else {
        this.addLog(`Milestone payment failed: ${paymentResult.error}`, 'error');
        return {
          success: false,
          error: paymentResult.error
        };
      }

    } catch (error) {
      this.addLog(`Milestone completion processing failed: ${error.message}`, 'error');
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Handle batch milestone completions for a campaign
   * @param {Object} campaignData - Campaign with multiple milestone completions
   * @returns {Object} Batch processing result
   */
  async processCampaignMilestones(campaignData) {
    try {
      this.addLog(`Processing campaign milestones for: ${campaignData.campaignTitle}`);

      const results = [];
      const milestoneCompletions = campaignData.milestoneCompletions || [];

      for (const completion of milestoneCompletions) {
        this.addLog(`Processing milestone for contract ${completion.contractId}...`);
        
        const result = await this.processMilestoneCompletion(completion);
        results.push({
          contractId: completion.contractId,
          milestoneId: completion.milestoneId,
          result
        });

        // Small delay between payments
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      const successCount = results.filter(r => r.result.success).length;
      const failureCount = results.length - successCount;

      this.addLog(`Campaign milestone processing complete: ${successCount} successful, ${failureCount} failed`, 'success');

      return {
        success: true,
        campaignId: campaignData.campaignId,
        totalMilestones: results.length,
        successCount,
        failureCount,
        results
      };

    } catch (error) {
      this.addLog(`Campaign milestone processing failed: ${error.message}`, 'error');
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate payment analytics and reports
   * @param {Object} reportParams - Report parameters
   * @returns {Object} Payment analytics
   */
  async generatePaymentAnalytics(reportParams = {}) {
    try {
      this.addLog('Generating payment analytics...');

      const allPaymentRecords = this.paymentsService.listPaymentRecords();
      
      const analytics = {
        totalContracts: allPaymentRecords.length,
        totalAmount: allPaymentRecords.reduce((sum, record) => sum + record.totalAmount, 0),
        totalPaid: 0,
        totalPending: 0,
        contractsByStatus: {
          completed: 0,
          partially_paid: 0,
          pending: 0
        },
        milestoneAnalytics: {
          total: 0,
          paid: 0,
          pending: 0,
          failed: 0
        },
        recentPayments: [],
        upcomingMilestones: []
      };

      // Process each contract
      allPaymentRecords.forEach(record => {
        const status = this.paymentsService.getPaymentStatus(record.contractId);
        
        analytics.totalPaid += status.totalPaid;
        analytics.totalPending += status.remaining;
        analytics.contractsByStatus[status.status]++;
        
        analytics.milestoneAnalytics.total += status.milestones.total;
        analytics.milestoneAnalytics.paid += status.milestones.paid;
        analytics.milestoneAnalytics.pending += status.milestones.pending;
        analytics.milestoneAnalytics.failed += status.milestones.failed;

        // Collect recent payments and upcoming milestones
        status.milestoneDetails.forEach(milestone => {
          if (milestone.status === 'paid' && milestone.paidAt) {
            analytics.recentPayments.push({
              contractId: record.contractId,
              milestoneId: milestone.milestoneId,
              amount: milestone.amount,
              paidAt: milestone.paidAt,
              creatorName: record.creatorData.name
            });
          } else if (milestone.status === 'created') {
            analytics.upcomingMilestones.push({
              contractId: record.contractId,
              milestoneId: milestone.milestoneId,
              amount: milestone.amount,
              dueDate: milestone.dueDate,
              creatorName: record.creatorData.name
            });
          }
        });
      });

      // Sort recent payments by date (newest first)
      analytics.recentPayments.sort((a, b) => new Date(b.paidAt) - new Date(a.paidAt));
      analytics.recentPayments = analytics.recentPayments.slice(0, 10);

      // Sort upcoming milestones by due date
      analytics.upcomingMilestones.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
      analytics.upcomingMilestones = analytics.upcomingMilestones.slice(0, 10);

      this.addLog('Payment analytics generated successfully', 'success');

      return {
        success: true,
        analytics,
        generatedAt: new Date().toISOString()
      };

    } catch (error) {
      this.addLog(`Payment analytics generation failed: ${error.message}`, 'error');
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get payment status for a specific contract
   * @param {string} contractId - Contract identifier
   * @returns {Object} Contract payment status
   */
  getContractPaymentStatus(contractId) {
    return this.paymentsService.getPaymentStatus(contractId);
  }

  /**
   * List all payment records
   * @returns {Array} Payment records
   */
  listAllPayments() {
    return this.paymentsService.listPaymentRecords();
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
   * Helper function to get next pending milestone
   * @param {Array} milestones - Milestone details
   * @returns {Object|null} Next pending milestone
   */
  getNextPendingMilestone(milestones) {
    return milestones.find(m => m.status === 'created') || null;
  }

  /**
   * Simulate milestone completion notification
   * @param {Object} notificationData - Notification data
   * @returns {Object} Notification processing result
   */
  async handleMilestoneNotification(notificationData) {
    try {
      const {
        contractId,
        milestoneId,
        completionType,
        evidence,
        submittedBy
      } = notificationData;

      this.addLog(`Received milestone completion notification: ${milestoneId}`);

      // In a real implementation, this would:
      // 1. Validate evidence (content delivery, approval workflows)
      // 2. Trigger review process if needed
      // 3. Auto-approve for certain milestone types
      // 4. Send notifications to relevant parties

      const autoApprovalTypes = ['content_submitted', 'content_approved'];
      const approvalStatus = autoApprovalTypes.includes(completionType) ? 'approved' : 'pending_review';

      if (approvalStatus === 'approved') {
        // Auto-process payment
        const result = await this.processMilestoneCompletion({
          contractId,
          milestoneId,
          completionData: notificationData,
          approvalStatus
        });

        return {
          success: true,
          autoProcessed: true,
          paymentResult: result
        };
      } else {
        this.addLog(`Milestone ${milestoneId} requires manual review`, 'info');
        return {
          success: true,
          autoProcessed: false,
          status: 'pending_review',
          reviewUrl: `/admin/milestones/${contractId}/${milestoneId}/review`
        };
      }

    } catch (error) {
      this.addLog(`Milestone notification handling failed: ${error.message}`, 'error');
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = PaymentsCoordinatorAgent; 
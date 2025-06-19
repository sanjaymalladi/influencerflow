const Stripe = require('stripe');

class PaymentsCoordinatorService {
  constructor() {
    // Initialize Stripe if API key is available
    if (process.env.STRIPE_SECRET_KEY) {
      this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      this.isStripeEnabled = true;
    } else {
      console.warn('⚠️ STRIPE_SECRET_KEY not found. Payment features will be in simulation mode.');
      this.isStripeEnabled = false;
    }

    this.paymentRecords = new Map(); // In-memory storage for demo
  }

  /**
   * Create a customer in Stripe for the creator
   * @param {Object} creatorData - Creator information
   * @returns {Object} Customer creation result
   */
  async createCustomer(creatorData) {
    try {
      if (!this.isStripeEnabled) {
        // Simulation mode
        const mockCustomer = {
          id: `cus_mock_${Date.now()}`,
          email: creatorData.email,
          name: creatorData.name,
          metadata: {
            creator_id: creatorData.id,
            platform: 'InfluencerFlow'
          }
        };
        return { success: true, customer: mockCustomer };
      }

      const customer = await this.stripe.customers.create({
        email: creatorData.email,
        name: creatorData.name,
        description: `InfluencerFlow Creator: ${creatorData.name}`,
        metadata: {
          creator_id: creatorData.id,
          platform: 'InfluencerFlow',
          channels: creatorData.channels?.join(',') || ''
        }
      });

      return { success: true, customer };

    } catch (error) {
      console.error('❌ Failed to create customer:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create an invoice for a contract milestone
   * @param {Object} invoiceData - Invoice information
   * @returns {Object} Invoice creation result
   */
  async createInvoice(invoiceData) {
    try {
      const {
        customerId,
        contractId,
        milestoneId,
        amount,
        description,
        dueDate,
        lineItems = []
      } = invoiceData;

      if (!this.isStripeEnabled) {
        // Simulation mode
        const mockInvoice = {
          id: `in_mock_${Date.now()}`,
          customer: customerId,
          amount_due: amount * 100, // Stripe uses cents
          amount_paid: 0,
          status: 'draft',
          description,
          due_date: Math.floor(new Date(dueDate).getTime() / 1000),
          created: Math.floor(Date.now() / 1000),
          hosted_invoice_url: `https://mock-stripe.com/invoices/mock_${Date.now()}`,
          invoice_pdf: `https://mock-stripe.com/invoices/mock_${Date.now()}.pdf`,
          metadata: {
            contract_id: contractId,
            milestone_id: milestoneId,
            platform: 'InfluencerFlow'
          }
        };

        return { success: true, invoice: mockInvoice };
      }

      // Create invoice items first
      const invoiceItems = [];
      for (const item of lineItems) {
        const invoiceItem = await this.stripe.invoiceItems.create({
          customer: customerId,
          amount: item.amount * 100, // Convert to cents
          currency: 'usd',
          description: item.description,
          metadata: {
            contract_id: contractId,
            milestone_id: milestoneId
          }
        });
        invoiceItems.push(invoiceItem);
      }

      // Create the invoice
      const invoice = await this.stripe.invoices.create({
        customer: customerId,
        collection_method: 'send_invoice',
        days_until_due: Math.ceil((new Date(dueDate) - new Date()) / (1000 * 60 * 60 * 24)),
        description,
        metadata: {
          contract_id: contractId,
          milestone_id: milestoneId,
          platform: 'InfluencerFlow'
        }
      });

      return { success: true, invoice, invoiceItems };

    } catch (error) {
      console.error('❌ Failed to create invoice:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send an invoice to the customer
   * @param {string} invoiceId - Invoice ID
   * @returns {Object} Send result
   */
  async sendInvoice(invoiceId) {
    try {
      if (!this.isStripeEnabled) {
        // Simulation mode
        return {
          success: true,
          invoice: {
            id: invoiceId,
            status: 'sent',
            sent_at: Math.floor(Date.now() / 1000)
          }
        };
      }

      const invoice = await this.stripe.invoices.sendInvoice(invoiceId);
      return { success: true, invoice };

    } catch (error) {
      console.error('❌ Failed to send invoice:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Set up payment milestones for a contract
   * @param {Object} contractData - Contract with payment schedule
   * @returns {Object} Payment setup result
   */
  async setupPaymentMilestones(contractData) {
    try {
      const {
        contractId,
        creatorData,
        paymentMilestones,
        campaignTitle
      } = contractData;

      console.log(`💳 Setting up payment milestones for contract ${contractId}...`);

      // Create customer if needed
      const customerResult = await this.createCustomer(creatorData);
      if (!customerResult.success) {
        throw new Error(`Failed to create customer: ${customerResult.error}`);
      }

      const customerId = customerResult.customer.id;
      const milestoneResults = [];

      // Create invoices for each milestone
      for (let i = 0; i < paymentMilestones.length; i++) {
        const milestone = paymentMilestones[i];
        const milestoneId = `milestone_${i + 1}`;

        const invoiceData = {
          customerId,
          contractId,
          milestoneId,
          amount: milestone.amount,
          description: `${campaignTitle} - ${milestone.phase || milestone.description}`,
          dueDate: milestone.dueDate || this.addDays(new Date(), 30).toISOString(),
          lineItems: [
            {
              amount: milestone.amount,
              description: `${milestone.phase || milestone.description} - ${campaignTitle}`
            }
          ]
        };

        const invoiceResult = await this.createInvoice(invoiceData);
        
        if (invoiceResult.success) {
          milestoneResults.push({
            milestoneId,
            phase: milestone.phase,
            amount: milestone.amount,
            invoiceId: invoiceResult.invoice.id,
            status: 'created',
            dueDate: milestone.dueDate
          });

          // Small delay between invoice creations
          await new Promise(resolve => setTimeout(resolve, 500));
        } else {
          milestoneResults.push({
            milestoneId,
            phase: milestone.phase,
            amount: milestone.amount,
            status: 'failed',
            error: invoiceResult.error
          });
        }
      }

      // Store payment record
      const paymentRecord = {
        contractId,
        customerId,
        creatorData,
        totalAmount: paymentMilestones.reduce((sum, m) => sum + m.amount, 0),
        milestones: milestoneResults,
        status: 'setup_complete',
        createdAt: new Date().toISOString()
      };

      this.paymentRecords.set(contractId, paymentRecord);

      console.log(`✅ Payment milestones setup complete for contract ${contractId}`);

      return {
        success: true,
        contractId,
        customerId,
        totalMilestones: milestoneResults.length,
        successfulMilestones: milestoneResults.filter(m => m.status === 'created').length,
        failedMilestones: milestoneResults.filter(m => m.status === 'failed').length,
        milestones: milestoneResults,
        totalAmount: paymentRecord.totalAmount
      };

    } catch (error) {
      console.error('❌ Failed to setup payment milestones:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Process a milestone payment
   * @param {Object} paymentData - Payment information
   * @returns {Object} Payment result
   */
  async processMilestonePayment(paymentData) {
    try {
      const { contractId, milestoneId, paymentMethodId } = paymentData;

      const paymentRecord = this.paymentRecords.get(contractId);
      if (!paymentRecord) {
        throw new Error('Payment record not found for contract');
      }

      const milestone = paymentRecord.milestones.find(m => m.milestoneId === milestoneId);
      if (!milestone) {
        throw new Error('Milestone not found');
      }

      if (!this.isStripeEnabled) {
        // Simulation mode
        milestone.status = 'paid';
        milestone.paidAt = new Date().toISOString();
        milestone.paymentId = `pi_mock_${Date.now()}`;
        
        return {
          success: true,
          payment: {
            id: milestone.paymentId,
            status: 'succeeded',
            amount: milestone.amount * 100,
            currency: 'usd'
          }
        };
      }

      // In a real implementation, you would:
      // 1. Retrieve the invoice
      // 2. Process payment using Stripe
      // 3. Update milestone status

      const mockPayment = {
        id: `pi_${Date.now()}`,
        status: 'succeeded',
        amount: milestone.amount * 100,
        currency: 'usd',
        metadata: {
          contract_id: contractId,
          milestone_id: milestoneId
        }
      };

      milestone.status = 'paid';
      milestone.paidAt = new Date().toISOString();
      milestone.paymentId = mockPayment.id;

      return { success: true, payment: mockPayment };

    } catch (error) {
      console.error('❌ Failed to process milestone payment:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get payment status for a contract
   * @param {string} contractId - Contract identifier
   * @returns {Object} Payment status
   */
  getPaymentStatus(contractId) {
    const paymentRecord = this.paymentRecords.get(contractId);
    
    if (!paymentRecord) {
      return { found: false, contractId };
    }

    const totalMilestones = paymentRecord.milestones.length;
    const paidMilestones = paymentRecord.milestones.filter(m => m.status === 'paid').length;
    const pendingMilestones = paymentRecord.milestones.filter(m => m.status === 'created').length;
    const failedMilestones = paymentRecord.milestones.filter(m => m.status === 'failed').length;

    const totalPaid = paymentRecord.milestones
      .filter(m => m.status === 'paid')
      .reduce((sum, m) => sum + m.amount, 0);

    return {
      found: true,
      contractId,
      customerId: paymentRecord.customerId,
      totalAmount: paymentRecord.totalAmount,
      totalPaid,
      remaining: paymentRecord.totalAmount - totalPaid,
      milestones: {
        total: totalMilestones,
        paid: paidMilestones,
        pending: pendingMilestones,
        failed: failedMilestones
      },
      milestoneDetails: paymentRecord.milestones,
      status: paidMilestones === totalMilestones ? 'completed' : 
              paidMilestones > 0 ? 'partially_paid' : 'pending',
      createdAt: paymentRecord.createdAt
    };
  }

  /**
   * List all payment records
   * @returns {Array} Payment records
   */
  listPaymentRecords() {
    return Array.from(this.paymentRecords.values());
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
   * Create a payout to creator (for when brand pays)
   * @param {Object} payoutData - Payout information
   * @returns {Object} Payout result
   */
  async createCreatorPayout(payoutData) {
    try {
      const { creatorData, amount, description, metadata = {} } = payoutData;

      if (!this.isStripeEnabled) {
        // Simulation mode
        return {
          success: true,
          payout: {
            id: `po_mock_${Date.now()}`,
            amount: amount * 100,
            currency: 'usd',
            status: 'paid',
            description,
            destination: `acct_mock_${creatorData.id}`,
            metadata
          }
        };
      }

      // In a real implementation, you would:
      // 1. Ensure creator has a connected Stripe account
      // 2. Create a transfer to their account
      // This requires Stripe Connect setup

      const mockPayout = {
        id: `po_${Date.now()}`,
        amount: amount * 100,
        currency: 'usd',
        status: 'pending',
        description,
        destination: `acct_${creatorData.id}`,
        metadata: {
          creator_id: creatorData.id,
          creator_name: creatorData.name,
          ...metadata
        }
      };

      return { success: true, payout: mockPayout };

    } catch (error) {
      console.error('❌ Failed to create creator payout:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = PaymentsCoordinatorService; 
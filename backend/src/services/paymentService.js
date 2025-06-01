const Razorpay = require('razorpay');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

class PaymentService {
  constructor() {
    // Initialize Razorpay only if credentials are available
    if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
      this.razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET
      });
      this.isConfigured = true;
    } else {
      console.warn('Razorpay credentials not configured. Payment functionality will be limited.');
      this.razorpay = null;
      this.isConfigured = false;
    }
  }

  // Create payment order
  async createPaymentOrder(paymentData) {
    try {
      if (!this.isConfigured) {
        throw new Error('Razorpay is not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables.');
      }

      const {
        amount, // in INR paise (multiply by 100)
        currency = 'INR',
        contractId,
        creatorId,
        campaignId,
        description
      } = paymentData;

      const options = {
        amount: Math.round(amount * 100), // Convert to paise
        currency,
        receipt: `receipt_${contractId}_${Date.now()}`,
        notes: {
          contractId,
          creatorId,
          campaignId,
          paymentType: 'influencer_payment'
        }
      };

      const order = await this.razorpay.orders.create(options);

      return {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
        status: order.status,
        createdAt: new Date(order.created_at * 1000).toISOString(),
        notes: order.notes
      };
    } catch (error) {
      console.error('Payment order creation error:', error);
      throw new Error('Failed to create payment order');
    }
  }

  // Verify payment signature
  verifyPaymentSignature(paymentData) {
    try {
      if (!this.isConfigured) {
        console.warn('Razorpay not configured. Payment verification skipped.');
        return false;
      }

      const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature
      } = paymentData;

      const body = razorpay_order_id + '|' + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest('hex');

      return expectedSignature === razorpay_signature;
    } catch (error) {
      console.error('Payment verification error:', error);
      return false;
    }
  }

  // Process payment after contract completion
  async processContractPayment(contractData) {
    try {
      const {
        contractId,
        creatorId,
        campaignId,
        finalBudget,
        creatorEmail,
        creatorName,
        milestones = []
      } = contractData;

      // Check if this is milestone-based payment
      if (milestones.length > 0) {
        return await this.processMilestonePayments(contractData);
      }

      // Single payment
      const paymentOrder = await this.createPaymentOrder({
        amount: finalBudget,
        contractId,
        creatorId,
        campaignId,
        description: `Payment for campaign: ${campaignId}`
      });

      // Create payment record
      const paymentRecord = {
        id: uuidv4(),
        contractId,
        creatorId,
        campaignId,
        orderId: paymentOrder.orderId,
        amount: finalBudget,
        currency: 'INR',
        status: 'pending',
        type: 'full_payment',
        createdAt: new Date().toISOString(),
        creatorDetails: {
          email: creatorEmail,
          name: creatorName
        }
      };

      return {
        paymentRecord,
        paymentOrder,
        paymentUrl: this.generatePaymentUrl(paymentOrder)
      };
    } catch (error) {
      console.error('Contract payment processing error:', error);
      throw new Error('Failed to process contract payment');
    }
  }

  // Process milestone-based payments
  async processMilestonePayments(contractData) {
    try {
      const { milestones, finalBudget } = contractData;
      const paymentRecords = [];

      for (const milestone of milestones) {
        if (milestone.status === 'completed' && !milestone.paid) {
          const milestoneAmount = (milestone.percentage / 100) * finalBudget;
          
          const paymentOrder = await this.createPaymentOrder({
            amount: milestoneAmount,
            contractId: contractData.contractId,
            creatorId: contractData.creatorId,
            campaignId: contractData.campaignId,
            description: `Milestone payment: ${milestone.name}`
          });

          const paymentRecord = {
            id: uuidv4(),
            contractId: contractData.contractId,
            creatorId: contractData.creatorId,
            campaignId: contractData.campaignId,
            milestoneId: milestone.id,
            orderId: paymentOrder.orderId,
            amount: milestoneAmount,
            currency: 'INR',
            status: 'pending',
            type: 'milestone_payment',
            milestoneName: milestone.name,
            createdAt: new Date().toISOString()
          };

          paymentRecords.push({
            paymentRecord,
            paymentOrder,
            paymentUrl: this.generatePaymentUrl(paymentOrder)
          });
        }
      }

      return paymentRecords;
    } catch (error) {
      console.error('Milestone payment processing error:', error);
      throw new Error('Failed to process milestone payments');
    }
  }

  // Generate payment URL for frontend
  generatePaymentUrl(paymentOrder) {
    return `${process.env.FRONTEND_URL}/payment?orderId=${paymentOrder.orderId}&amount=${paymentOrder.amount}`;
  }

  // Handle payment webhook
  async handlePaymentWebhook(webhookData, signature) {
    try {
      // Verify webhook signature
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
        .update(JSON.stringify(webhookData))
        .digest('hex');

      if (expectedSignature !== signature) {
        throw new Error('Invalid webhook signature');
      }

      const { event, payload } = webhookData;

      switch (event) {
        case 'payment.captured':
          return await this.handlePaymentCaptured(payload.payment.entity);
        case 'payment.failed':
          return await this.handlePaymentFailed(payload.payment.entity);
        case 'order.paid':
          return await this.handleOrderPaid(payload.order.entity);
        default:
          console.log('Unhandled webhook event:', event);
          return { status: 'ignored', event };
      }
    } catch (error) {
      console.error('Payment webhook handling error:', error);
      throw new Error('Failed to handle payment webhook');
    }
  }

  // Handle successful payment
  async handlePaymentCaptured(paymentEntity) {
    try {
      const { id, order_id, amount, currency, status, notes } = paymentEntity;

      // Update payment record
      const updateData = {
        paymentId: id,
        status: 'completed',
        amount: amount / 100, // Convert from paise
        currency,
        capturedAt: new Date().toISOString(),
        razorpayData: paymentEntity
      };

      // If this is a milestone payment, mark milestone as paid
      if (notes && notes.milestoneId) {
        updateData.milestonePayment = true;
      }

      // Send payment confirmation email
      await this.sendPaymentConfirmation(updateData, notes);

      return {
        status: 'success',
        paymentId: id,
        orderId: order_id,
        amount: amount / 100,
        updateData
      };
    } catch (error) {
      console.error('Payment captured handling error:', error);
      throw error;
    }
  }

  // Handle failed payment
  async handlePaymentFailed(paymentEntity) {
    try {
      const { id, order_id, error_code, error_description } = paymentEntity;

      const updateData = {
        paymentId: id,
        status: 'failed',
        errorCode: error_code,
        errorDescription: error_description,
        failedAt: new Date().toISOString()
      };

      // Send payment failure notification
      await this.sendPaymentFailureNotification(updateData, paymentEntity.notes);

      return {
        status: 'failed',
        paymentId: id,
        orderId: order_id,
        errorCode: error_code,
        updateData
      };
    } catch (error) {
      console.error('Payment failed handling error:', error);
      throw error;
    }
  }

  // Handle order paid
  async handleOrderPaid(orderEntity) {
    try {
      const { id, amount, status, notes } = orderEntity;

      return {
        status: 'order_paid',
        orderId: id,
        amount: amount / 100,
        notes
      };
    } catch (error) {
      console.error('Order paid handling error:', error);
      throw error;
    }
  }

  // Send payment confirmation email
  async sendPaymentConfirmation(paymentData, notes) {
    try {
      // This would integrate with your email service
      console.log('Sending payment confirmation:', {
        contractId: notes?.contractId,
        amount: paymentData.amount,
        status: paymentData.status
      });

      // Implementation would call emailService.sendEmail() here
      return true;
    } catch (error) {
      console.error('Payment confirmation email error:', error);
      return false;
    }
  }

  // Send payment failure notification
  async sendPaymentFailureNotification(paymentData, notes) {
    try {
      console.log('Sending payment failure notification:', {
        contractId: notes?.contractId,
        errorCode: paymentData.errorCode,
        errorDescription: paymentData.errorDescription
      });

      // Implementation would call emailService.sendEmail() here
      return true;
    } catch (error) {
      console.error('Payment failure notification error:', error);
      return false;
    }
  }

  // Get payment status
  async getPaymentStatus(paymentId) {
    try {
      const payment = await this.razorpay.payments.fetch(paymentId);
      
      return {
        id: payment.id,
        orderId: payment.order_id,
        amount: payment.amount / 100,
        currency: payment.currency,
        status: payment.status,
        method: payment.method,
        createdAt: new Date(payment.created_at * 1000).toISOString(),
        captured: payment.captured,
        notes: payment.notes
      };
    } catch (error) {
      console.error('Payment status fetch error:', error);
      throw new Error('Failed to fetch payment status');
    }
  }

  // Refund payment
  async refundPayment(paymentId, amount = null, reason = 'Contract cancellation') {
    try {
      const refundOptions = {
        payment_id: paymentId,
        notes: {
          reason,
          refundedAt: new Date().toISOString()
        }
      };

      if (amount) {
        refundOptions.amount = Math.round(amount * 100); // Convert to paise
      }

      const refund = await this.razorpay.payments.refund(paymentId, refundOptions);

      return {
        id: refund.id,
        paymentId: refund.payment_id,
        amount: refund.amount / 100,
        currency: refund.currency,
        status: refund.status,
        createdAt: new Date(refund.created_at * 1000).toISOString(),
        notes: refund.notes
      };
    } catch (error) {
      console.error('Payment refund error:', error);
      throw new Error('Failed to process refund');
    }
  }

  // Create payout to creator (for platforms that handle creator payments)
  async createPayout(payoutData) {
    try {
      const {
        amount,
        currency = 'INR',
        mode = 'IMPS',
        purpose = 'payout',
        account_number,
        fund_account_id,
        notes
      } = payoutData;

      // Note: This requires Razorpay X (current account) setup
      const payout = await this.razorpay.payouts.create({
        account_number,
        fund_account_id,
        amount: Math.round(amount * 100),
        currency,
        mode,
        purpose,
        queue_if_low_balance: true,
        reference_id: `payout_${Date.now()}`,
        narration: 'Influencer Payment',
        notes
      });

      return {
        id: payout.id,
        amount: payout.amount / 100,
        currency: payout.currency,
        status: payout.status,
        mode: payout.mode,
        createdAt: new Date(payout.created_at * 1000).toISOString()
      };
    } catch (error) {
      console.error('Payout creation error:', error);
      throw new Error('Failed to create payout');
    }
  }

  // Calculate platform fees
  calculatePlatformFee(amount, feePercentage = 5) {
    const fee = (amount * feePercentage) / 100;
    const creatorAmount = amount - fee;
    
    return {
      totalAmount: amount,
      platformFee: fee,
      creatorAmount,
      feePercentage
    };
  }

  // Generate payment report
  async generatePaymentReport(filters = {}) {
    try {
      const {
        startDate,
        endDate,
        status,
        contractId,
        creatorId
      } = filters;

      // This would typically query your database
      // For now, returning a sample structure
      return {
        summary: {
          totalPayments: 0,
          totalAmount: 0,
          completedPayments: 0,
          pendingPayments: 0,
          failedPayments: 0
        },
        payments: [],
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Payment report generation error:', error);
      throw new Error('Failed to generate payment report');
    }
  }
}

module.exports = new PaymentService(); 
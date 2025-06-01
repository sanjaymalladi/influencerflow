const { outreachEmailsData, creatorsData } = require('../utils/dataStorage');

class ReplyDetectionService {
  constructor() {
    this.replyHandlers = new Map();
    this.pendingHumanApprovals = new Map();
    this.conversations = new Map(); // Track conversation state
  }

  // Webhook handler for MailerSend/Gmail reply notifications
  async handleIncomingEmail(emailData) {
    try {
      console.log('📬 Incoming email detected:', emailData);

      // Extract original email ID from thread or message-id
      const originalEmailId = this.extractOriginalEmailId(emailData);
      if (!originalEmailId) {
        console.log('❌ Could not match reply to original email');
        return;
      }

      // Get original outreach email
      const originalEmail = outreachEmailsData.findById(originalEmailId);
      if (!originalEmail) {
        console.log('❌ Original email not found:', originalEmailId);
        return;
      }

      // Update email status to replied
      const updatedEmail = outreachEmailsData.update(originalEmailId, {
        status: 'replied',
        repliedAt: new Date().toISOString(),
        openedAt: originalEmail.openedAt || new Date().toISOString(),
        notes: `Reply received: ${emailData.text.substring(0, 100)}...`
      });

      console.log('✅ Email status updated to replied');

      // Get or create conversation state
      const conversationId = `conv-${originalEmailId}`;
      let conversation = this.conversations.get(conversationId) || {
        id: conversationId,
        emailId: originalEmailId,
        creatorId: originalEmail.creatorId,
        campaignId: originalEmail.campaignId,
        stage: 'initial_contact',
        messages: [],
        negotiationTerms: {
          originalBudget: null,
          currentBudget: null,
          deliverables: [],
          timeline: null,
          terms: []
        },
        createdAt: new Date().toISOString()
      };

      // Add this reply to conversation history
      conversation.messages.push({
        id: `msg-${Date.now()}`,
        from: 'creator',
        content: emailData.text,
        timestamp: new Date().toISOString(),
        type: 'reply'
      });

      // Analyze the reply with enhanced AI
      const analysis = await this.analyzeReplyWithContext(emailData.text, originalEmail, conversation);
      
      // Update conversation stage based on analysis
      conversation.stage = analysis.suggestedStage || conversation.stage;
      conversation.lastActivity = new Date().toISOString();
      
      // Store updated conversation
      this.conversations.set(conversationId, conversation);

      // Handle the response based on stage and analysis
      if (analysis.requiresHumanApproval) {
        await this.escalateToHuman(conversation, analysis, emailData.text);
      } else {
        await this.sendAIResponse(conversation, analysis);
      }

      return {
        success: true,
        emailId: originalEmailId,
        analysis: analysis,
        conversation: conversation,
        requiresApproval: analysis.requiresHumanApproval
      };

    } catch (error) {
      console.error('❌ Error handling incoming email:', error);
      return { success: false, error: error.message };
    }
  }

  // Extract original email ID from reply
  extractOriginalEmailId(emailData) {
    // Try to extract from subject line
    const subjectMatch = emailData.subject.match(/\[EMAIL-ID-(\d+)\]/);
    if (subjectMatch) {
      const timestampId = subjectMatch[1];
      
      // Find email by timestamp in messageId or custom field
      const allEmails = outreachEmailsData.getAll();
      const emailByTimestamp = allEmails.find(email => 
        email.messageId && email.messageId.includes(timestampId) ||
        email.emailId === `EMAIL-ID-${timestampId}` ||
        email.customEmailId === timestampId ||
        (email.sentAt && Math.abs(new Date(email.sentAt).getTime() - parseInt(timestampId)) < 60000) // Within 1 minute
      );
      
      if (emailByTimestamp) {
        return emailByTimestamp.id;
      }
      
      // Fallback: return the timestamp as is for debugging
      console.log(`🔍 No email found for timestamp ${timestampId}, searching by other criteria...`);
    }

    // Try to extract from references or in-reply-to headers
    if (emailData.references && emailData.references.length > 0) {
      for (const ref of emailData.references) {
        const refMatch = ref.match(/EMAIL-ID-(\d+)/);
        if (refMatch) {
          const timestampId = refMatch[1];
          const allEmails = outreachEmailsData.getAll();
          const emailByTimestamp = allEmails.find(email => 
            email.messageId && email.messageId.includes(timestampId) ||
            email.emailId === `EMAIL-ID-${timestampId}` ||
            email.customEmailId === timestampId
          );
          
          if (emailByTimestamp) {
            return emailByTimestamp.id;
          }
        }
      }
    }

    // Try to match by recipient email and recent timeframe
    const recipientEmail = emailData.to.email;
    const recentEmails = outreachEmailsData.getAll().filter(email => 
      email.recipientEmail === recipientEmail && 
      email.status === 'sent' &&
      new Date(email.sentAt) > new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
    );

    if (recentEmails.length === 1) {
      return recentEmails[0].id;
    }
    
    // If multiple recent emails, try to find the most recent one
    if (recentEmails.length > 1) {
      const mostRecent = recentEmails.sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt))[0];
      console.log(`🔍 Multiple recent emails found, using most recent: ${mostRecent.id}`);
      return mostRecent.id;
    }

    console.log(`🔍 No matching email found for recipient: ${recipientEmail}`);
    console.log(`🔍 Email data:`, {
      subject: emailData.subject,
      references: emailData.references,
      inReplyTo: emailData.inReplyTo
    });
    
    return null;
  }

  // Enhanced AI analysis with conversation context
  async analyzeReplyWithContext(replyText, originalEmail, conversation) {
    try {
      const analysis = {
        sentiment: this.analyzeSentiment(replyText),
        intent: this.analyzeIntentWithContext(replyText, conversation.stage),
        requiresHumanApproval: false,
        suggestedResponse: '',
        suggestedStage: conversation.stage,
        priority: 'medium',
        keyPoints: this.extractKeyPoints(replyText),
        extractedInfo: this.extractNegotiationInfo(replyText),
        actionType: 'respond'
      };

      // Stage-specific analysis
      switch (conversation.stage) {
        case 'initial_contact':
          if (analysis.intent === 'interested') {
            analysis.suggestedStage = 'interested';
            analysis.suggestedResponse = this.generateDetailsResponse(originalEmail, conversation);
            analysis.actionType = 'provide_details';
          } else if (analysis.intent === 'rejection') {
            analysis.suggestedStage = 'rejected';
            analysis.suggestedResponse = this.generateRejectionResponse();
            analysis.actionType = 'close_conversation';
          }
          break;

        case 'interested':
        case 'negotiating':
          if (this.containsNegotiation(replyText)) {
            analysis.requiresHumanApproval = true;
            analysis.priority = 'high';
            analysis.suggestedStage = 'negotiating';
            analysis.actionType = 'negotiate_terms';
            analysis.humanMessage = this.generateHumanEscalationMessage(analysis.extractedInfo, replyText);
          } else if (analysis.intent === 'agreement') {
            analysis.suggestedStage = 'terms_agreed';
            analysis.suggestedResponse = this.generateContractResponse(conversation);
            analysis.actionType = 'send_contract';
          }
          break;

        case 'terms_agreed':
          if (analysis.intent === 'agreement') {
            analysis.requiresHumanApproval = true;
            analysis.priority = 'high';
            analysis.suggestedStage = 'contract_pending';
            analysis.actionType = 'generate_contract';
            analysis.humanMessage = 'Creator agreed to terms. Please review and approve contract generation.';
          }
          break;

        case 'contract_sent':
          if (this.containsSignedContract(replyText)) {
            analysis.requiresHumanApproval = true;
            analysis.priority = 'high';
            analysis.suggestedStage = 'contract_signed';
            analysis.actionType = 'verify_contract';
            analysis.humanMessage = 'Creator has returned signed contract. Please verify and approve.';
          }
          break;
      }

      return analysis;
    } catch (error) {
      console.error('❌ Error analyzing reply with context:', error);
      return {
        sentiment: 'neutral',
        intent: 'unknown',
        requiresHumanApproval: true,
        priority: 'medium',
        suggestedResponse: '',
        keyPoints: [],
        actionType: 'escalate'
      };
    }
  }

  // Enhanced intent analysis with conversation context
  analyzeIntentWithContext(text, currentStage) {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('interested') || lowerText.includes('tell me more') || lowerText.includes('details')) {
      return 'interested';
    }
    if (lowerText.includes('agree') || lowerText.includes('sounds good') || lowerText.includes('fine') || lowerText.includes('ok')) {
      return 'agreement';
    }
    if (lowerText.includes('not interested') || lowerText.includes('no thanks') || lowerText.includes('pass')) {
      return 'rejection';
    }
    if (lowerText.includes('but') || lowerText.includes('however') || lowerText.includes('instead') || lowerText.includes('can we')) {
      return 'negotiation';
    }
    if (lowerText.includes('?')) {
      return 'question';
    }
    
    return 'general';
  }

  // Check if message contains negotiation terms
  containsNegotiation(text) {
    const negotiationKeywords = [
      'instead', 'but', 'however', 'can we', 'what about', 'prefer', 
      'budget', 'timeline', 'deliverable', 'video', 'post', 'minute',
      'duration', 'length', 'shorter', 'longer', 'less', 'more'
    ];
    
    const lowerText = text.toLowerCase();
    return negotiationKeywords.some(keyword => lowerText.includes(keyword));
  }

  // Extract negotiation information from text
  extractNegotiationInfo(text) {
    const info = {};
    
    // Extract video duration preferences
    const durationMatch = text.match(/(\d+)\s*min/i);
    if (durationMatch) {
      info.preferredDuration = parseInt(durationMatch[1]);
    }
    
    // Extract budget mentions
    const budgetMatch = text.match(/\$?(\d+(?:,\d+)*(?:\.\d+)?)/);
    if (budgetMatch) {
      info.budgetMention = parseFloat(budgetMatch[1].replace(/,/g, ''));
    }
    
    // Extract deliverable counts
    const postMatch = text.match(/(\d+)\s*(?:instagram\s+)?posts?/i);
    if (postMatch) {
      info.instagramPosts = parseInt(postMatch[1]);
    }
    
    return info;
  }

  // Check if message contains signed contract
  containsSignedContract(text) {
    const contractKeywords = ['signed', 'contract', 'attachment', 'pdf', 'document'];
    const lowerText = text.toLowerCase();
    return contractKeywords.some(keyword => lowerText.includes(keyword));
  }

  // Generate detailed response for interested creators
  generateDetailsResponse(originalEmail, conversation) {
    const creator = creatorsData.findById(originalEmail.creatorId);
    
    return `Hi ${creator?.channelName || 'there'}!

Thank you for your interest! I'm excited to share more details about this collaboration opportunity.

📋 **Campaign Details:**
• **Project**: Tech Product Launch Campaign
• **Content Type**: Product review video + social media promotion
• **Timeline**: 4 weeks from signing
• **Budget**: $15,000 total compensation

🎥 **Deliverables:**
• 1x Product review video (15 minutes, professional quality)
• 3x Instagram posts (feed + stories)
• 1x Twitter/X thread about the product
• Full usage rights for our marketing materials

📅 **Timeline:**
• Week 1: Product delivery & briefing
• Week 2-3: Content creation
• Week 4: Content review & publication

💰 **Payment Schedule:**
• 50% upfront upon contract signing
• 50% upon content delivery and approval

Given your expertise in ${creator?.categories?.join(', ') || 'tech content'} and your engaged audience of ${creator?.subscribers?.toLocaleString() || 'loyal followers'}, I believe this would be a perfect fit!

Are you comfortable with these terms? I'm happy to discuss any questions or adjustments you might have.

Looking forward to working together!

Best regards,
Campaign Manager
InfluencerFlow Team`;
  }

  // Generate contract preparation response
  generateContractResponse(conversation) {
    return `Perfect! I'm thrilled that we're aligned on the collaboration details.

I'll now prepare the official partnership contract with all the terms we've discussed. This will include:

✅ All deliverables and specifications
✅ Timeline and milestones  
✅ Payment terms and schedule
✅ Usage rights and guidelines
✅ Legal terms and conditions

I'll have the contract ready for your review within 24 hours. Once you review and sign it digitally, we can officially kick off this exciting collaboration!

I'll also arrange for the product to be shipped to you so you can start familiarizing yourself with it.

Thank you for choosing to partner with us!

Best regards,
Campaign Manager
InfluencerFlow Team`;
  }

  // Generate human escalation message
  generateHumanEscalationMessage(extractedInfo, originalText) {
    let message = `🤖 **AI ESCALATION NEEDED**\n\n`;
    message += `Creator has responded with negotiation terms that require human approval:\n\n`;
    message += `**Creator's Message:**\n"${originalText.substring(0, 200)}..."\n\n`;
    message += `**Extracted Information:**\n`;
    
    if (extractedInfo.preferredDuration) {
      message += `• Prefers ${extractedInfo.preferredDuration}-minute video instead of 15 minutes\n`;
    }
    if (extractedInfo.instagramPosts) {
      message += `• Mentioned ${extractedInfo.instagramPosts} Instagram posts\n`;
    }
    if (extractedInfo.budgetMention) {
      message += `• Budget mentioned: $${extractedInfo.budgetMention.toLocaleString()}\n`;
    }
    
    message += `\n**Recommended Actions:**\n`;
    message += `1. Review the proposed changes\n`;
    message += `2. Decide if terms are acceptable\n`;
    message += `3. Provide counter-offer if needed\n`;
    message += `4. Approve AI response or craft custom message`;
    
    return message;
  }

  // Send auto-response
  async sendAutoResponse(emailId, responseText) {
    try {
      const originalEmail = outreachEmailsData.findById(emailId);
      if (!originalEmail) return;

      // Get creator info for the response
      const creator = creatorsData.findById(originalEmail.creatorId);
      if (!creator || !creator.contactEmail) {
        console.log('❌ Creator contact email not found');
        return;
      }

      console.log('📧 Preparing auto-response to:', creator.contactEmail);
      console.log('Response text:', responseText.substring(0, 100) + '...');
      
      // Instead of directly calling emailService (circular dependency), 
      // we'll just log the response and update the email status
      // The actual sending will be handled by a separate process
      
      // Update email with response sent
      outreachEmailsData.update(emailId, {
        autoResponseSent: true,
        autoResponseAt: new Date().toISOString(),
        notes: (originalEmail.notes || '') + '\n\nAuto-response prepared: ' + responseText.substring(0, 50) + '...',
        pendingAutoResponse: {
          to: creator.contactEmail,
          subject: `Re: ${originalEmail.subject}`,
          body: responseText,
          createdAt: new Date().toISOString()
        }
      });
      
      console.log('✅ Auto-response prepared and queued');
      
    } catch (error) {
      console.error('❌ Error preparing auto-response:', error);
    }
  }

  // Simulate an incoming reply for demo/testing purposes
  async simulateIncomingReply(emailId, replyContent) {
    try {
      const originalEmail = outreachEmailsData.findById(emailId);
      if (!originalEmail) {
        throw new Error('Original email not found');
      }

      const creator = creatorsData.findById(originalEmail.creatorId);
      if (!creator) {
        throw new Error('Creator not found');
      }

      // Create simulated email data structure
      const emailData = {
        from: {
          email: creator.contactEmail || creator.email || `${creator.channelName.toLowerCase().replace(/\s+/g, '')}@example.com`,
          name: creator.channelName
        },
        to: {
          email: 'outreach@influencerflow.com',
          name: 'InfluencerFlow Team'
        },
        subject: `Re: ${originalEmail.subject}`,
        text: replyContent,
        messageId: `simulated-reply-${Date.now()}@example.com`,
        references: originalEmail.messageId ? [originalEmail.messageId] : [],
        inReplyTo: originalEmail.messageId || '',
        timestamp: new Date().toISOString()
      };

      // Process the simulated reply through the normal flow
      return await this.handleIncomingEmail(emailData);

    } catch (error) {
      console.error('❌ Error simulating incoming reply:', error);
      throw error;
    }
  }

  // Get pending approvals
  getPendingApprovals() {
    return Array.from(this.pendingHumanApprovals.values());
  }

  // Approve and send response
  async approveResponse(approvalId, responseText, userId) {
    try {
      const approval = this.pendingHumanApprovals.get(approvalId);
      if (!approval) {
        throw new Error('Approval not found');
      }

      // Send the approved response
      await this.sendAutoResponse(approval.emailId, responseText);
      
      // Mark approval as completed
      approval.status = 'approved';
      approval.approvedBy = userId;
      approval.approvedAt = new Date().toISOString();
      approval.finalResponse = responseText;
      
      console.log('✅ Response approved and sent');
      return { success: true };
      
    } catch (error) {
      console.error('❌ Error approving response:', error);
      return { success: false, error: error.message };
    }
  }

  // Reject approval
  async rejectResponse(approvalId, reason, userId) {
    try {
      const approval = this.pendingHumanApprovals.get(approvalId);
      if (!approval) {
        throw new Error('Approval not found');
      }

      approval.status = 'rejected';
      approval.rejectedBy = userId;
      approval.rejectedAt = new Date().toISOString();
      approval.rejectionReason = reason;
      
      console.log('❌ Response rejected');
      return { success: true };
      
    } catch (error) {
      console.error('❌ Error rejecting response:', error);
      return { success: false, error: error.message };
    }
  }

  // Escalate conversation to human for approval
  async escalateToHuman(conversation, analysis, originalReply) {
    const approvalId = `approval-${Date.now()}`;
    this.pendingHumanApprovals.set(approvalId, {
      id: approvalId,
      conversationId: conversation.id,
      emailId: conversation.emailId,
      replyContent: originalReply,
      analysis: analysis,
      conversation: conversation,
      humanMessage: analysis.humanMessage,
      createdAt: new Date().toISOString(),
      status: 'pending',
      priority: analysis.priority || 'medium',
      actionType: analysis.actionType
    });
    
    console.log(`🤖 Conversation escalated to human - ${analysis.actionType}`);
    return approvalId;
  }

  // Send AI response automatically
  async sendAIResponse(conversation, analysis) {
    try {
      const originalEmail = outreachEmailsData.findById(conversation.emailId);
      const creator = creatorsData.findById(conversation.creatorId);
      
      if (!originalEmail || !creator) {
        console.error('❌ Missing original email or creator data');
        return;
      }

      // Add AI response to conversation history
      conversation.messages.push({
        id: `msg-${Date.now()}`,
        from: 'ai',
        content: analysis.suggestedResponse,
        timestamp: new Date().toISOString(),
        type: 'ai_response',
        actionType: analysis.actionType
      });

      // Update conversation
      this.conversations.set(conversation.id, conversation);

      console.log(`🤖 AI auto-response prepared for ${creator.channelName}: ${analysis.actionType}`);
      
      // In a real implementation, this would send the email
      // For now, we'll just prepare it for the demo
      outreachEmailsData.update(conversation.emailId, {
        aiResponsePending: true,
        aiResponseAt: new Date().toISOString(),
        conversationStage: conversation.stage,
        pendingResponse: {
          to: creator.contactEmail || creator.email,
          subject: `Re: ${originalEmail.subject}`,
          body: analysis.suggestedResponse,
          actionType: analysis.actionType,
          createdAt: new Date().toISOString()
        }
      });
      
      return true;
    } catch (error) {
      console.error('❌ Error sending AI response:', error);
      return false;
    }
  }

  // Generate rejection response
  generateRejectionResponse() {
    return `Thank you for taking the time to consider our collaboration proposal.

I completely understand that this opportunity may not align with your current priorities or content strategy. 

If circumstances change in the future or you'd like to explore other collaboration opportunities, please don't hesitate to reach out. We'd love to work with you when the timing is right.

Thank you again for your time and consideration.

Best regards,
Campaign Manager
InfluencerFlow Team`;
  }

  // Simple sentiment analysis
  analyzeSentiment(text) {
    const positiveWords = ['interested', 'great', 'love', 'excited', 'yes', 'awesome', 'perfect', 'agree', 'sounds good'];
    const negativeWords = ['not interested', 'no', 'spam', 'unsubscribe', 'stop', 'annoying', 'pass'];
    
    const lowerText = text.toLowerCase();
    const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  // Extract key points from reply
  extractKeyPoints(text) {
    const points = [];
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    
    sentences.forEach(sentence => {
      const trimmed = sentence.trim();
      if (trimmed.includes('?')) {
        points.push({ type: 'question', content: trimmed });
      } else if (trimmed.toLowerCase().includes('interested')) {
        points.push({ type: 'interest', content: trimmed });
      } else if (trimmed.toLowerCase().includes('budget') || trimmed.toLowerCase().includes('price')) {
        points.push({ type: 'pricing', content: trimmed });
      } else if (this.containsNegotiation(trimmed)) {
        points.push({ type: 'negotiation', content: trimmed });
      }
    });
    
    return points;
  }

  // Get conversation by email ID
  getConversationByEmailId(emailId) {
    const conversationId = `conv-${emailId}`;
    return this.conversations.get(conversationId);
  }

  // Get all conversations
  getAllConversations() {
    return Array.from(this.conversations.values());
  }

  // Update conversation stage manually
  updateConversationStage(conversationId, stage, humanNotes = '') {
    const conversation = this.conversations.get(conversationId);
    if (conversation) {
      conversation.stage = stage;
      conversation.lastActivity = new Date().toISOString();
      if (humanNotes) {
        conversation.humanNotes = conversation.humanNotes || [];
        conversation.humanNotes.push({
          note: humanNotes,
          timestamp: new Date().toISOString()
        });
      }
      this.conversations.set(conversationId, conversation);
      return conversation;
    }
    return null;
  }

  // Handle human approval with custom response
  async handleHumanApproval(approvalId, action, customResponse = '', humanNotes = '') {
    try {
      const approval = this.pendingHumanApprovals.get(approvalId);
      if (!approval) {
        throw new Error('Approval not found');
      }

      const conversation = approval.conversation;

      if (action === 'approve') {
        // Send the AI suggested response or custom response
        const responseText = customResponse || approval.analysis.suggestedResponse;
        
        conversation.messages.push({
          id: `msg-${Date.now()}`,
          from: 'human',
          content: responseText,
          timestamp: new Date().toISOString(),
          type: 'human_approved',
          originalAISuggestion: approval.analysis.suggestedResponse,
          humanNotes: humanNotes
        });

        // Update conversation stage
        conversation.stage = approval.analysis.suggestedStage;
        conversation.lastActivity = new Date().toISOString();
        
        await this.sendApprovedResponse(conversation.emailId, responseText);
        
      } else if (action === 'reject') {
        conversation.messages.push({
          id: `msg-${Date.now()}`,
          from: 'human',
          content: 'Human rejected AI suggestion',
          timestamp: new Date().toISOString(),
          type: 'human_rejected',
          rejectionReason: humanNotes
        });
      }

      // Mark approval as handled
      approval.status = action === 'approve' ? 'approved' : 'rejected';
      approval.handledAt = new Date().toISOString();
      approval.humanNotes = humanNotes;

      this.conversations.set(conversation.id, conversation);
      
      console.log(`✅ Human ${action}ed conversation: ${approval.actionType}`);
      return { success: true, conversation };
      
    } catch (error) {
      console.error('❌ Error handling human approval:', error);
      return { success: false, error: error.message };
    }
  }

  // Send approved response
  async sendApprovedResponse(emailId, responseText) {
    try {
      const originalEmail = outreachEmailsData.findById(emailId);
      const creator = creatorsData.findById(originalEmail.creatorId);
      
      if (!originalEmail || !creator) return;

      // Update email with response sent
      outreachEmailsData.update(emailId, {
        humanResponseSent: true,
        humanResponseAt: new Date().toISOString(),
        pendingResponse: {
          to: creator.contactEmail || creator.email,
          subject: `Re: ${originalEmail.subject}`,
          body: responseText,
          createdAt: new Date().toISOString()
        }
      });
      
      console.log('✅ Human-approved response prepared for sending');
      return true;
      
    } catch (error) {
      console.error('❌ Error sending approved response:', error);
      return false;
    }
  }
}

module.exports = new ReplyDetectionService(); 
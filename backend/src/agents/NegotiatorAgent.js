const { GoogleGenerativeAI } = require('@google/generative-ai');
const EmailReaderService = require('../services/EmailReaderService');
const EmailAutomationService = require('../services/EmailAutomationService');
const CRMLoggerService = require('../services/CRMLoggerService');

class NegotiatorAgent {
    constructor() {
        this.geminiApiKey = process.env.GEMINI_API_KEY;
        this.genAI = this.geminiApiKey ? new GoogleGenerativeAI(this.geminiApiKey) : null;
        
        this.emailReader = new EmailReaderService();
        this.crmLogger = new CRMLoggerService();
        
        // Lazy load EmailAutomationService to avoid constructor issues
        this.emailAutomation = null;
        
        this.negotiationPrompts = {
            analyze: this._getAnalysisPrompt(),
            respond: this._getResponsePrompt(),
            evaluate: this._getEvaluationPrompt()
        };

        this.logs = [];
    }

    /**
     * Add a log message
     * @param {string} message 
     */
    addLog(message) {
        console.log(message);
        this.logs.push(message);
    }

    /**
     * Lazy load EmailAutomationService
     * @returns {EmailAutomationService}
     */
    getEmailAutomation() {
        if (!this.emailAutomation) {
            const EmailAutomationService = require('../services/EmailAutomationService');
            this.emailAutomation = new EmailAutomationService();
        }
        return this.emailAutomation;
    }

    async processIncomingReplies(campaignId, creatorEmails, budgetConstraints = {}) {
        console.log('🤝 NegotiatorAgent: Processing incoming replies...');
        
        try {
            // Read email replies
            const replies = await this.emailReader.readReplies(campaignId, creatorEmails);
            console.log(`📧 Found ${replies.length} replies to process`);

            const processedNegotiations = [];

            for (const reply of replies) {
                const negotiationResult = await this._processIndividualReply(
                    reply, 
                    budgetConstraints
                );
                processedNegotiations.push(negotiationResult);

                // Log communication
                await this.crmLogger.logCommunication({
                    campaignId: reply.campaignId,
                    creatorId: reply.creatorId || 'unknown',
                    creatorEmail: reply.creatorEmail,
                    type: 'reply_received',
                    content: reply.text,
                    metadata: {
                        subject: reply.subject,
                        messageId: reply.messageId,
                        negotiationData: reply.negotiationData
                    }
                });
            }

            return {
                processed: processedNegotiations.length,
                negotiations: processedNegotiations,
                summary: this._generateNegotiationSummary(processedNegotiations)
            };

        } catch (error) {
            console.error('❌ Error processing replies:', error);
            return {
                processed: 0,
                negotiations: [],
                error: error.message
            };
        }
    }

    async _processIndividualReply(reply, budgetConstraints) {
        console.log(`🔍 Analyzing reply from ${reply.creatorEmail}...`);

        try {
            // Extract negotiation data from email
            const negotiationData = this.emailReader.extractNegotiationData(reply.text);
            reply.negotiationData = negotiationData;

            // Use AI to analyze the negotiation
            const aiAnalysis = await this._analyzeNegotiationWithAI(reply, budgetConstraints);
            
            // Determine negotiation strategy
            const strategy = this._determineNegotiationStrategy(aiAnalysis, budgetConstraints);
            
            // Update CRM state
            const negotiationState = await this.crmLogger.updateNegotiationState(
                reply.campaignId,
                reply.creatorId || this._generateCreatorId(reply.creatorEmail),
                {
                    status: strategy.status,
                    proposedRates: negotiationData.rates,
                    budgetConstraints,
                    timeline: negotiationData.timeline,
                    sentiment: negotiationData.sentiment,
                    openToNegotiation: negotiationData.openToNegotiation,
                    aiAnalysis,
                    strategy
                }
            );

            // Execute strategy
            const response = await this._executeNegotiationStrategy(reply, strategy, negotiationState);

            return {
                creatorEmail: reply.creatorEmail,
                negotiationData,
                aiAnalysis,
                strategy,
                response,
                negotiationState,
                requiresHumanApproval: negotiationState.requiresHumanApproval
            };

        } catch (error) {
            console.error(`❌ Error processing reply from ${reply.creatorEmail}:`, error);
            
            // Flag for human review
            await this.crmLogger.flagForHumanReview(
                reply.campaignId,
                reply.creatorId || this._generateCreatorId(reply.creatorEmail),
                'Error processing negotiation',
                { error: error.message, reply }
            );

            return {
                creatorEmail: reply.creatorEmail,
                error: error.message,
                requiresHumanApproval: true
            };
        }
    }

    async _analyzeNegotiationWithAI(reply, budgetConstraints) {
        if (!this.genAI) {
            return this._fallbackAnalysis(reply, budgetConstraints);
        }

        try {
            const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
            
            const prompt = this.negotiationPrompts.analyze
                .replace('[EMAIL_CONTENT]', reply.text)
                .replace('[BUDGET_CONSTRAINTS]', JSON.stringify(budgetConstraints, null, 2));

            const result = await model.generateContent(prompt);
            const analysisText = result.response.text();
            
            // Parse AI response
            return this._parseAIAnalysis(analysisText);

        } catch (error) {
            console.error('❌ AI analysis failed, using fallback:', error);
            return this._fallbackAnalysis(reply, budgetConstraints);
        }
    }

    _determineNegotiationStrategy(aiAnalysis, budgetConstraints) {
        const {
            isWithinBudget,
            negotiationPotential,
            sentiment,
            recommendedAction,
            riskLevel
        } = aiAnalysis;

        let strategy = {
            action: 'negotiate',
            status: 'in_negotiation',
            priority: 'medium',
            autoRespond: false,
            requiresHumanApproval: false
        };

        // Determine strategy based on analysis
        if (isWithinBudget && sentiment === 'positive') {
            strategy = {
                action: 'accept',
                status: 'ready_for_contract',
                priority: 'high',
                autoRespond: true,
                requiresHumanApproval: false
            };
        } else if (!isWithinBudget && riskLevel === 'high') {
            strategy = {
                action: 'flag_for_review',
                status: 'pending_human_review',
                priority: 'high',
                autoRespond: false,
                requiresHumanApproval: true
            };
        } else if (negotiationPotential === 'low' || sentiment === 'negative') {
            strategy = {
                action: 'decline_politely',
                status: 'declined',
                priority: 'low',
                autoRespond: true,
                requiresHumanApproval: false
            };
        }

        // Override for high-value negotiations
        if (budgetConstraints.maxBudget && aiAnalysis.proposedAmount > budgetConstraints.maxBudget * 1.2) {
            strategy.requiresHumanApproval = true;
            strategy.autoRespond = false;
        }

        return strategy;
    }

    async _executeNegotiationStrategy(reply, strategy, negotiationState) {
        console.log(`🎯 Executing strategy: ${strategy.action} for ${reply.creatorEmail}`);

        if (strategy.requiresHumanApproval) {
            await this.crmLogger.flagForHumanReview(
                reply.campaignId,
                negotiationState.creatorId,
                `Strategy requires human approval: ${strategy.action}`,
                { strategy, negotiationState }
            );

            return {
                action: 'flagged_for_review',
                message: 'Negotiation flagged for human approval',
                autoResponse: false
            };
        }

        if (!strategy.autoRespond) {
            return {
                action: 'pending_human_action',
                message: 'Waiting for human to take action',
                autoResponse: false
            };
        }

        // Generate and send auto-response
        const responseEmail = await this._generateResponseEmail(reply, strategy, negotiationState);
        
        try {
            // Lazy load EmailAutomationService
            const emailAutomation = this.getEmailAutomation();
            
            const emailResult = await emailAutomation.sendEmail({
                to: reply.creatorEmail,
                subject: `Re: ${reply.subject?.replace('Re: ', '') || 'Collaboration Discussion'}`,
                html: responseEmail.content,
                emailType: 'negotiation'
            });

            // Log outgoing communication
            await this.crmLogger.logCommunication({
                campaignId: reply.campaignId,
                creatorId: negotiationState.creatorId,
                creatorEmail: reply.creatorEmail,
                type: 'negotiation_response',
                content: responseEmail.content,
                metadata: {
                    strategy: strategy.action,
                    emailId: emailResult.messageId,
                    autoGenerated: true
                }
            });

            return {
                action: strategy.action,
                message: 'Auto-response sent successfully',
                autoResponse: true,
                emailResult
            };

        } catch (error) {
            console.error('❌ Failed to send auto-response:', error);
            return {
                action: 'response_failed',
                message: 'Failed to send auto-response',
                autoResponse: false,
                error: error.message
            };
        }
    }

    async _generateResponseEmail(reply, strategy, negotiationState) {
        const templates = {
            accept: {
                content: `Thank you for your response! Your proposed rates and timeline work perfectly for our campaign.

We're excited to move forward with this collaboration. Our team will prepare the contract with the terms you've outlined and send it over for your review.

Looking forward to working together!`,
                templateData: {
                    responseType: 'acceptance',
                    nextSteps: 'Contract preparation'
                }
            },
            negotiate: {
                content: `Thank you for your interest in collaborating with us! 

We appreciate your proposed rates. Our budget for this campaign is a bit more constrained, and we were hoping to work within a range of [BUDGET_RANGE]. Would you be open to discussing a package that might work for both of us?

We're very interested in working with you and believe this could be a great partnership.`,
                templateData: {
                    responseType: 'counter_offer',
                    budgetRange: this._calculateBudgetRange(negotiationState.budgetConstraints)
                }
            },
            decline_politely: {
                content: `Thank you for taking the time to respond to our collaboration inquiry.

While we appreciate your interest, we don't think this particular campaign is the right fit at this time. However, we'd love to keep you in mind for future opportunities that might align better.

Thank you again for your consideration!`,
                templateData: {
                    responseType: 'polite_decline',
                    futureOpportunities: true
                }
            }
        };

        const template = templates[strategy.action] || templates.negotiate;
        
        // Replace budget placeholder if present
        if (template.content.includes('[BUDGET_RANGE]') && negotiationState.budgetConstraints.maxBudget) {
            const budgetRange = `$${Math.round(negotiationState.budgetConstraints.maxBudget * 0.8)} - $${negotiationState.budgetConstraints.maxBudget}`;
            template.content = template.content.replace('[BUDGET_RANGE]', budgetRange);
        }

        return template;
    }

    _generateNegotiationSummary(negotiations) {
        const summary = {
            total: negotiations.length,
            readyForContract: 0,
            inNegotiation: 0,
            requiresHumanReview: 0,
            declined: 0,
            averageProposedRate: 0,
            sentimentBreakdown: { positive: 0, neutral: 0, negative: 0 }
        };

        let totalRates = 0;
        let rateCount = 0;

        negotiations.forEach(neg => {
            if (neg.strategy?.status === 'ready_for_contract') summary.readyForContract++;
            if (neg.strategy?.status === 'in_negotiation') summary.inNegotiation++;
            if (neg.requiresHumanApproval) summary.requiresHumanReview++;
            if (neg.strategy?.status === 'declined') summary.declined++;

            if (neg.negotiationData?.sentiment) {
                summary.sentimentBreakdown[neg.negotiationData.sentiment]++;
            }

            if (neg.negotiationData?.rates?.highest) {
                totalRates += neg.negotiationData.rates.highest;
                rateCount++;
            }
        });

        if (rateCount > 0) {
            summary.averageProposedRate = totalRates / rateCount;
        }

        return summary;
    }

    // Helper methods
    _parseAIAnalysis(analysisText) {
        try {
            // Extract structured data from AI response
            const analysis = {
                isWithinBudget: analysisText.includes('WITHIN_BUDGET: true'),
                negotiationPotential: 'medium',
                sentiment: 'neutral',
                recommendedAction: 'negotiate',
                riskLevel: 'medium',
                proposedAmount: null
            };

            // Extract sentiment
            if (analysisText.includes('SENTIMENT: positive')) analysis.sentiment = 'positive';
            if (analysisText.includes('SENTIMENT: negative')) analysis.sentiment = 'negative';

            // Extract negotiation potential
            if (analysisText.includes('NEGOTIATION_POTENTIAL: high')) analysis.negotiationPotential = 'high';
            if (analysisText.includes('NEGOTIATION_POTENTIAL: low')) analysis.negotiationPotential = 'low';

            // Extract recommended action
            if (analysisText.includes('RECOMMENDED_ACTION: accept')) analysis.recommendedAction = 'accept';
            if (analysisText.includes('RECOMMENDED_ACTION: decline')) analysis.recommendedAction = 'decline';

            // Extract proposed amount
            const amountMatch = analysisText.match(/PROPOSED_AMOUNT: \$?(\d+(?:,\d+)?)/);
            if (amountMatch) {
                analysis.proposedAmount = parseFloat(amountMatch[1].replace(',', ''));
            }

            return analysis;
        } catch (error) {
            console.error('❌ Error parsing AI analysis:', error);
            return this._fallbackAnalysis();
        }
    }

    _fallbackAnalysis(reply, budgetConstraints) {
        const negotiationData = reply?.negotiationData || {};
        const maxProposed = negotiationData.rates?.highest || 0;
        const maxBudget = budgetConstraints.maxBudget || Infinity;

        return {
            isWithinBudget: maxProposed <= maxBudget,
            negotiationPotential: negotiationData.openToNegotiation ? 'high' : 'medium',
            sentiment: negotiationData.sentiment || 'neutral',
            recommendedAction: maxProposed <= maxBudget ? 'accept' : 'negotiate',
            riskLevel: maxProposed > maxBudget * 1.5 ? 'high' : 'medium',
            proposedAmount: maxProposed
        };
    }

    _calculateBudgetRange(budgetConstraints) {
        if (!budgetConstraints.maxBudget) return 'flexible budget';
        
        const min = Math.round(budgetConstraints.maxBudget * 0.7);
        const max = budgetConstraints.maxBudget;
        return `$${min} - $${max}`;
    }

    _generateCreatorId(email) {
        return 'creator_' + email.replace(/[^a-zA-Z0-9]/g, '_');
    }

    // Prompt templates
    _getAnalysisPrompt() {
        return `Analyze the following email reply from a content creator for a brand collaboration:

EMAIL CONTENT:
[EMAIL_CONTENT]

BUDGET CONSTRAINTS:
[BUDGET_CONSTRAINTS]

Please analyze and provide the following information in this exact format:

WITHIN_BUDGET: [true/false]
SENTIMENT: [positive/neutral/negative]
NEGOTIATION_POTENTIAL: [high/medium/low]
RECOMMENDED_ACTION: [accept/negotiate/decline]
RISK_LEVEL: [low/medium/high]
PROPOSED_AMOUNT: [dollar amount if mentioned]

REASONING:
[Your analysis of the email, including key points about rates, timeline, sentiment, and negotiation potential]

Consider:
1. Are the proposed rates within the budget constraints?
2. Is the creator open to negotiation?
3. What's the overall sentiment and professionalism?
4. Are there any red flags or concerning elements?
5. What would be the best negotiation strategy?`;
    }

    _getResponsePrompt() {
        return `Generate a professional email response for the following negotiation scenario:

CREATOR EMAIL:
[CREATOR_EMAIL]

STRATEGY:
[STRATEGY]

BUDGET CONSTRAINTS:
[BUDGET_CONSTRAINTS]

Please write a professional, friendly email response that follows the strategy while maintaining a positive relationship with the creator.`;
    }

    _getEvaluationPrompt() {
        return `Evaluate the current negotiation status and recommend next steps:

NEGOTIATION HISTORY:
[NEGOTIATION_HISTORY]

CURRENT STATE:
[CURRENT_STATE]

Please provide recommendations for:
1. Whether to continue negotiating
2. If human intervention is needed
3. Potential next steps
4. Risk assessment`;
    }

    /**
     * Start a real negotiation process with a creator
     * @param {object} negotiationParams - Parameters for starting negotiation
     * @returns {Object} Negotiation startup result
     */
    async startNegotiation(negotiationParams = {}) {
        const {
            campaignId,
            creatorId,
            creatorEmail,
            terms = {}
        } = negotiationParams;

        this.addLog(`🎯 Starting real negotiation with ${creatorEmail} for campaign ${campaignId}...`);
        
        try {
            // 1. Generate negotiation ID
            const negotiationId = `neg-${campaignId}-${creatorId}-${Date.now()}`;
            
            // 2. Initialize negotiation state in CRM
            await this.crmLogger.logNegotiationStart(campaignId, creatorId, {
                negotiationId,
                creatorEmail,
                terms,
                status: 'initiated',
                startedAt: new Date().toISOString()
            });
            
            // 3. Send initial outreach email with AI monitoring
            const emailResult = await this.emailService.sendNegotiationEmail({
                to: creatorEmail,
                subject: `🎯 Partnership Opportunity: ${terms.campaignName || 'Collaboration'}`,
                body: this._generateInitialOutreachContent(terms),
                from: terms.fromEmail || process.env.SENDGRID_FROM_EMAIL,
                fromName: terms.fromName || 'InfluencerFlow Team',
                categories: ['negotiation', 'outreach', campaignId],
                headers: {
                    'X-Negotiation-ID': negotiationId,
                    'X-Campaign-ID': campaignId,
                    'X-Creator-ID': creatorId
                }
            }, {
                negotiationId,
                campaignId,
                contactId: creatorId,
                budget: terms.budget || 2000,
                deliverables: terms.deliverables || 'Video content and social posts',
                timeline: terms.timeline || '2-3 weeks',
                currentOffer: terms.budget || 2000,
                fromEmail: terms.fromEmail,
                fromName: terms.fromName
            });

            // 4. Log initial email sent
            await this.crmLogger.logCommunication(campaignId, creatorId, {
                type: 'outreach_sent',
                content: 'Initial negotiation email sent with AI monitoring',
                emailId: emailResult.messageId,
                negotiationId,
                timestamp: new Date().toISOString()
            });
            
            this.addLog(`✅ Negotiation started successfully`);
            this.addLog(`📧 Email sent: ${emailResult.messageId}`);
            this.addLog(`🤖 AI monitoring enabled for replies`);

        return {
                negotiationId,
                emailSent: emailResult.success,
                messageId: emailResult.messageId,
                aiMonitoring: true,
                terms,
                status: 'awaiting_reply'
            };
            
        } catch (error) {
            this.addLog(`❌ Failed to start negotiation: ${error.message}`);
            throw error;
        }
    }

    /**
     * Generate initial outreach content for negotiation
     * @param {object} terms - Negotiation terms
     * @returns {string} HTML email content
     */
    _generateInitialOutreachContent(terms) {
        return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">🎯 Partnership Opportunity</h2>
            <p>Hi there!</p>
            <p>We're excited to explore a potential collaboration with you. Here are the details:</p>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #FFE600;">📋 Collaboration Details:</h3>
                <ul style="list-style: none; padding: 0;">
                    <li style="margin: 10px 0;"><strong>💰 Budget:</strong> $${terms.budget || 'Competitive compensation'}</li>
                    <li style="margin: 10px 0;"><strong>📹 Deliverables:</strong> ${terms.deliverables || 'Video content and social posts'}</li>
                    <li style="margin: 10px 0;"><strong>⏰ Timeline:</strong> ${terms.timeline || '2-3 weeks'}</li>
                </ul>
            </div>

            <p style="background-color: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #FFE600;">
                <strong>🤖 AI-Powered Negotiation:</strong> Reply to this email to start our intelligent negotiation process. 
                Our AI will analyze your response and facilitate the discussion.
            </p>

            <p>We're looking forward to working together!</p>
            
            <p>Best regards,<br>
            <strong>${terms.fromName || 'InfluencerFlow Team'}</strong></p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
            <p style="font-size: 12px; color: #666;">
                This email uses AI-powered negotiation. Reply directly to continue the conversation.
            </p>
        </div>
        `;
    }

    /**
     * Get mock email replies for demo/testing
     * @param {number} count - Number of mock replies to generate
     * @returns {Array} Array of mock email replies
     */
    _getMockEmailReplies(count = 1, { campaignId, creatorEmail } = {}) {
        const replies = [];
        for (let i = 0; i < count; i++) {
            replies.push({
                text: `Hi there!\n\nThanks for reaching out about the tech review collaboration. I'm definitely interested!\n\nMy rates are:\n- Dedicated video: $2,500\n- Instagram post: $800  \n- Story mentions: $200 each\n\nI can deliver the video within 2 weeks and would need the product 3 days before filming.\n\nLet me know if these terms work for you!\n\nBest,\nAlex Tech`,
                creatorEmail: creatorEmail || `demo-creator-${i}@example.com`,
                campaignId: campaignId || 'demo-campaign-123',
                timestamp: new Date().toISOString(),
                negotiationStatus: 'initial_response'
            });
        }
        return replies;
    }
}

module.exports = NegotiatorAgent; 
const express = require('express');
const router = express.Router();
const NegotiatorAgent = require('../agents/NegotiatorAgent');
const CRMLoggerService = require('../services/CRMLoggerService');

// Import the new services for simulation
const geminiAiService = require('../services/geminiAiService');
const simulatedEmailService = require('../services/simulatedEmailService');

// Initialize services
const negotiatorAgent = new NegotiatorAgent();
const crmLogger = new CRMLoggerService();

// Process incoming email replies and run negotiation logic
router.post('/process-replies', async (req, res) => {
    try {
        const { 
            campaignId, 
            creatorEmails = [], 
            budgetConstraints = {} 
        } = req.body;

        if (!campaignId) {
            return res.status(400).json({
                success: false,
                error: 'Campaign ID is required'
            });
        }

        console.log(`🤝 Processing negotiation replies for campaign: ${campaignId}`);

        const result = await negotiatorAgent.processIncomingReplies(
            campaignId, 
            creatorEmails, 
            budgetConstraints
        );

        res.json({
            success: true,
            data: result,
            timestamp: new Date(),
            message: `Processed ${result.processed} replies`
        });

    } catch (error) {
        console.error('❌ Error processing negotiation replies:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            details: 'Failed to process negotiation replies'
        });
    }
});

// Get negotiation state for a specific creator
router.get('/state/:campaignId/:creatorId', async (req, res) => {
    try {
        const { campaignId, creatorId } = req.params;

        const negotiationState = await crmLogger.getNegotiationState(campaignId, creatorId);
        const communicationHistory = await crmLogger.getCommunicationHistory(campaignId, creatorId);

        if (!negotiationState) {
            return res.status(404).json({
                success: false,
                error: 'Negotiation state not found'
            });
        }

        res.json({
            success: true,
            data: {
                negotiationState,
                communicationHistory,
                lastUpdated: negotiationState.lastUpdated
            }
        });

    } catch (error) {
        console.error('❌ Error fetching negotiation state:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get all negotiations for a campaign
router.get('/campaign/:campaignId', async (req, res) => {
    try {
        const { campaignId } = req.params;

        const communications = await crmLogger.getCommunicationHistory(campaignId);
        const analytics = await crmLogger.getAnalytics(campaignId);

        res.json({
            success: true,
            data: {
                campaignId,
                communications,
                analytics,
                totalNegotiations: analytics.negotiationSummary.total,
                requiresHumanApproval: analytics.negotiationSummary.requiresHumanApproval
            }
        });

    } catch (error) {
        console.error('❌ Error fetching campaign negotiations:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get communication history
router.get('/communications/:campaignId', async (req, res) => {
    try {
        const { campaignId } = req.params;
        const { creatorId } = req.query;

        const communications = await crmLogger.getCommunicationHistory(campaignId, creatorId);

        res.json({
            success: true,
            data: {
                campaignId,
                creatorId: creatorId || 'all',
                communications,
                count: communications.length
            }
        });

    } catch (error) {
        console.error('❌ Error fetching communications:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Flag negotiation for human review
router.post('/flag-for-review', async (req, res) => {
    try {
        const { campaignId, creatorId, reason, metadata = {} } = req.body;

        if (!campaignId || !creatorId || !reason) {
            return res.status(400).json({
                success: false,
                error: 'Campaign ID, creator ID, and reason are required'
            });
        }

        const flag = await crmLogger.flagForHumanReview(campaignId, creatorId, reason, metadata);

        res.json({
            success: true,
            data: {
                flag,
                message: 'Negotiation flagged for human review'
            }
        });

    } catch (error) {
        console.error('❌ Error flagging for review:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Update negotiation state manually (for human interventions)
router.put('/update-state', async (req, res) => {
    try {
        const { campaignId, creatorId, stateUpdate } = req.body;

        if (!campaignId || !creatorId || !stateUpdate) {
            return res.status(400).json({
                success: false,
                error: 'Campaign ID, creator ID, and state update are required'
            });
        }

        const updatedState = await crmLogger.updateNegotiationState(
            campaignId, 
            creatorId, 
            stateUpdate
        );

        res.json({
            success: true,
            data: {
                updatedState,
                message: 'Negotiation state updated successfully'
            }
        });

    } catch (error) {
        console.error('❌ Error updating negotiation state:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get negotiation analytics for a campaign
router.get('/analytics/:campaignId', async (req, res) => {
    try {
        const { campaignId } = req.params;

        const analytics = await crmLogger.getAnalytics(campaignId);

        res.json({
            success: true,
            data: {
                campaignId,
                analytics,
                generatedAt: new Date()
            }
        });

    } catch (error) {
        console.error('❌ Error fetching analytics:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get activity timeline for a campaign
router.get('/timeline/:campaignId', async (req, res) => {
    try {
        const { campaignId } = req.params;

        const timeline = await crmLogger.getActivityTimeline(campaignId);

        res.json({
            success: true,
            data: {
                campaignId,
                timeline,
                count: timeline.length
            }
        });

    } catch (error) {
        console.error('❌ Error fetching timeline:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Demo endpoint for testing negotiation functionality
router.post('/demo', async (req, res) => {
    try {
        console.log('🎬 Running negotiation demo...');

        const demo = await negotiatorAgent.getDemoNegotiation();

        res.json({
            success: true,
            data: {
                demo,
                message: 'Demo negotiation completed successfully',
                timestamp: new Date(),
                endpoints: {
                    processReplies: 'POST /api/negotiation/process-replies',
                    getState: 'GET /api/negotiation/state/:campaignId/:creatorId',
                    getCampaign: 'GET /api/negotiation/campaign/:campaignId',
                    analytics: 'GET /api/negotiation/analytics/:campaignId'
                }
            }
        });

    } catch (error) {
        console.error('❌ Demo negotiation failed:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            details: 'Demo negotiation failed'
        });
    }
});

// Real negotiation processing endpoint
router.post('/process-real-negotiation', async (req, res) => {
    try {
        const { 
            campaignId,
            creatorEmails,
            budgetConstraints = { maxBudget: 166000, negotiationLimit: 0.1 }
        } = req.body;

        if (!campaignId || !creatorEmails || !Array.isArray(creatorEmails)) {
            return res.status(400).json({
                success: false,
                error: 'Campaign ID and creator emails array are required'
            });
        }

        console.log(`🎯 Processing real negotiation for campaign ${campaignId} with ${creatorEmails.length} creators...`);

        // Process real incoming replies using AI
        const result = await negotiatorAgent.processIncomingReplies(
            campaignId,
            creatorEmails,
            budgetConstraints
        );

        // Get real analytics
        const analytics = await crmLogger.getAnalytics(campaignId);

        res.json({
            success: true,
            data: {
                    campaignId,
                creatorCount: creatorEmails.length,
                    budgetConstraints,
                    result,
                analytics,
                message: `Real negotiation processed for ${creatorEmails.length} creators`
            }
        });

    } catch (error) {
        console.error('❌ Real negotiation processing failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Start real negotiation round for a specific creator
router.post('/start-real-negotiation', async (req, res) => {
    try {
        const { campaignId, creatorId, creatorEmail, negotiationTerms } = req.body;

        if (!campaignId || !creatorId || !creatorEmail) {
            return res.status(400).json({
                success: false,
                error: 'Campaign ID, Creator ID, and Creator Email are required'
            });
        }
        
        console.log(`🎯 Starting real negotiation with ${creatorEmail} for campaign ${campaignId}`);

        // Start real negotiation process
        const result = await negotiatorAgent.startNegotiation({
            campaignId,
            creatorId,
            creatorEmail,
            terms: negotiationTerms || {
                budget: 166000,
                deliverables: 'Video content and social posts',
                timeline: '2-3 weeks'
            }
        });

        res.json({
            success: true,
            message: `Real negotiation started with ${creatorEmail}`,
            data: {
                negotiationId: result.negotiationId,
                initialEmailSent: result.emailSent,
                aiMonitoring: result.aiMonitoring,
                result
            }
        });

    } catch (error) {
        console.error('❌ Error starting real negotiation:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// NEW SIMULATION ENDPOINTS FOR FRONTEND

// Generate initial email using Gemini AI
router.post('/generate-initial-email', async (req, res) => {
    try {
        const { contact, campaign, currentTerms } = req.body;

        if (!contact || !campaign || !currentTerms) {
            return res.status(400).json({
                success: false,
                message: 'Contact, campaign, and currentTerms are required'
            });
        }

        const email = await geminiAiService.generateInitialEmail(contact, campaign, currentTerms);

        res.json({
            success: true,
            data: { email },
            message: 'Initial email generated successfully'
        });

    } catch (error) {
        console.error('❌ Error generating initial email:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Failed to generate initial email'
        });
    }
});

// Analyze Sanjay's reply using AI
router.post('/analyze-reply', async (req, res) => {
    try {
        const { replyContent, emailSubject, currentTerms, conversationHistory } = req.body;

        if (!replyContent || !currentTerms) {
            return res.status(400).json({
                success: false,
                message: 'Reply content and current terms are required'
            });
        }

        const analysisResult = await geminiAiService.analyzeSanjayReply(
            replyContent, 
            emailSubject, 
            currentTerms, 
            conversationHistory
        );

        res.json({
            success: true,
            data: analysisResult,
            message: 'Reply analyzed successfully'
        });

    } catch (error) {
        console.error('❌ Error analyzing reply:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Failed to analyze reply'
        });
    }
});

// Generate AI reply with human input
router.post('/generate-reply-with-input', async (req, res) => {
    try {
        const { humanDecision, originalSanjayEmailContent, currentTerms, conversationHistory } = req.body;

        if (!humanDecision || !originalSanjayEmailContent || !currentTerms) {
            return res.status(400).json({
                success: false,
                message: 'Human decision, original email content, and current terms are required'
            });
        }

        const reply = await geminiAiService.generateAiReplyWithHumanInput(
            humanDecision,
            originalSanjayEmailContent,
            currentTerms,
            conversationHistory
        );

        res.json({
            success: true,
            data: { reply },
            message: 'AI reply generated with human input'
        });

    } catch (error) {
        console.error('❌ Error generating AI reply with human input:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Failed to generate reply with human input'
        });
    }
});

// Draft contract email
router.post('/draft-contract', async (req, res) => {
    try {
        const { agreedTerms, contact, campaign, conversationHistory } = req.body;

        if (!agreedTerms || !contact || !campaign) {
            return res.status(400).json({
                success: false,
                message: 'Agreed terms, contact, and campaign are required'
            });
        }

        const contractEmail = await geminiAiService.draftContractEmail(
            agreedTerms,
            contact,
            campaign,
            conversationHistory
        );

        res.json({
            success: true,
            data: { contractEmail },
            message: 'Contract email drafted successfully'
        });

    } catch (error) {
        console.error('❌ Error drafting contract email:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Failed to draft contract email'
        });
    }
});

// Generate closing email
router.post('/generate-closing-email', async (req, res) => {
    try {
        const { contact, campaign, conversationHistory } = req.body;

        if (!contact || !campaign) {
            return res.status(400).json({
                success: false,
                message: 'Contact and campaign are required'
            });
        }

        const email = await geminiAiService.generateClosingEmail(
            contact,
            campaign,
            conversationHistory
        );

        res.json({
            success: true,
            data: { email },
            message: 'Closing email generated successfully'
        });

    } catch (error) {
        console.error('❌ Error generating closing email:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Failed to generate closing email'
        });
    }
});

// Simulate Sanjay's reply
router.post('/simulate-sanjay-reply', async (req, res) => {
    try {
        const { currentSubject } = req.body;

        const reply = simulatedEmailService.simulateSanjayReply(currentSubject);

        if (reply) {
            res.json({
                success: true,
                data: reply,
                message: 'Sanjay reply simulated successfully'
            });
        } else {
            res.json({
                success: true,
                data: null,
                message: 'No more simulated replies available'
            });
        }

    } catch (error) {
        console.error('❌ Error simulating Sanjay reply:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Failed to simulate Sanjay reply'
        });
    }
});

// Send email (simulation)
router.post('/send-email', async (req, res) => {
    try {
        const { sender, subject, body, recipientName = 'Sanjay Malladi' } = req.body;

        if (!sender || !subject || !body) {
            return res.status(400).json({
                success: false,
                message: 'Sender, subject, and body are required'
            });
        }

        const sentMessage = simulatedEmailService.sendEmail(sender, subject, body, recipientName);

        res.json({
            success: true,
            data: sentMessage,
            message: 'Email sent successfully'
        });

    } catch (error) {
        console.error('❌ Error sending email:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Failed to send email'
        });
    }
});

// Reset Sanjay's reply simulation
router.post('/reset-simulation', async (req, res) => {
    try {
        simulatedEmailService.resetSanjayReplies();

        res.json({
            success: true,
            message: 'Simulation reset successfully'
        });

    } catch (error) {
        console.error('❌ Error resetting simulation:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Failed to reset simulation'
        });
    }
});

// Get simulation state
router.get('/simulation-state', async (req, res) => {
    try {
        const state = simulatedEmailService.getSimulationState();

        res.json({
            success: true,
            data: state,
            message: 'Simulation state retrieved successfully'
        });

    } catch (error) {
        console.error('❌ Error getting simulation state:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Failed to get simulation state'
        });
    }
});

module.exports = router; 
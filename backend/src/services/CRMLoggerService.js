class CRMLoggerService {
    constructor() {
        this.communicationLog = new Map(); // In production, this would be a database
        this.negotiationStates = new Map();
        this.activityTimeline = new Map();
    }

    async logCommunication(data) {
        const {
            campaignId,
            creatorId,
            creatorEmail,
            type, // 'outreach_sent', 'reply_received', 'negotiation_response', 'contract_sent'
            content,
            metadata = {}
        } = data;

        const logEntry = {
            id: this._generateId(),
            campaignId,
            creatorId,
            creatorEmail,
            type,
            content,
            metadata,
            timestamp: new Date(),
            status: 'logged'
        };

        // Store in communication log
        const key = `${campaignId}-${creatorId}`;
        if (!this.communicationLog.has(key)) {
            this.communicationLog.set(key, []);
        }
        this.communicationLog.get(key).push(logEntry);

        // Update activity timeline
        if (!this.activityTimeline.has(campaignId)) {
            this.activityTimeline.set(campaignId, []);
        }
        this.activityTimeline.get(campaignId).push({
            ...logEntry,
            activityType: 'communication'
        });

        console.log(`📝 Logged ${type} for creator ${creatorEmail} in campaign ${campaignId}`);
        return logEntry;
    }

    async updateNegotiationState(campaignId, creatorId, stateUpdate) {
        const key = `${campaignId}-${creatorId}`;
        
        const currentState = this.negotiationStates.get(key) || {
            campaignId,
            creatorId,
            status: 'initial',
            proposedRates: {},
            budgetConstraints: {},
            timeline: null,
            negotiationRounds: 0,
            lastUpdated: new Date(),
            requiresHumanApproval: false,
            flags: []
        };

        const updatedState = {
            ...currentState,
            ...stateUpdate,
            lastUpdated: new Date(),
            negotiationRounds: currentState.negotiationRounds + 1
        };

        // Check if human approval is needed
        updatedState.requiresHumanApproval = this._checkHumanApprovalRequired(updatedState);

        this.negotiationStates.set(key, updatedState);

        // Log state change
        await this.logCommunication({
            campaignId,
            creatorId,
            type: 'negotiation_state_update',
            content: `Negotiation state updated to: ${updatedState.status}`,
            metadata: {
                previousState: currentState,
                newState: updatedState,
                requiresHumanApproval: updatedState.requiresHumanApproval
            }
        });

        return updatedState;
    }

    async getNegotiationState(campaignId, creatorId) {
        const key = `${campaignId}-${creatorId}`;
        return this.negotiationStates.get(key) || null;
    }

    async getCommunicationHistory(campaignId, creatorId = null) {
        if (creatorId) {
            const key = `${campaignId}-${creatorId}`;
            return this.communicationLog.get(key) || [];
        }

        // Return all communications for the campaign
        const allCommunications = [];
        for (const [key, communications] of this.communicationLog.entries()) {
            if (key.startsWith(campaignId)) {
                allCommunications.push(...communications);
            }
        }

        return allCommunications.sort((a, b) => b.timestamp - a.timestamp);
    }

    async getActivityTimeline(campaignId) {
        return this.activityTimeline.get(campaignId) || [];
    }

    async flagForHumanReview(campaignId, creatorId, reason, metadata = {}) {
        const flagEntry = {
            id: this._generateId(),
            campaignId,
            creatorId,
            reason,
            metadata,
            timestamp: new Date(),
            status: 'pending_review',
            reviewedBy: null,
            reviewedAt: null,
            resolution: null
        };

        // Update negotiation state
        await this.updateNegotiationState(campaignId, creatorId, {
            requiresHumanApproval: true,
            flags: [...(await this.getNegotiationState(campaignId, creatorId))?.flags || [], flagEntry]
        });

        // Log the flag
        await this.logCommunication({
            campaignId,
            creatorId,
            type: 'flagged_for_review',
            content: `Flagged for human review: ${reason}`,
            metadata: { flagId: flagEntry.id, ...metadata }
        });

        console.log(`🚩 Flagged negotiation for human review: ${reason}`);
        return flagEntry;
    }

    async getAnalytics(campaignId) {
        const communications = await this.getCommunicationHistory(campaignId);
        const negotiations = Array.from(this.negotiationStates.values())
            .filter(state => state.campaignId === campaignId);

        const analytics = {
            totalCommunications: communications.length,
            communicationTypes: {},
            negotiationSummary: {
                total: negotiations.length,
                statuses: {},
                averageRounds: 0,
                flaggedCount: 0,
                requiresHumanApproval: 0
            },
            timeline: await this.getActivityTimeline(campaignId),
            responseRates: this._calculateResponseRates(communications),
            averageNegotiationTime: this._calculateAverageNegotiationTime(negotiations)
        };

        // Calculate communication type distribution
        communications.forEach(comm => {
            analytics.communicationTypes[comm.type] = 
                (analytics.communicationTypes[comm.type] || 0) + 1;
        });

        // Calculate negotiation statistics
        let totalRounds = 0;
        negotiations.forEach(neg => {
            analytics.negotiationSummary.statuses[neg.status] = 
                (analytics.negotiationSummary.statuses[neg.status] || 0) + 1;
            
            totalRounds += neg.negotiationRounds;
            
            if (neg.requiresHumanApproval) {
                analytics.negotiationSummary.requiresHumanApproval++;
            }
            
            if (neg.flags && neg.flags.length > 0) {
                analytics.negotiationSummary.flaggedCount++;
            }
        });

        if (negotiations.length > 0) {
            analytics.negotiationSummary.averageRounds = totalRounds / negotiations.length;
        }

        return analytics;
    }

    _checkHumanApprovalRequired(negotiationState) {
        const {
            proposedRates,
            budgetConstraints,
            negotiationRounds,
            status,
            flags = []
        } = negotiationState;

        // Check if already flagged
        if (flags.length > 0) return true;

        // Check budget overrun (if budget constraints are set)
        if (budgetConstraints.maxBudget && proposedRates.highest) {
            const overrunPercentage = (proposedRates.highest - budgetConstraints.maxBudget) / budgetConstraints.maxBudget;
            if (overrunPercentage > 0.1) { // More than 10% over budget
                return true;
            }
        }

        // Check negotiation rounds
        if (negotiationRounds > 3) {
            return true;
        }

        // Check for deadlock status
        if (status === 'deadlock' || status === 'rejected') {
            return true;
        }

        return false;
    }

    _calculateResponseRates(communications) {
        const outreachSent = communications.filter(c => c.type === 'outreach_sent').length;
        const repliesReceived = communications.filter(c => c.type === 'reply_received').length;
        
        return {
            outreachSent,
            repliesReceived,
            responseRate: outreachSent > 0 ? (repliesReceived / outreachSent) * 100 : 0
        };
    }

    _calculateAverageNegotiationTime(negotiations) {
        if (negotiations.length === 0) return 0;

        const completedNegotiations = negotiations.filter(n => 
            n.status === 'accepted' || n.status === 'rejected' || n.status === 'contract_sent'
        );

        if (completedNegotiations.length === 0) return 0;

        const totalTime = completedNegotiations.reduce((sum, neg) => {
            const startTime = new Date(neg.timestamp || neg.lastUpdated);
            const endTime = new Date(neg.lastUpdated);
            return sum + (endTime - startTime);
        }, 0);

        return totalTime / completedNegotiations.length; // Average time in milliseconds
    }

    _generateId() {
        return 'crm_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Log the start of a negotiation process
     * @param {string} campaignId - Campaign identifier
     * @param {string} creatorId - Creator identifier
     * @param {object} negotiationData - Negotiation initialization data
     */
    async logNegotiationStart(campaignId, creatorId, negotiationData) {
        const logEntry = {
            id: `neg-start-${Date.now()}`,
            campaignId,
            creatorId,
            type: 'negotiation_started',
            content: `Negotiation started with terms: ${JSON.stringify(negotiationData.terms)}`,
            negotiationId: negotiationData.negotiationId,
            creatorEmail: negotiationData.creatorEmail,
            status: 'active',
            timestamp: new Date().toISOString(),
            metadata: negotiationData
        };

        this.communications.push(logEntry);
        
        // Also update negotiation state
        const negotiationState = {
            negotiationId: negotiationData.negotiationId,
            campaignId,
            creatorId,
            creatorEmail: negotiationData.creatorEmail,
            status: 'initiated',
            terms: negotiationData.terms,
            startedAt: negotiationData.startedAt,
            rounds: 0,
            lastActivity: new Date().toISOString()
        };

        this.setNegotiationState(campaignId, creatorId, negotiationState);
        
        console.log(`📋 CRM: Negotiation started - ${negotiationData.negotiationId}`);
        return logEntry;
    }
}

module.exports = CRMLoggerService; 
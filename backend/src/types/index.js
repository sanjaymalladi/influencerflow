// Type definitions for InfluencerFlow backend services

/**
 * @typedef {Object} Campaign
 * @property {string} id - Campaign ID
 * @property {string} name - Campaign name
 * @property {string} description - Campaign description
 * @property {string} initialPromptTemplate - Template for initial email
 * @property {Array} deliverables - Campaign deliverables
 */

/**
 * @typedef {Object} Contact
 * @property {string} id - Contact ID
 * @property {string} name - Contact name
 * @property {string} email - Contact email
 * @property {string} [phone] - Contact phone number
 * @property {Object} [socialMedia] - Social media handles
 */

/**
 * @typedef {Object} NegotiationTerms
 * @property {number} compensation - Compensation amount
 * @property {string} deliverables - Deliverables description
 * @property {string} timeline - Timeline for completion
 * @property {string} [revisions] - Number of revisions allowed
 * @property {string} [exclusivity] - Exclusivity terms
 * @property {string} [usage_rights] - Content usage rights
 */

/**
 * @typedef {Object} AiAnalysisResponse
 * @property {string} analysis - AI analysis of the reply
 * @property {string} [changeRequested] - Description of requested changes
 * @property {NegotiationTerms} [updatedTerms] - Updated negotiation terms
 * @property {boolean} needsHumanInput - Whether human input is required
 * @property {string} [questionForUser] - Question for the human user
 * @property {string} [aiDraftReply] - AI drafted reply
 * @property {boolean} agreementReached - Whether agreement has been reached
 */

/**
 * @typedef {Object} EmailMessage
 * @property {string} id - Message ID
 * @property {MessageSender} sender - Message sender
 * @property {string} subject - Email subject
 * @property {string} content - Email content
 * @property {Date} timestamp - Message timestamp
 */

/**
 * @typedef {Object} GroundingChunk
 * @property {string} text - Grounding text
 * @property {string} [url] - Source URL
 */

/**
 * @typedef {'ai'|'human'|'sanjay'} MessageSender
 */

// Export for JSDoc usage
module.exports = {
  // This file is primarily for JSDoc type definitions
  // No runtime exports needed for type-only definitions
}; 
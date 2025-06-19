const { SANJAY_SIMULATED_REPLIES, SANJAY_ID } = require('../constants');

/**
 * @typedef {import('../types').EmailMessage} EmailMessage
 * @typedef {import('../types').MessageSender} MessageSender
 */

let messageIdCounter = 0;
let sanjayReplyIndex = 0;

/**
 * Simulate Sanjay sending a reply email
 * In a real app, this would be an incoming webhook or API poll
 * @param {string} [currentSubject] - Current email subject to create reply subject
 * @returns {EmailMessage | null} Simulated email message or null if no more replies
 */
const simulateSanjayReply = (currentSubject) => {
  if (sanjayReplyIndex >= SANJAY_SIMULATED_REPLIES.length) {
    // No more pre-canned replies, maybe a generic "I'm busy" or "Okay"
    // For this simulation, let's assume the flow ends or needs specific triggers
    return null; 
  }

  const replyTemplate = SANJAY_SIMULATED_REPLIES[sanjayReplyIndex];
  sanjayReplyIndex++;

  return {
    id: `sanjay-msg-${messageIdCounter++}`,
    sender: 'sanjay',
    subject: replyTemplate.subject || `Re: ${currentSubject || 'Previous Email'}`,
    content: replyTemplate.content,
    timestamp: new Date(),
  };
};

/**
 * Get information about Sanjay's next reply type without consuming it
 * @returns {Object} Next reply metadata
 */
const getSanjayNextReplyType = () => {
    if (sanjayReplyIndex >= SANJAY_SIMULATED_REPLIES.length) return {};
    return SANJAY_SIMULATED_REPLIES[sanjayReplyIndex]; // Peek at next reply type
};

/**
 * Reset Sanjay's reply simulation for a new negotiation
 * Call this to reset for a new negotiation simulation
 */
const resetSanjayReplies = () => {
  sanjayReplyIndex = 0;
  messageIdCounter = 0; // Reset message counter too if needed for unique IDs per session
};

/**
 * Simulate sending an email from the user or AI
 * In a real app, this would call the Gmail API or email service
 * @param {MessageSender} sender - Who is sending the email
 * @param {string} subject - Email subject
 * @param {string} body - Email body content
 * @param {string} [recipientName] - Name of the recipient
 * @returns {EmailMessage} The created email message object
 */
const sendEmail = (sender, subject, body, recipientName = "Sanjay Malladi") => {
  console.log(`Mock sending email from ${sender} to ${recipientName} with subject "${subject}"`);
  return {
    id: `${sender}-msg-${messageIdCounter++}`,
    sender: sender,
    subject: subject,
    content: body,
    timestamp: new Date(),
  };
};

/**
 * Get current simulation state for debugging
 * @returns {Object} Current state information
 */
const getSimulationState = () => {
  return {
    currentReplyIndex: sanjayReplyIndex,
    totalReplies: SANJAY_SIMULATED_REPLIES.length,
    messageCounter: messageIdCounter,
    hasMoreReplies: sanjayReplyIndex < SANJAY_SIMULATED_REPLIES.length,
  };
};

/**
 * Simulate email delivery status updates
 * @param {string} emailId - ID of the email to update
 * @param {string} status - New status (delivered, opened, etc.)
 * @returns {Object} Status update object
 */
const simulateEmailStatusUpdate = (emailId, status) => {
  return {
    id: emailId,
    status: status,
    timestamp: new Date(),
    event: `email_${status}`,
  };
};

/**
 * Simulate email tracking events (opens, clicks)
 * @param {string} emailId - ID of the email
 * @param {string} eventType - Type of tracking event
 * @param {Object} [metadata] - Additional event metadata
 * @returns {Object} Tracking event object
 */
const simulateTrackingEvent = (emailId, eventType, metadata = {}) => {
  return {
    emailId,
    eventType,
    timestamp: new Date(),
    metadata,
    id: `track-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  };
};

/**
 * Advanced simulation: Create a more dynamic reply based on conversation context
 * This could be enhanced with AI to create more realistic simulated responses
 * @param {string} lastEmailContent - Content of the last email sent
 * @param {Array<EmailMessage>} conversationHistory - Previous conversation
 * @param {Object} [options] - Simulation options
 * @returns {EmailMessage | null} Generated reply or null
 */
const generateDynamicReply = (lastEmailContent, conversationHistory = [], options = {}) => {
  // This is a placeholder for more sophisticated reply generation
  // In a real implementation, this could use AI to generate contextual replies
  
  const { 
    replyProbability = 0.8, 
    delayMinutes = 0, 
    sentiment = 'neutral' 
  } = options;
  
  // Simulate probability of getting a reply
  if (Math.random() > replyProbability) {
    return null;
  }
  
  // Use existing simulation if available
  const simulatedReply = simulateSanjayReply();
  if (simulatedReply) {
    return simulatedReply;
  }
  
  // Generate a basic dynamic reply if no more simulated ones
  const dynamicReply = {
    id: `dynamic-sanjay-${messageIdCounter++}`,
    sender: 'sanjay',
    subject: `Re: ${conversationHistory.length > 0 ? conversationHistory[conversationHistory.length - 1].subject : 'Our Conversation'}`,
    content: generateBasicReplyContent(lastEmailContent, sentiment),
    timestamp: new Date(Date.now() + delayMinutes * 60 * 1000),
  };
  
  return dynamicReply;
};

/**
 * Generate basic reply content based on the last email
 * @param {string} lastEmailContent - Content to respond to
 * @param {string} sentiment - Desired sentiment of the reply
 * @returns {string} Generated reply content
 */
const generateBasicReplyContent = (lastEmailContent, sentiment) => {
  const templates = {
    positive: [
      "Thanks for your email! This sounds interesting. Let me review the details and get back to you soon.",
      "Great to hear from you! I'm excited about this opportunity. When can we discuss further?",
      "This looks promising! I have a few questions but overall I'm interested in moving forward.",
    ],
    neutral: [
      "Thanks for reaching out. I'll need some time to review this and will get back to you.",
      "I've received your email and will respond with more details shortly.",
      "Let me look over the information you've provided and I'll be in touch.",
    ],
    negative: [
      "Thanks for the opportunity, but I don't think this is the right fit for me at the moment.",
      "I appreciate you thinking of me, but I'll have to pass on this one.",
      "Unfortunately, I'm not available for this type of collaboration right now.",
    ],
  };
  
  const sentimentTemplates = templates[sentiment] || templates.neutral;
  const randomTemplate = sentimentTemplates[Math.floor(Math.random() * sentimentTemplates.length)];
  
  return `Hi there,\n\n${randomTemplate}\n\nBest regards,\nSanjay Malladi`;
};

module.exports = {
  // Core simulation functions
  simulateSanjayReply,
  getSanjayNextReplyType,
  resetSanjayReplies,
  sendEmail,
  
  // State and debugging
  getSimulationState,
  
  // Status and tracking simulation
  simulateEmailStatusUpdate,
  simulateTrackingEvent,
  
  // Advanced simulation
  generateDynamicReply,
  generateBasicReplyContent,
}; 
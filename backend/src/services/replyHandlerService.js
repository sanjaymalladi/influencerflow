const { supabase } = require('../config/supabase');
const { v4: uuidv4 } = require('uuid');
const gmailService = require('./gmailService');
const aiService = require('./aiService');
const { getDbClient, getSupabaseUserId } = require('../utils/outreachHelpers'); // Assuming outreachHelpers are set up for dbClient

/**
 * Fetches user details, including their connected Gmail tokens, from Supabase.
 * @param {string} userId - The Supabase user ID.
 * @param {object} dbClient - The Supabase client instance.
 * @returns {Promise<object|null>} User object with tokens, or null if not found/error.
 */
const getUserWithTokens = async (userId, dbClient) => {
  try {
    const { data: user, error } = await dbClient
      .from('users')
      .select('id, email, gmail_access_token, gmail_refresh_token, gmail_token_expiry, gmail_last_sync')
      .eq('id', userId)
      .single();

    if (error) {
      console.error(`[ReplyHandler] Error fetching user ${userId}:`, error.message);
      return null;
    }
    if (!user || !user.gmail_access_token) {
      // console.log(`[ReplyHandler] No Gmail tokens for user ${userId}.`); // Too verbose for polling
      return null;
    }
    return user;
  } catch (e) {
    console.error(`[ReplyHandler] Exception fetching user ${userId}:`, e.message);
    return null;
  }
};

/**
 * Updates Gmail tokens for a user in the database.
 * @param {string} userId - The Supabase user ID.
 * @param {object} newTokens - The new token object (access_token, expiry_date, refresh_token?)
 * @param {object} dbClient - The Supabase client instance.
 */
const updateUserTokens = async (userId, newTokens, dbClient) => {
  try {
    const updatePayload = {
      gmail_access_token: newTokens.access_token,
      gmail_token_expiry: newTokens.expiry_date,
      gmail_last_sync: new Date().toISOString(),
    };
    if (newTokens.refresh_token) {
      updatePayload.gmail_refresh_token = newTokens.refresh_token;
    }
    const { error } = await dbClient.from('users').update(updatePayload).eq('id', userId);
    if (error) {
      console.error(`[ReplyHandler] Failed to update tokens for user ${userId}:`, error.message);
    } else {
      console.log(`[ReplyHandler] Updated tokens for user ${userId} via callback.`);
    }
  } catch (e) {
    console.error(`[ReplyHandler] Exception updating tokens for ${userId}:`, e.message);
  }
};

class ReplyHandlerService {
  constructor() {
    this.isProcessing = false; // Simple lock to prevent concurrent processing runs
  }

  /**
   * Main function to check and process replies for all relevant users.
   */
  async checkAndProcessRepliesForAllUsers() {
    if (this.isProcessing) {
      console.log('[ReplyHandler] Processing already in progress. Skipping run.');
      return { success: false, message: 'Processing already in progress.' };
    }
    this.isProcessing = true;
    console.log('[ReplyHandler] Starting checkAndProcessRepliesForAllUsers...');
    let processedCount = 0;
    let errorCount = 0;

    try {
      // 1. Fetch all users who have connected Gmail (have gmail_access_token)
      //    We use the main supabase client here, not a user-specific one initially.
      const { data: usersWithGmail, error: usersError } = await supabase
        .from('users')
        .select('id') // We'll fetch full details later with a user-specific client if needed
        .not('gmail_access_token', 'is', null);

      if (usersError) {
        console.error('[ReplyHandler] Error fetching users with Gmail:', usersError.message);
        this.isProcessing = false;
        return { success: false, message: 'Error fetching users.' };
      }

      if (!usersWithGmail || usersWithGmail.length === 0) {
        console.log('[ReplyHandler] No users with connected Gmail accounts found.');
        this.isProcessing = false;
        return { success: true, message: 'No users with Gmail to process.', processedCount, errorCount };
      }

      console.log(`[ReplyHandler] Found ${usersWithGmail.length} users with Gmail to process.`);

      for (const basicUser of usersWithGmail) {
        const dbClient = getDbClient(basicUser.id); // Get appropriate Supabase client for this user
        const user = await getUserWithTokens(basicUser.id, dbClient);
        if (!user) {
          console.log(`[ReplyHandler] Skipping user ${basicUser.id}, no valid tokens or user details.`);
          continue;
        }

        console.log(`[ReplyHandler] Processing replies for user ${user.email} (ID: ${user.id})`);
        try {
          await this.processRepliesForUser(user, dbClient);
          processedCount++; 
        } catch (userError) {
          console.error(`[ReplyHandler] Error processing replies for user ${user.id}:`, userError.message);
          errorCount++;
        }
      }
    } catch (mainError) {
      console.error('[ReplyHandler] Critical error in checkAndProcessRepliesForAllUsers:', mainError.message);
      errorCount++;
    } finally {
      this.isProcessing = false;
      console.log(`[ReplyHandler] Finished processing. Processed users: ${processedCount}, Errors: ${errorCount}`);
    }
    return { success: true, message: 'Reply processing finished.', processedCount, errorCount };
  }

  /**
   * Process replies for a single user.
   * @param {object} user - The user object from Supabase, including tokens.
   * @param {object} dbClient - The Supabase client for this user.
   */
  async processRepliesForUser(user, dbClient) {
    const userGmailTokens = {
      gmail_access_token: user.gmail_access_token,
      gmail_refresh_token: user.gmail_refresh_token,
      gmail_token_expiry: user.gmail_token_expiry,
    };

    const onTokensRefreshedCallback = async (newTokens) => {
      await updateUserTokens(user.id, newTokens, dbClient);
    };

    // 1. Get active conversations for this user from `conversations` table
    //    These are conversations where we expect replies and have a thread_id.
    const { data: activeConversations, error: convError } = await dbClient
      .from('conversations')
      .select('id, campaign_id, creator_id, email_thread_id, messages, outreach_emails(*)') // Fetch related outreach_email for context
      .eq('user_id', user.id) // Assuming conversations are linked to users
      .not('email_thread_id', 'is', null)
      // Add more filters: e.g., status not 'closed', 'completed', etc.
      .order('last_message_at', { ascending: false }); 

    if (convError) {
      console.error(`[ReplyHandler] Error fetching active conversations for user ${user.id}:`, convError.message);
      return;
    }

    if (!activeConversations || activeConversations.length === 0) {
      // console.log(`[ReplyHandler] No active conversations with thread_id found for user ${user.id}.`); // too verbose
      return;
    }

    for (const conversation of activeConversations) {
      if (!conversation.email_thread_id) continue;

      // 2. For each conversation, list new emails in its thread
      //    We might want to store `last_checked_message_id_for_thread` or a timestamp 
      //    to avoid re-processing all messages in a thread every time.
      //    For now, we fetch all and rely on parsing to identify new ones by message ID.
      const listOptions = {
        q: `in:inbox thread:${conversation.email_thread_id} is:unread`, // Basic query, can be refined
        // maxResults: 5, // Limit to avoid too many results at once
      };
      
      let gmailMessages;
      try {
        // console.log(`[ReplyHandler] Listing emails for thread ${conversation.email_thread_id} for user ${user.id}`);
        gmailMessages = await gmailService.listEmails(listOptions, userGmailTokens, onTokensRefreshedCallback);
      } catch (listError) {
        if (listError.message.includes('Invalid grant') || listError.message.includes('Token has been expired')) {
          console.warn(`[ReplyHandler] Gmail token error for user ${user.id} while listing emails. Attempting refresh or user needs to re-auth.`);
          // Token refresh is handled by gmailService, if it fails, user needs to re-auth.
          // Potentially mark user's Gmail connection as needing review.
        }
        console.error(`[ReplyHandler] Error listing emails for thread ${conversation.email_thread_id}:`, listError.message);
        continue; // Move to next conversation
      }
      
      if (!gmailMessages || gmailMessages.length === 0) {
        // console.log(`[ReplyHandler] No new unread messages found in thread ${conversation.email_thread_id}`);
        continue;
      }

      console.log(`[ReplyHandler] Found ${gmailMessages.length} potential new messages in thread ${conversation.email_thread_id}`);

      for (const gmailMsgSummary of gmailMessages) {
        // Check if we've already processed this message ID for this conversation
        const existingMessageIds = new Set((conversation.messages || []).map(m => m.provider_message_id));
        if (existingMessageIds.has(gmailMsgSummary.id)) {
          // console.log(`[ReplyHandler] Message ${gmailMsgSummary.id} already processed for conv ${conversation.id}. Skipping.`);
          continue;
        }

        // 3. Get full email details
        // console.log(`[ReplyHandler] Getting details for message ${gmailMsgSummary.id} in thread ${conversation.email_thread_id}`);
        let emailDetailsRaw;
        try {
            emailDetailsRaw = await gmailService.getEmailDetails(gmailMsgSummary.id, userGmailTokens, onTokensRefreshedCallback);
        } catch (detailsError) {
            console.error(`[ReplyHandler] Error getting details for message ${gmailMsgSummary.id}:`, detailsError.message);
            continue; 
        }
        
        const emailContent = gmailService.parseEmailDetails(emailDetailsRaw);

        // Ensure the message is from the creator (or not from our system/user)
        // This is a simplified check. Robust check needed based on 'From' address vs creator's email vs user's email.
        const originalSenderEmail = conversation.outreach_emails?.tracking_data?.recipientEmail; // Email of the creator we sent to
        const fromAddress = emailContent.fromEmail ? emailContent.fromEmail.toLowerCase() : '';
        
        // Crude check to see if it's likely from the creator and not the user themselves
        // You'll need to fetch the user's actual email addresses used for sending via Gmail to make this robust
        const isLikelyFromCreator = originalSenderEmail && fromAddress.includes(originalSenderEmail.split('@')[0]); // Very basic check

        if (!isLikelyFromCreator) {
          // console.log(`[ReplyHandler] Message ${gmailMsgSummary.id} is not from the creator (From: ${fromAddress}, Expected related to: ${originalSenderEmail}). Skipping.`);
          // Mark as read so we don't pick it up again
          try {
            await gmailService.modifyEmail(gmailMsgSummary.id, [], ['UNREAD'], userGmailTokens, onTokensRefreshedCallback);
          } catch (modifyError) { /* Log and ignore */ }
          continue;
        }
        
        console.log(`[ReplyHandler] Processing new reply from creator: ${fromAddress} for conversation ${conversation.id}`);

        // 4. Update conversation in Supabase
        const newMessage = {
          id: uuidv4(), // Generate new UUID for this message entry
          provider_message_id: gmailMsgSummary.id,
          provider_thread_id: gmailMsgSummary.threadId,
          sender_type: 'creator', // Assuming it's from creator
          sender_email: fromAddress,
          sender_name: emailContent.fromName,
          content_text: emailContent.bodyText,
          content_html: emailContent.bodyHtml,
          subject: emailContent.subject,
          received_at: emailContent.internalDate || new Date(parseInt(gmailMsgSummary.internalDate)).toISOString(),
          headers: emailContent.headers, // Store all headers
        };

        const updatedMessages = [...(conversation.messages || []), newMessage];
        
        const { error: updateConvError } = await dbClient
          .from('conversations')
          .update({
            messages: updatedMessages,
            last_message_at: newMessage.received_at,
            status: 'replied' // Or some other status based on AI analysis later
          })
          .eq('id', conversation.id);

        if (updateConvError) {
          console.error(`[ReplyHandler] Error updating conversation ${conversation.id} in Supabase:`, updateConvError.message);
          continue; // Don't proceed to AI if DB update failed
        }

        // Also mark the original outreach_email as replied if it's not already
        if (conversation.outreach_emails && conversation.outreach_emails.status !== 'replied') {
            await dbClient.from('outreach_emails').update({ status: 'replied', replied_at: newMessage.received_at }).eq('id', conversation.outreach_emails.id);
        }

        // 5. Pass to AI Service for analysis
        console.log(`[ReplyHandler] Sending conversation ${conversation.id} to AI for analysis.`);
        // We need creator and campaign details for the AI service
        const { data: creatorDetails, error: creatorError } = await dbClient.from('creators').select('*').eq('id', conversation.creator_id).single();
        const { data: campaignDetails, error: campaignError } = await dbClient.from('campaigns').select('*').eq('id', conversation.campaign_id).single();

        if (creatorError || campaignError || !creatorDetails || !campaignDetails) {
          console.error(`[ReplyHandler] Failed to fetch creator/campaign details for conv ${conversation.id}. AI analysis skipped.`);
          continue;
        }
        
        // Construct conversation history for AI as simple text for now
        // aiService expects { role: 'user' | 'model', parts: [{ text: '...' }] }
        const aiConversationHistory = (conversation.messages || []).map(msg => ({
          role: msg.sender_type === 'user' || msg.sender_type === 'system' ? 'model' : 'user', // AI is 'model', creator is 'user' for Gemini
          parts: [{ text: msg.content_text || '' }]
        }));
        // Add the latest message
        aiConversationHistory.push({
            role: 'user', // The new reply from creator
            parts: [{ text: emailContent.bodyText || '' }]
        });

        try {
          const aiAnalysis = await aiService.analyzeAndSuggestReply(
            emailContent.bodyText, // Current reply text
            aiConversationHistory, // Full history for context
            campaignDetails, 
            creatorDetails
          );

          // 6. Store AI analysis and manage human approval workflow
          console.log(`[ReplyHandler] AI Analysis for conv ${conversation.id}:`, aiAnalysis);
          const humanApprovalData = {
            conversation_id: conversation.id,
            user_id: user.id,
            summary: aiAnalysis.summary,
            negotiation_points: aiAnalysis.negotiationPoints,
            suggested_reply_draft: aiAnalysis.suggestedReplyDraft,
            requires_human_action: aiAnalysis.requiresHumanAction,
            human_action_prompt: aiAnalysis.humanActionPrompt,
            ai_model_used: aiAnalysis.modelUsed, // Assuming aiService returns this
            status: aiAnalysis.requiresHumanAction ? 'pending' : 'auto_approved', // Or 'auto_processed'
            created_at: new Date().toISOString(),
          };

          const { error: approvalError } = await dbClient.from('human_approvals').insert([humanApprovalData]);
          if (approvalError) {
            console.error(`[ReplyHandler] Error saving human approval data for conv ${conversation.id}:`, approvalError.message);
          }
          
          // If not requiring human action and auto-send is configured (future feature), send it.
          // For now, all AI suggestions will create a human_approvals record.
          
          // Mark email as read in Gmail to avoid re-processing
          await gmailService.modifyEmail(gmailMsgSummary.id, [], ['UNREAD'], userGmailTokens, onTokensRefreshedCallback);

        } catch (aiError) {
          console.error(`[ReplyHandler] Error during AI analysis for conv ${conversation.id}:`, aiError.message);
          // Still mark as read to avoid loop
          try { 
            await gmailService.modifyEmail(gmailMsgSummary.id, [], ['UNREAD'], userGmailTokens, onTokensRefreshedCallback);
          } catch (modifyError) { /* Log and ignore */ }
        }
      }
    }
  }
}

module.exports = new ReplyHandlerService(); 
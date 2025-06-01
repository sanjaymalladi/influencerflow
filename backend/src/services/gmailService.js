const { google } = require('googleapis');
const { OAuth2 } = google.auth;
const fs = require('fs');
const path = require('path');

// TODO: Load these from config/env variables
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URL = process.env.GOOGLE_REDIRECT_URL; // e.g., http://localhost:3001/api/auth/google/callback or your production callback

/**
 * Creates an OAuth2 client with the given credentials.
 * @param {object} tokens - User's OAuth tokens (access_token, refresh_token, expiry_date).
 *                         Should include access_token, refresh_token, and expiry_date (timestamp).
 * @returns {OAuth2Client}
 */
const createOAuth2Client = (tokens) => {
  const oauth2Client = new OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URL
  );
  if (tokens && tokens.access_token) { // Check for access_token specifically
    oauth2Client.setCredentials({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date, // Ensure this is a Unix timestamp (ms)
    });
  }
  return oauth2Client;
};

/**
 * Retrieves a Gmail API client for a user.
 * Handles token refresh if necessary.
 * @param {object} userTokens - User's stored tokens { gmail_access_token, gmail_refresh_token, gmail_token_expiry }
 *                              from the database.
 * @param {Function} onTokensRefreshed - Callback function to save new tokens: (newTokens) => Promise<void>
 * @returns {Promise<import('googleapis').gmail_v1.Gmail>}
 */
const getGmailClient = async (userTokens, onTokensRefreshed) => {
  if (!userTokens || !userTokens.gmail_access_token) {
    throw new Error('Gmail tokens not provided or access token is missing.');
  }

  const oauth2Client = createOAuth2Client({
    access_token: userTokens.gmail_access_token,
    refresh_token: userTokens.gmail_refresh_token,
    expiry_date: userTokens.gmail_token_expiry 
  });

  // Listen for token refresh events
  oauth2Client.on('tokens', async (tokens) => {
    if (tokens.refresh_token) {
      // New refresh token granted, save it.
      console.log('New Gmail refresh token received.');
      await onTokensRefreshed({
        gmail_access_token: tokens.access_token,
        gmail_refresh_token: tokens.refresh_token, // Save the new refresh token
        gmail_token_expiry: tokens.expiry_date,
      });
      } else {
      // Only access token was refreshed.
      console.log('Gmail access token refreshed.');
      await onTokensRefreshed({
        gmail_access_token: tokens.access_token,
        gmail_token_expiry: tokens.expiry_date,
        // gmail_refresh_token will remain the same, so no need to pass it explicitly unless updating the whole object
      });
    }
  });

  // Check if the access token is expired or needs refresh manually before first call
  // Note: The client library often handles this, but an explicit check can be useful.
  if (userTokens.gmail_token_expiry && userTokens.gmail_token_expiry <= (new Date()).getTime()) {
    if (!userTokens.gmail_refresh_token) {
      throw new Error('Refresh token is missing, and access token is expired. User needs to re-authenticate.');
    }
    try {
      console.log('Attempting to refresh Gmail access token proactively...');
      const { credentials } = await oauth2Client.refreshAccessToken();
      // The 'tokens' event listener above should handle saving these credentials.
      // If not, or for robustness, call onTokensRefreshed here too.
      // oauth2Client.setCredentials(credentials); // The library does this internally
       if (!oauth2Client.listenerCount('tokens')) { // Fallback if listener wasn't triggered or for some reason
           await onTokensRefreshed({
                gmail_access_token: credentials.access_token,
                gmail_refresh_token: credentials.refresh_token || userTokens.gmail_refresh_token, // use new if provided
                gmail_token_expiry: credentials.expiry_date,
            });
      }
    } catch (error) {
      console.error('Error explicitly refreshing Gmail access token:', error);
      // If refresh fails, it often means the refresh token is invalid/revoked.
      throw new Error('Failed to refresh Gmail access token. User may need to re-authenticate.');
    }
  }
  
  return google.gmail({ version: 'v1', auth: oauth2Client });
};

/**
 * Sends an email using the Gmail API.
 * @param {object} params
 * @param {string} params.to - Recipient's email address.
 * @param {string} params.subject - Email subject.
 * @param {string} params.body - Email body (HTML).
 * @param {string} [params.inReplyTo] - Optional Message-ID of the email being replied to (e.g., <CAGN_xG+=0G...@mail.gmail.com>).
 * @param {string} [params.threadId] - Optional Gmail thread ID to keep the email in the same conversation.
 * @param {object} userTokens - User's Gmail OAuth tokens from DB { gmail_access_token, gmail_refresh_token, gmail_token_expiry }.
 * @param {Function} onTokensRefreshed - Callback to save new tokens.
 * @returns {Promise<object>} - The sent message object from Gmail API (includes id and threadId).
 */
const sendEmail = async ({ to, subject, body, inReplyTo, threadId }, userTokens, onTokensRefreshed) => {
  const gmail = await getGmailClient(userTokens, onTokensRefreshed);
  
  const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
  const messageParts = [
    `To: ${to}`,
    // From: field is usually set automatically by Gmail based on authenticated user
    `Subject: ${utf8Subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
  ];
  // For replies, In-Reply-To and References headers are crucial for correct threading.
  if (inReplyTo) {
    messageParts.push(`In-Reply-To: ${inReplyTo}`);
    messageParts.push(`References: ${inReplyTo}`); 
  }
  messageParts.push('', body);
  const email = messageParts.join('\n');

  const encodedMessage = Buffer.from(email)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  const requestBody = {
    raw: encodedMessage,
  };

  // If replying or continuing a thread, use the threadId.
  if (threadId) {
    requestBody.threadId = threadId;
  }

  try {
    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody,
    });
    console.log('Email sent successfully. Message ID:', response.data.id, 'Thread ID:', response.data.threadId);
    return response.data; 
    } catch (error) {
    console.error('Error sending email via Gmail:', error.response ? JSON.stringify(error.response.data) : error.message);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

/**
 * Lists emails for the authenticated user.
 * @param {object} params
 * @param {string} [params.threadId] - Gmail thread ID to list messages from.
 * @param {string} [params.query] - Custom query string (e.g., 'from:sender@example.com is:unread after:yyyy/mm/dd').
 * @param {Array<string>} [params.labelIds=['INBOX']] - Array of label IDs to filter by.
 * @param {number} [params.maxResults=20] - Maximum number of messages to return.
 * @param {object} userTokens - User's Gmail OAuth tokens.
 * @param {Function} onTokensRefreshed - Callback to save new tokens.
 * @returns {Promise<Array<object>>} - Array of message objects (id and threadId typically).
 */
const listEmails = async ({ threadId, query, labelIds = ['INBOX'], maxResults = 20 }, userTokens, onTokensRefreshed) => {
  const gmail = await getGmailClient(userTokens, onTokensRefreshed);
  let q = query || '';

  if (threadId) {
    // When querying by threadId, it's usually for messages *within* that thread.
    // Gmail API list by threadId is implicit if you use messages.list and then get messages from that thread.
    // Or, you can list all messages and filter, or use a query like `thread:threadId`.
    // For now, this assumes `query` might contain `thread:<id>` if needed, or this function is part of a multi-step process.
  }

  try {
    const response = await gmail.users.messages.list({
      userId: 'me',
      labelIds: labelIds,
      q: q || undefined,
      maxResults: maxResults,
    });
    return response.data.messages || [];
  } catch (error) {
    console.error('Error listing emails:', error.response ? JSON.stringify(error.response.data) : error.message);
    throw new Error(`Failed to list emails: ${error.message}`);
  }
};

/**
 * Retrieves the full details of a specific email message.
 * @param {object} params
 * @param {string} params.messageId - The ID of the message to retrieve.
 * @param {object} userTokens - User's Gmail OAuth tokens.
 * @param {Function} onTokensRefreshed - Callback to save new tokens.
 * @param {string} [params.format='full'] - 'full', 'metadata', 'minimal', 'raw'.
 * @returns {Promise<object>} - The Gmail message resource.
 */
const getEmailDetails = async ({ messageId, format = 'full' }, userTokens, onTokensRefreshed) => {
  const gmail = await getGmailClient(userTokens, onTokensRefreshed);
  try {
    const response = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
      format: format,
      });
    return response.data;
    } catch (error) {
    console.error('Error getting email details:', error.response ? JSON.stringify(error.response.data) : error.message);
    throw new Error(`Failed to get email details: ${error.message}`);
  }
};

// Placeholder for a function to extract relevant parts from a raw email (like body, sender, etc.)
const parseEmailDetails = (gmailMessage) => {
  if (!gmailMessage || !gmailMessage.payload) {
    return { subject: '', from: '', date: '', body: '', snippet: gmailMessage.snippet || '' };
  }

  const headers = gmailMessage.payload.headers || [];
  const subjectHeader = headers.find(h => h.name.toLowerCase() === 'subject');
  const fromHeader = headers.find(h => h.name.toLowerCase() === 'from');
  const dateHeader = headers.find(h => h.name.toLowerCase() === 'date');

  let body = '';
  function getPart(part) {
    if (part.mimeType === 'text/html' && part.body && part.body.data) {
      return Buffer.from(part.body.data, 'base64').toString('utf-8');
    }
    if (part.mimeType === 'text/plain' && part.body && part.body.data) {
        return Buffer.from(part.body.data, 'base64').toString('utf-8');
    }
    return null;
  }

  function findTextPart(parts) {
    let htmlBody = null;
    let textBody = null;
    for (const part of parts) {
        if (part.parts) {
            const found = findTextPart(part.parts);
            if (found.htmlBody) htmlBody = found.htmlBody;
            if (found.textBody) textBody = found.textBody;
        } else {
            const currentPartBody = getPart(part);
            if (part.mimeType === 'text/html') htmlBody = currentPartBody;
            if (part.mimeType === 'text/plain') textBody = currentPartBody;
        }
    }
    return { htmlBody, textBody };
  }

  if (gmailMessage.payload.parts) {
    const { htmlBody, textBody } = findTextPart(gmailMessage.payload.parts);
    body = htmlBody || textBody || ''; // Prefer HTML
  } else if (gmailMessage.payload.body && gmailMessage.payload.body.data) {
    body = getPart(gmailMessage.payload) || '';
  }

    return {
    id: gmailMessage.id,
    threadId: gmailMessage.threadId,
    subject: subjectHeader ? subjectHeader.value : 'N/A',
    from: fromHeader ? fromHeader.value : 'N/A',
    date: dateHeader ? dateHeader.value : 'N/A',
    snippet: gmailMessage.snippet || '',
    body: body, // This will be HTML if available, otherwise plain text.
    messageIdHeader: (headers.find(h => h.name.toLowerCase() === 'message-id') || {}).value,
  };
};

module.exports = {
  createOAuth2Client, // Exposed for potential use in auth flow setup
  getGmailClient,     // Primarily internal, but can be useful
  sendEmail,
  listEmails,
  getEmailDetails,
  parseEmailDetails,
}; 
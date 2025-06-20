const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');

class EmailReaderService {
    constructor() {
        this.imapConfig = {
            host: process.env.IMAP_HOST || 'imap.gmail.com',
            port: process.env.IMAP_PORT || 993,
            secure: true,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_APP_PASSWORD
            }
        };
        this.simulationMode = !process.env.EMAIL_USER || process.env.NODE_ENV === 'development';
    }

    async readReplies(campaignId, creatorEmails = []) {
        if (this.simulationMode) {
            return this._simulateEmailReplies(campaignId, creatorEmails);
        }

        try {
            const client = new ImapFlow(this.imapConfig);
            await client.connect();

            // Search for emails from creators
            const replies = [];
            for (const creatorEmail of creatorEmails) {
                const messages = await this._searchEmailsFromSender(client, creatorEmail);
                for (const message of messages) {
                    const parsed = await this._parseEmailReply(client, message);
                    if (parsed) {
                        replies.push({
                            ...parsed,
                            campaignId,
                            creatorEmail,
                            timestamp: new Date()
                        });
                    }
                }
            }

            await client.logout();
            return replies;
        } catch (error) {
            console.error('❌ Error reading email replies:', error);
            return this._simulateEmailReplies(campaignId, creatorEmails);
        }
    }

    async _searchEmailsFromSender(client, senderEmail) {
        try {
            await client.selectMailbox('INBOX');
            
            // Search for emails from the sender in the last 7 days
            const searchCriteria = {
                from: senderEmail,
                since: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            };

            const messages = client.search(searchCriteria);
            return Array.from(messages).slice(0, 10); // Limit to 10 most recent
        } catch (error) {
            console.error(`❌ Error searching emails from ${senderEmail}:`, error);
            return [];
        }
    }

    async _parseEmailReply(client, messageUid) {
        try {
            const message = await client.fetchOne(messageUid, { source: true });
            const parsed = await simpleParser(message.source);

            return {
                messageId: parsed.messageId,
                subject: parsed.subject,
                text: parsed.text,
                html: parsed.html,
                date: parsed.date,
                from: parsed.from?.text,
                replyTo: parsed.replyTo?.text,
                inReplyTo: parsed.inReplyTo,
                references: parsed.references
            };
        } catch (error) {
            console.error('❌ Error parsing email:', error);
            return null;
        }
    }

    _simulateEmailReplies(campaignId, creatorEmails) {
        const mockReplies = [
            {
                messageId: 'mock-reply-001',
                subject: 'Re: Collaboration Opportunity - Tech Review',
                text: `Hi there!

Thanks for reaching out about the tech review collaboration. I'm definitely interested!

My rates are:
- Dedicated video: $2,500
- Instagram post: $800  
- Story mentions: $200 each

I can deliver the video within 2 weeks and would need the product 3 days before filming.

Let me know if these terms work for you!

Best,
Alex Tech`,
                creatorEmail: creatorEmails[0] || 'alex.tech@example.com',
                campaignId,
                timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
                negotiationStatus: 'initial_response',
                proposedRates: {
                    video: 2500,
                    instagram_post: 800,
                    story: 200
                },
                timeline: '2 weeks',
                requirements: ['Product 3 days before filming']
            },
            {
                messageId: 'mock-reply-002',
                subject: 'Re: Brand Partnership Inquiry',
                text: `Hello!

Thank you for the partnership opportunity. I love your brand!

My standard rates are a bit higher:
- Sponsored video: $3,200
- Instagram post: $1,000

But I'm open to negotiation for the right partnership. I could do a package deal for $3,800 total.

Timeline would be 10-14 days from contract signing.

Looking forward to hearing from you!

Sarah`,
                creatorEmail: creatorEmails[1] || 'sarah.lifestyle@example.com',
                campaignId,
                timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
                negotiationStatus: 'counter_offer',
                proposedRates: {
                    video: 3200,
                    instagram_post: 1000,
                    package_deal: 3800
                },
                timeline: '10-14 days',
                openToNegotiation: true
            }
        ];

        return mockReplies.slice(0, Math.min(creatorEmails.length, mockReplies.length));
    }

    async markAsRead(messageId) {
        if (this.simulationMode) {
            console.log(`📧 [SIMULATION] Marked message ${messageId} as read`);
            return true;
        }

        try {
            const client = new ImapFlow(this.imapConfig);
            await client.connect();
            await client.selectMailbox('INBOX');
            
            // Find message by ID and mark as read
            const messages = client.search({ header: ['message-id', messageId] });
            for await (const message of messages) {
                await client.messageFlagsAdd(message.seq, ['\\Seen']);
            }
            
            await client.logout();
            return true;
        } catch (error) {
            console.error('❌ Error marking email as read:', error);
            return false;
        }
    }

    extractNegotiationData(emailText) {
        const negotiationData = {
            rates: {},
            timeline: null,
            requirements: [],
            sentiment: 'neutral',
            openToNegotiation: false
        };

        // Extract monetary amounts
        const rateRegex = /[₹$](\d+(?:,\d+)?(?:\.\d{2})?)/g;
        const rates = [];
        let match;
        while ((match = rateRegex.exec(emailText)) !== null) {
            rates.push(parseFloat(match[1].replace(',', '')));
        }

        if (rates.length > 0) {
            negotiationData.rates.proposed = rates;
            negotiationData.rates.highest = Math.max(...rates);
            negotiationData.rates.lowest = Math.min(...rates);
        }

        // Extract timeline mentions
        const timelineRegex = /(?:within|in|about|around)\s+(\d+)\s+(days?|weeks?|months?)/i;
        const timelineMatch = emailText.match(timelineRegex);
        if (timelineMatch) {
            negotiationData.timeline = `${timelineMatch[1]} ${timelineMatch[2]}`;
        }

        // Check for negotiation willingness
        const negotiationKeywords = [
            'open to negotiation', 'flexible', 'discuss', 'negotiate',
            'willing to work with', 'can adjust', 'room for discussion'
        ];
        negotiationData.openToNegotiation = negotiationKeywords.some(keyword => 
            emailText.toLowerCase().includes(keyword)
        );

        // Basic sentiment analysis
        const positiveWords = ['excited', 'love', 'great', 'perfect', 'interested', 'definitely'];
        const negativeWords = ['unfortunately', 'can\'t', 'unable', 'busy', 'not interested'];
        
        const positiveCount = positiveWords.filter(word => 
            emailText.toLowerCase().includes(word)
        ).length;
        const negativeCount = negativeWords.filter(word => 
            emailText.toLowerCase().includes(word)
        ).length;

        if (positiveCount > negativeCount) {
            negotiationData.sentiment = 'positive';
        } else if (negativeCount > positiveCount) {
            negotiationData.sentiment = 'negative';
        }

        return negotiationData;
    }
}

module.exports = EmailReaderService; 
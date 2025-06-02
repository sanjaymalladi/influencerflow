const { supabaseAdmin } = require('../src/config/supabase');
const { v4: uuidv4 } = require('uuid');

// --- Configuration & Mock Data ---
const MOCK_USER_ID = '550e8400-e29b-41d4-a716-446655440000';
// IMPORTANT: Replace 'YOUR_ACTUAL_CAMPAIGN_UUID_HERE' with a real UUID from your 'campaigns' table
const MOCK_CAMPAIGN_ID = 'YOUR_ACTUAL_CAMPAIGN_UUID_HERE'; 
const MOCK_CREATOR_ID = '01cc9cc7-143e-47d2-bbc6-1dedbc20187c'; // Ensure this UUID exists in your 'creators' table

const MOCK_OUTREACH_EMAIL_ID = uuidv4(); // Generate a new UUID for the outreach email
const MOCK_OUTREACH_EMAIL_EXTERNAL_ID = 'mock_external_' + uuidv4().slice(0,12); // Gmail message ID can be a string

const MOCK_USER_EMAIL = 'user@example.com';
const MOCK_CREATOR_EMAIL = 'malladisanjay29@gmail.com';

const mockThreadId = `mock_thread_sanjay_negotiation_${uuidv4().slice(0,8)}`;
const conversationId = uuidv4();
const contractId = uuidv4();

const initialEmailContent = `Dear Sanjay,

My name is Demo User, and I'm a Marketing Manager at Demo Company. I've been a long-time follower of your channel, Sanjay Malladi, and I'm consistently impressed by your insightful content on technology, AI/ML, and entrepreneurship. Your tutorials are particularly clear and engaging – I especially enjoyed [mention a specific video or series if possible, showing you've done your research]. Your ability to break down complex technical concepts for a wider audience perfectly aligns with our upcoming campaign.

We're thrilled to be launching the Meta Ray-Ban smart glasses in India, and we believe a collaboration with you would be incredibly impactful. Your audience's keen interest in cutting-edge technology makes them the ideal target demographic for this launch.

We're proposing a sponsored unboxing video showcasing the new Meta Ray-Ban smart glasses. This collaboration would involve you receiving a pair of the glasses and creating a high-quality, engaging unboxing video highlighting their features and functionalities. We're offering a compensation of $10,000 for this single video deliverable. This would allow you to showcase your expertise in tech reviews while introducing your audience to a revolutionary product.

The video should be approximately [suggest a length, e.g., 5-7 minutes] and align with your existing content style, maintaining the authenticity and informative approach your audience appreciates. We're happy to provide you with all necessary materials and support to ensure a successful collaboration.

Would you be open to a brief call next week to discuss this opportunity further? Please let me know your availability.

Sincerely,

Demo User
Marketing Manager
Demo Company`;

async function seedMockNegotiation() {
  console.log('--- Starting Mock Negotiation Seeding Script (using Admin Client) ---');
  console.log(`USING Campaign ID: ${MOCK_CAMPAIGN_ID}`);
  console.log(`USING Creator ID: ${MOCK_CREATOR_ID}`);
  console.log(`Generated Outreach Email ID: ${MOCK_OUTREACH_EMAIL_ID}`);

  if (MOCK_CAMPAIGN_ID === 'YOUR_ACTUAL_CAMPAIGN_UUID_HERE') {
    console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
    console.error('ERROR: Please replace "YOUR_ACTUAL_CAMPAIGN_UUID_HERE" in the seed script with a real campaign UUID from your database.');
    console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
    return; // Stop the script
  }

  try {
    // Ensure supabaseAdmin is available
    if (!supabaseAdmin) {
      console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
      console.error('ERROR: Supabase Admin Client is not available. Check SUPABASE_SERVICE_KEY.');
      console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
      return; // Stop the script
    }

    // 1. Ensure/Update Initial Outreach Email (from user's perspective)
    console.log(`Step 1: Upserting outreach email ID: ${MOCK_OUTREACH_EMAIL_ID}`);
    const { error: outreachError } = await supabaseAdmin
      .from('outreach_emails')
      .upsert({
        id: MOCK_OUTREACH_EMAIL_ID,
        user_id: MOCK_USER_ID,
        campaign_id: MOCK_CAMPAIGN_ID,
        creator_id: MOCK_CREATOR_ID,
        subject: 'Level Up Your Tech Content with the New Meta Ray-Ban Smart Glasses',
        content: initialEmailContent,
        status: 'sent', 
        email_thread_id: mockThreadId,
        external_id: MOCK_OUTREACH_EMAIL_EXTERNAL_ID,
        sent_at: new Date('2025-06-01T19:11:07.111Z').toISOString(),
        created_at: new Date('2025-06-01T19:11:05.898Z').toISOString(),
        provider: 'gmail',
        tracking_data: {
          recipientEmail: MOCK_CREATOR_EMAIL,
          deliveryStatus: 'delivered',
          messageId: MOCK_OUTREACH_EMAIL_EXTERNAL_ID,
          threadId: mockThreadId, 
          sentAt: new Date('2025-06-01T19:11:07.111Z').toISOString(),
          sentMethod: 'new_gmail_service' 
        }
      })
      .select(); // Added select() to potentially get data back, though not used here

    if (outreachError) throw new Error(`Error upserting outreach email: ${outreachError.message} (Details: ${outreachError.details}, Hint: ${outreachError.hint})`);
    console.log('Outreach email upserted/updated.');

    // 2. Create the Conversation Record
    console.log(`Step 2: Creating conversation record ID: ${conversationId}`);
    let messages = [
      {
        id: uuidv4(),
        provider_message_id: MOCK_OUTREACH_EMAIL_EXTERNAL_ID,
        provider_thread_id: mockThreadId,
        sender_type: 'user',
        sender_email: MOCK_USER_EMAIL,
        content_text: initialEmailContent,
        subject: 'Level Up Your Tech Content with the New Meta Ray-Ban Smart Glasses',
        sent_at: new Date('2025-06-01T19:11:07.111Z').toISOString(),
        created_at: new Date().toISOString(),
      }
    ];

    const { error: convInsertError } = await supabaseAdmin
      .from('conversations')
      .insert({
        id: conversationId,
        user_id: MOCK_USER_ID,
        campaign_id: MOCK_CAMPAIGN_ID,
        creator_id: MOCK_CREATOR_ID,
        outreach_email_id: MOCK_OUTREACH_EMAIL_ID, 
        email_thread_id: mockThreadId,
        status: 'initiated',
        messages: messages,
        last_message_at: messages[0].sent_at,
        created_at: new Date().toISOString(),
      });
    if (convInsertError) throw new Error(`Error inserting conversation: ${convInsertError.message} (Details: ${convInsertError.details}, Hint: ${convInsertError.hint})`);
    console.log('Conversation created.');

    // --- Simulate negotiation steps ---

    // Sanjay: "hey i am interested let me know more details"
    console.log('Step 3: Sanjay replies - interested');
    messages.push({
      id: uuidv4(),
      provider_message_id: `mock_gmail_sanjay_reply_1_${uuidv4().slice(0,4)}`,
      provider_thread_id: mockThreadId,
      sender_type: 'creator',
      sender_email: MOCK_CREATOR_EMAIL,
      content_text: "hey i am interested let me know more details",
      received_at: new Date('2025-06-01T20:00:00Z').toISOString(),
      created_at: new Date().toISOString(),
    });
    const { error: convUpdateError1 } = await supabaseAdmin.from('conversations').update({ messages, status: 'replied', last_message_at: messages[messages.length - 1].received_at }).eq('id', conversationId);
    if (convUpdateError1) throw new Error(`Conversation update error (Sanjay interested): ${convUpdateError1.message}`);
    const { error: outreachUpdateError1 } = await supabaseAdmin.from('outreach_emails').update({ status: 'replied', replied_at: messages[messages.length - 1].received_at }).eq('id', MOCK_OUTREACH_EMAIL_ID);
    if (outreachUpdateError1) throw new Error(`Outreach email update error (Sanjay interested): ${outreachUpdateError1.message}`);
    console.log('Sanjay\'s first reply added.');

    // AI: "here are the deliverables we are expecting detailed"
    console.log('Step 4: AI replies - deliverables');
    messages.push({
      id: uuidv4(),
      provider_message_id: `mock_gmail_ai_reply_1_${uuidv4().slice(0,4)}`,
      provider_thread_id: mockThreadId,
      sender_type: 'system', 
      sender_email: MOCK_USER_EMAIL, 
      content_text: "Here are the deliverables we are expecting in detail:\n1. A 15-minute dedicated YouTube review video.\n2. Three Instagram stories announcing the video.\n3. One Instagram post linking to the video.",
      sent_at: new Date('2025-06-01T20:05:00Z').toISOString(),
      created_at: new Date().toISOString(),
    });
    const { error: convUpdateError2 } = await supabaseAdmin.from('conversations').update({ messages, last_message_at: messages[messages.length - 1].sent_at }).eq('id', conversationId);
    if (convUpdateError2) throw new Error(`Conversation update error (AI deliverables): ${convUpdateError2.message}`);
    console.log('AI detailed deliverables reply added.');

    // Sanjay: "hey 15 mins video my audience retention falls after 10 min so can i do 10 min video"
    console.log('Step 5: Sanjay replies - 10 min video request');
    messages.push({
      id: uuidv4(),
      provider_message_id: `mock_gmail_sanjay_reply_2_${uuidv4().slice(0,4)}`,
      provider_thread_id: mockThreadId,
      sender_type: 'creator',
      sender_email: MOCK_CREATOR_EMAIL,
      content_text: "hey 15 mins video my audience retention falls after 10 min so can i do 10 min video",
      received_at: new Date('2025-06-01T20:15:00Z').toISOString(),
      created_at: new Date().toISOString(),
    });
    const { error: convUpdateError3 } = await supabaseAdmin.from('conversations').update({ messages, last_message_at: messages[messages.length - 1].received_at }).eq('id', conversationId);
    if (convUpdateError3) throw new Error(`Conversation update error (Sanjay 10min request): ${convUpdateError3.message}`);
    console.log('Sanjay\'s 10-min video request added.');
    
    // AI: "...let me get back to you..." AND asks human for input.
    console.log('Step 6: AI replies - hold & asks human');
    messages.push({
      id: uuidv4(),
      provider_message_id: `mock_gmail_ai_reply_2_hold_${uuidv4().slice(0,4)}`,
      provider_thread_id: mockThreadId,
      sender_type: 'system',
      sender_email: MOCK_USER_EMAIL,
      content_text: "Thanks for letting us know, Sanjay. Let me check with my manager regarding the video length and I'll get back to you shortly.",
      sent_at: new Date('2025-06-01T20:17:00Z').toISOString(),
      created_at: new Date().toISOString(),
    });
    const { error: convUpdateError4 } = await supabaseAdmin.from('conversations').update({ messages, last_message_at: messages[messages.length - 1].sent_at }).eq('id', conversationId);
    if (convUpdateError4) throw new Error(`Conversation update error (AI hold): ${convUpdateError4.message}`);
    
    const approval1Id = uuidv4();
    const { error: approvalInsertError1 } = await supabaseAdmin.from('human_approvals').insert({
      id: approval1Id,
      conversation_id: conversationId,
      user_id: MOCK_USER_ID,
      summary: "Sanjay requests 10-min video instead of 15-min due to audience retention.",
      negotiation_points: { original_video_length: "15 minutes", requested_video_length: "10 minutes", reason: "audience retention falls after 10 min" },
      requires_human_action: true,
      human_action_prompt: "Sanjay wants to do a 10 min video instead of 15 as we asked because his audience retention falls after 10 min. What is your decision?",
      ai_model_used: "gemini-pro-mock",
      status: 'pending',
      created_at: new Date('2025-06-01T20:17:05Z').toISOString(),
    });
    if (approvalInsertError1) throw new Error(`Human approval insert error (1): ${approvalInsertError1.message}`);
    console.log('AI hold reply and human approval (1) created.');

    // Human: "ok 10 min is fine but he needs to do 2 Instagram post"
    console.log('Step 7: Human decision on approval (1)');
    const { error: approvalUpdateError1 } = await supabaseAdmin.from('human_approvals').update({
      status: 'action_taken', 
      human_decision_notes: "Approved 10 min video, countered with 2 Instagram posts.",
      resolved_at: new Date('2025-06-01T20:25:00Z').toISOString(),
    }).eq('id', approval1Id);
    if (approvalUpdateError1) throw new Error(`Human approval update error (1): ${approvalUpdateError1.message}`);
    console.log('Human approval (1) updated.');

    // AI: sends reply "as per my manager... 10 min video if you post 2 Instagram posts as well"
    console.log('Step 8: AI replies - counter offer');
    messages.push({
      id: uuidv4(),
      provider_message_id: `mock_gmail_ai_reply_3_counter_${uuidv4().slice(0,4)}`,
      provider_thread_id: mockThreadId,
      sender_type: 'system',
      sender_email: MOCK_USER_EMAIL,
      content_text: "Hi Sanjay, good news! My manager has approved a 10-minute video. In addition to the 10-minute video, we'd also require two Instagram posts as part of the deliverables. Let me know if that works for you!",
      sent_at: new Date('2025-06-01T20:27:00Z').toISOString(),
      created_at: new Date().toISOString(),
    });
    const { error: convUpdateError5 } = await supabaseAdmin.from('conversations').update({ messages, last_message_at: messages[messages.length - 1].sent_at }).eq('id', conversationId);
    if (convUpdateError5) throw new Error(`Conversation update error (AI counter): ${convUpdateError5.message}`);
    console.log('AI counter-offer reply added.');

    // Sanjay: "it's completely fine i am ok with the deliverables"
    console.log('Step 9: Sanjay replies - accepts counter');
    messages.push({
      id: uuidv4(),
      provider_message_id: `mock_gmail_sanjay_reply_3_accept_${uuidv4().slice(0,4)}`,
      provider_thread_id: mockThreadId,
      sender_type: 'creator',
      sender_email: MOCK_CREATOR_EMAIL,
      content_text: "Great, that sounds completely fine. I am ok with those deliverables.",
      received_at: new Date('2025-06-01T20:35:00Z').toISOString(),
      created_at: new Date().toISOString(),
    });
    const { error: convUpdateError6 } = await supabaseAdmin.from('conversations').update({ messages, status: 'negotiation_agreed', last_message_at: messages[messages.length - 1].received_at }).eq('id', conversationId);
    if (convUpdateError6) throw new Error(`Conversation update error (Sanjay accepts): ${convUpdateError6.message}`);
    console.log('Sanjay accepts counter-offer.');

    // AI: "fine let me draft a contract and send you"
    console.log('Step 10: AI replies - contract drafting');
    messages.push({
      id: uuidv4(),
      provider_message_id: `mock_gmail_ai_reply_4_contract_prep_${uuidv4().slice(0,4)}`,
      provider_thread_id: mockThreadId,
      sender_type: 'system',
      sender_email: MOCK_USER_EMAIL,
      content_text: "Excellent! I'll draft the contract with these terms and send it over to you shortly for review.",
      sent_at: new Date('2025-06-01T20:37:00Z').toISOString(),
      created_at: new Date().toISOString(),
    });
    const { error: convUpdateError7 } = await supabaseAdmin.from('conversations').update({ messages, last_message_at: messages[messages.length - 1].sent_at }).eq('id', conversationId);
    if (convUpdateError7) throw new Error(`Conversation update error (AI contract prep): ${convUpdateError7.message}`);
    
    const { error: contractInsertError } = await supabaseAdmin.from('contracts').insert({
      id: contractId,
      conversation_id: conversationId,
      campaign_id: MOCK_CAMPAIGN_ID,
      creator_id: MOCK_CREATOR_ID,
      user_id: MOCK_USER_ID,
      final_terms: { video_length: "10 minutes", instagram_posts: 2, compensation: 10000, currency: "USD", product: "Meta Ray-Ban Smart Glasses" },
      status: 'drafting_by_ai',
      created_at: new Date('2025-06-01T20:38:00Z').toISOString(),
    });
    if (contractInsertError) throw new Error(`Contract insert error: ${contractInsertError.message}`);
    console.log('AI contract drafting message and contract record created.');

    // AI: "here is the contract" (PDF) & asks human to verify/sign.
    console.log('Step 11: AI "sends" contract to human for approval');
    const { error: contractUpdateError1 } = await supabaseAdmin.from('contracts').update({
      contract_pdf_url: 'https://example.com/mock_contract_sanjay_v1.pdf', 
      status: 'pending_user_approval',
      updated_at: new Date('2025-06-01T20:40:00Z').toISOString(),
    }).eq('id', contractId);
    if (contractUpdateError1) throw new Error(`Contract update error (pending user approval): ${contractUpdateError1.message}`);

    const approval2Id = uuidv4();
    const { error: approvalInsertError2 } = await supabaseAdmin.from('human_approvals').insert({
      id: approval2Id,
      conversation_id: conversationId,
      related_contract_id: contractId,
      user_id: MOCK_USER_ID,
      summary: "Contract drafted for Sanjay Malladi (Meta Ray Ban Campaign).",
      negotiation_points: { video_length: "10 minutes", instagram_posts: 2, compensation: 10000, currency: "USD", product: "Meta Ray-Ban Smart Glasses" }, 
      suggested_reply_draft: "Please review the attached contract. If all looks good, approve to send to Sanjay.",
      requires_human_action: true,
      human_action_prompt: "Contract for Sanjay is ready. Review and approve sending. [Link to PDF: https://example.com/mock_contract_sanjay_v1.pdf]",
      status: 'pending',
      created_at: new Date('2025-06-01T20:40:05Z').toISOString(),
    });
    if (approvalInsertError2) throw new Error(`Human approval insert error (2): ${approvalInsertError2.message}`);
    console.log('Contract updated to pending human approval (2).');
    
    // Human: Verifies and approves sending to Sanjay.
    console.log('Step 12: Human approves contract for sending');
    const { error: approvalUpdateError2 } = await supabaseAdmin.from('human_approvals').update({
      status: 'approved',
      resolved_at: new Date('2025-06-01T20:45:00Z').toISOString(),
    }).eq('id', approval2Id);
    if (approvalUpdateError2) throw new Error(`Human approval update error (2): ${approvalUpdateError2.message}`);
    
    const { error: contractUpdateError2 } = await supabaseAdmin.from('contracts').update({
      status: 'sent_to_creator',
      sent_to_creator_at: new Date('2025-06-01T20:45:10Z').toISOString(),
      user_signed_at: new Date('2025-06-01T20:45:00Z').toISOString(), 
    }).eq('id', contractId);
    if (contractUpdateError2) throw new Error(`Contract update error (sent to creator): ${contractUpdateError2.message}`);

    messages.push({
      id: uuidv4(),
      provider_message_id: `mock_gmail_ai_reply_5_contract_sent_${uuidv4().slice(0,4)}`,
      provider_thread_id: mockThreadId,
      sender_type: 'system',
      sender_email: MOCK_USER_EMAIL,
      content_text: "Hi Sanjay, please find the contract attached based on our agreed terms. Let me know if you have any questions. Otherwise, please sign and return.",
      attachments: [{ fileName: "Contract_SanjayMalladi_MetaRayBan.pdf", url: "https://example.com/mock_contract_sanjay_v1.pdf" }],
      sent_at: new Date('2025-06-01T20:45:15Z').toISOString(),
      created_at: new Date().toISOString(),
    });
    const { error: convUpdateError8 } = await supabaseAdmin.from('conversations').update({ messages, last_message_at: messages[messages.length - 1].sent_at }).eq('id', conversationId);
    if (convUpdateError8) throw new Error(`Conversation update error (AI sends contract): ${convUpdateError8.message}`);
    console.log('Contract sent to Sanjay (simulated) & approval (2) updated.');

    // Sanjay: "here is the signed copy"
    console.log('Step 13: Sanjay returns signed contract');
    messages.push({
      id: uuidv4(),
      provider_message_id: `mock_gmail_sanjay_reply_4_signed_${uuidv4().slice(0,4)}`,
      provider_thread_id: mockThreadId,
      sender_type: 'creator',
      sender_email: MOCK_CREATOR_EMAIL,
      content_text: "Thanks! Here is the signed copy.",
      attachments: [{ "fileName": "Signed_Contract_SanjayMalladi.pdf", "url": "https://example.com/mock_signed_contract_sanjay.pdf" }],
      received_at: new Date('2025-06-01T21:00:00Z').toISOString(),
      created_at: new Date().toISOString(),
    });
    const { error: convUpdateError9 } = await supabaseAdmin.from('conversations').update({ messages, last_message_at: messages[messages.length - 1].received_at }).eq('id', conversationId);
    if (convUpdateError9) throw new Error(`Conversation update error (Sanjay returns signed): ${convUpdateError9.message}`);
    
    const { error: contractUpdateError3 } = await supabaseAdmin.from('contracts').update({
      status: 'signed_by_creator', 
      creator_signed_at: new Date('2025-06-01T21:00:00Z').toISOString(),
      signed_contract_pdf_url: 'https://example.com/mock_signed_contract_sanjay.pdf',
    }).eq('id', contractId);
    if (contractUpdateError3) throw new Error(`Contract update error (signed by creator): ${contractUpdateError3.message}`);
    console.log('Sanjay returns signed contract, records updated.');

    // AI asks human to verify signed copy.
    console.log('Step 14: AI asks human for final verification');
    const approval3Id = uuidv4();
    const { error: approvalInsertError3 } = await supabaseAdmin.from('human_approvals').insert({
      id: approval3Id,
      conversation_id: conversationId,
      related_contract_id: contractId,
      user_id: MOCK_USER_ID,
      summary: "Sanjay Malladi has returned the signed contract.",
      requires_human_action: true,
      human_action_prompt: "Sanjay has signed and returned the contract. Please verify the signed copy. [Link to Signed PDF: https://example.com/mock_signed_contract_sanjay.pdf]",
      status: 'pending',
      created_at: new Date('2025-06-01T21:00:05Z').toISOString(),
    });
    if (approvalInsertError3) throw new Error(`Human approval insert error (3): ${approvalInsertError3.message}`);
    console.log('Human approval (3) for final verification created.');

    // Human: Verifies, closes negotiations.
    console.log('Step 15: Human verifies and completes negotiation');
    const { error: approvalUpdateError3 } = await supabaseAdmin.from('human_approvals').update({
      status: 'completed', 
      resolved_at: new Date('2025-06-01T21:05:00Z').toISOString(),
    }).eq('id', approval3Id);
    if (approvalUpdateError3) throw new Error(`Human approval update error (3): ${approvalUpdateError3.message}`);
    
    const { error: contractUpdateError4 } = await supabaseAdmin.from('contracts').update({
      status: 'active', 
      updated_at: new Date('2025-06-01T21:05:00Z').toISOString(),
    }).eq('id', contractId);
    if (contractUpdateError4) throw new Error(`Contract update error (active): ${contractUpdateError4.message}`);
    
    const { error: convUpdateError10 } = await supabaseAdmin.from('conversations').update({
      status: 'contract_active', 
    }).eq('id', conversationId);
    if (convUpdateError10) throw new Error(`Conversation update error (contract active): ${convUpdateError10.message}`);
    console.log('Negotiation completed, contract active.');

    console.log('--- Mock Negotiation Seeding Script Finished Successfully ---');

  } catch (error) {
    console.error('--- Mock Negotiation Seeding Script FAILED ---');
    console.error(error.message);
    // Log Supabase specific details if available
    if (error.details) console.error(`Details: ${error.details}`);
    if (error.hint) console.error(`Hint: ${error.hint}`);
    if (error.code) console.error(`Code: ${error.code}`);
  }
}

// Run the seeding function
seedMockNegotiation(); 
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- === Mock Negotiation Seeding SQL Script ===

-- IMPORTANT: Replace these placeholder UUIDs with actual UUIDs from your database!
DO $$ 
DECLARE 
    mock_user_id UUID := '550e8400-e29b-41d4-a716-446655440000'; -- Ensure this user exists in your 'users' table AND IS THE USER YOU ARE VIEWING THE FRONTEND AS or that the frontend queries for.
    mock_campaign_id UUID := 'bd812580-77cd-41ee-ab86-233ab375274e'; -- Ensure this campaign exists and the UUID is correct, and is one the frontend would display.
    mock_creator_id UUID := '01cc9cc7-143e-47d2-bbc6-1dedbc20187c'; -- Ensure this creator exists.

    -- Generated IDs for this run
    v_outreach_email_id UUID := uuid_generate_v4();
    v_conversation_id UUID := uuid_generate_v4();
    v_contract_id UUID := uuid_generate_v4();
    v_email_thread_id TEXT := 'mock_thread_sql_' || substr(uuid_generate_v4()::text, 1, 8);
    v_external_id TEXT := 'mock_external_sql_' || substr(uuid_generate_v4()::text, 1, 12);

    v_user_email TEXT := 'sanjaymallladi12@gmail.com'; -- Email of the user sending the outreach
    v_creator_email TEXT := 'malladisanjay29@gmail.com'; -- Creator's contact email
    v_creator_name TEXT := 'Sanjay M (Mock)'; -- Creator's name for conversations table

    v_initial_email_subject TEXT := 'Level Up Your Tech Content with the New Meta Ray-Ban Smart Glasses';
    v_initial_email_content TEXT := 'Dear Sanjay,\n\nMy name is Demo User, and I''m a Marketing Manager at Demo Company. I''ve been a long-time follower of your channel, Sanjay Malladi, and I''m consistently impressed by your insightful content on technology, AI/ML, and entrepreneurship. Your tutorials are particularly clear and engaging – I especially enjoyed [mention a specific video or series if possible, showing you''ve done your research]. Your ability to break down complex technical concepts for a wider audience perfectly aligns with our upcoming campaign.\n\nWe''re thrilled to be launching the Meta Ray-Ban smart glasses in India, and we believe a collaboration with you would be incredibly impactful. Your audience''s keen interest in cutting-edge technology makes them the ideal target demographic for this launch.\n\nWe''re proposing a sponsored unboxing video showcasing the new Meta Ray-Ban smart glasses. This collaboration would involve you receiving a pair of the glasses and creating a high-quality, engaging unboxing video highlighting their features and functionalities. We''re offering a compensation of $10,000 for this single video deliverable. This would allow you to showcase your expertise in tech reviews while introducing your audience to a revolutionary product.\n\nThe video should be approximately [suggest a length, e.g., 5-7 minutes] and align with your existing content style, maintaining the authenticity and informative approach your audience appreciates. We''re happy to provide you with all necessary materials and support to ensure a successful collaboration.\n\nWould you be open to a brief call next week to discuss this opportunity further? Please let me know your availability.\n\nSincerely,\n\nDemo User\nMarketing Manager\nDemo Company';

    v_approval_1_id UUID;
    v_approval_2_id UUID;
    v_approval_3_id UUID;

    -- Timestamp variables (dynamic relative to NOW(), as timestamp without time zone)
    v_ts_base timestamp without time zone := NOW() - INTERVAL '24 hours'; -- Base point: 24 hours ago

    v_ts_outreach_created_at timestamp without time zone := v_ts_base;
    v_ts_outreach_sent_at timestamp without time zone := v_ts_base + INTERVAL '2 seconds';
    v_ts_conv_initial_last_msg_at timestamp without time zone := v_ts_outreach_sent_at;
    
    v_ts_sanjay_reply1_received_at timestamp without time zone := v_ts_outreach_sent_at + INTERVAL '1 hour';
    v_ts_ai_reply1_sent_at timestamp without time zone := v_ts_sanjay_reply1_received_at + INTERVAL '5 minutes';
    
    v_ts_sanjay_reply2_received_at timestamp without time zone := v_ts_ai_reply1_sent_at + INTERVAL '10 minutes';
    v_ts_ai_reply2_hold_sent_at timestamp without time zone := v_ts_sanjay_reply2_received_at + INTERVAL '2 minutes';
    
    v_ts_approval1_created_at timestamp without time zone := v_ts_ai_reply2_hold_sent_at + INTERVAL '5 seconds';
    v_ts_approval1_resolved_at timestamp without time zone := v_ts_approval1_created_at + INTERVAL '8 minutes'; -- Human takes 8 mins
    
    v_ts_ai_reply3_counter_sent_at timestamp without time zone := v_ts_approval1_resolved_at + INTERVAL '2 minutes';
    v_ts_sanjay_reply3_accept_received_at timestamp without time zone := v_ts_ai_reply3_counter_sent_at + INTERVAL '8 minutes';
    
    v_ts_ai_reply4_contract_prep_sent_at timestamp without time zone := v_ts_sanjay_reply3_accept_received_at + INTERVAL '2 minutes';
    v_ts_contract_draft_created_at timestamp without time zone := v_ts_ai_reply4_contract_prep_sent_at + INTERVAL '1 minute';
    
    v_ts_approval2_created_at timestamp without time zone := v_ts_contract_draft_created_at + INTERVAL '2 minutes';
    v_ts_contract_user_signed_at timestamp without time zone := v_ts_approval2_created_at + INTERVAL '5 minutes'; -- User signs during approval
    v_ts_approval2_resolved_at timestamp without time zone := v_ts_contract_user_signed_at; -- Approval resolved when user signs
    
    v_ts_contract_sent_to_creator_at timestamp without time zone := v_ts_approval2_resolved_at + INTERVAL '10 seconds';
    v_ts_ai_reply5_contract_sent_at timestamp without time zone := v_ts_contract_sent_to_creator_at + INTERVAL '5 seconds';
    
    v_ts_sanjay_reply4_signed_received_at timestamp without time zone := v_ts_ai_reply5_contract_sent_at + INTERVAL '15 minutes';
    v_ts_contract_creator_signed_at timestamp without time zone := v_ts_sanjay_reply4_signed_received_at;
    
    v_ts_approval3_created_at timestamp without time zone := v_ts_contract_creator_signed_at + INTERVAL '5 seconds';
    v_ts_approval3_resolved_at timestamp without time zone := v_ts_approval3_created_at + INTERVAL '5 minutes';

    -- Variables for human_approvals.creator_message content
    creator_msg_video_length TEXT := 'hey 15 mins video my audience retention falls after 10 min so can i do 10 min video';
    creator_msg_contract_review TEXT := 'Contract for Sanjay is ready. Review and approve sending. [Link to PDF: https://example.com/mock_contract_sanjay_v1.pdf]'; -- System message for internal review
    creator_msg_signed_contract TEXT := 'Thanks! Here is the signed copy.';

BEGIN
    RAISE NOTICE 'Starting mock negotiation seed...';
    RAISE NOTICE 'Using User ID: %, Campaign ID: %, Creator ID: %', mock_user_id, mock_campaign_id, mock_creator_id;
    RAISE NOTICE 'Generated Outreach Email ID: %, Conversation ID: %, Contract ID: %', v_outreach_email_id, v_conversation_id, v_contract_id;
    RAISE NOTICE 'Base timestamp for data: %', to_char(v_ts_base, 'YYYY-MM-DD HH24:MI:SS.MS TZ');

    -- 1. Create Initial Outreach Email
    RAISE NOTICE 'Step 1: Creating outreach email...';
    INSERT INTO public.outreach_emails 
        (id, user_id, campaign_id, creator_id, subject, content, status, email_thread_id, external_id, sent_at, provider, tracking_data, created_at, updated_at, conversation_id)
    VALUES 
        (v_outreach_email_id, mock_user_id, mock_campaign_id, mock_creator_id, v_initial_email_subject, v_initial_email_content, 'sent', v_email_thread_id, v_external_id, v_ts_outreach_sent_at, 'gmail', 
         jsonb_build_object(
            'recipientEmail', v_creator_email,
            'deliveryStatus', 'delivered',
            'messageId', v_external_id,
            'threadId', v_email_thread_id,
            'sentAt', to_char(v_ts_outreach_sent_at, 'YYYY-MM-DD HH24:MI:SS.MS')::TEXT,
            'sentMethod', 'new_gmail_service_sql_seed'
         ),
         v_ts_outreach_created_at, NOW(), v_conversation_id); -- Added conversation_id link here
    RAISE NOTICE 'Outreach email created.';

    -- 2. Create Conversation Record with initial message
    RAISE NOTICE 'Step 2: Creating conversation record...';
    INSERT INTO public.conversations
        (id, campaign_id, creator_email, creator_name, stage, messages, email_thread_id, last_message_at, created_at, updated_at)
    VALUES
        (v_conversation_id, mock_campaign_id, v_creator_email, v_creator_name, 'initial_contact', -- Using schema's `stage`
         ARRAY[jsonb_build_object( -- messages is jsonb[]
            'id', uuid_generate_v4(),
            'provider_message_id', v_external_id,
            'provider_thread_id', v_email_thread_id,
            'sender_type', 'user',
            'sender_email', v_user_email,
            'content_text', v_initial_email_content,
            'subject', v_initial_email_subject,
            'sent_at', to_char(v_ts_outreach_sent_at, 'YYYY-MM-DD HH24:MI:SS.MS')::TEXT,
            'created_at', to_char(NOW(), 'YYYY-MM-DD HH24:MI:SS.MS')::TEXT
         )]::jsonb[],
         v_email_thread_id, v_ts_conv_initial_last_msg_at, v_ts_base, NOW());
    RAISE NOTICE 'Conversation created.';

    -- Step 3: Sanjay replies - interested
    RAISE NOTICE 'Step 3: Sanjay replies - interested';
    UPDATE public.conversations 
    SET messages = messages || ARRAY[jsonb_build_object( -- Append to jsonb[]
            'id', uuid_generate_v4(),
            'provider_message_id', 'mock_gmail_sanjay_reply_1_' || substr(uuid_generate_v4()::text, 1, 4),
            'provider_thread_id', v_email_thread_id,
            'sender_type', 'creator',
            'sender_email', v_creator_email,
            'content_text', creator_msg_video_length, -- Using variable for creator message
            'received_at', to_char(v_ts_sanjay_reply1_received_at, 'YYYY-MM-DD HH24:MI:SS.MS')::TEXT,
            'created_at', to_char(NOW(), 'YYYY-MM-DD HH24:MI:SS.MS')::TEXT
        )]::jsonb[],
        stage = 'replied', last_message_at = v_ts_sanjay_reply1_received_at, updated_at = NOW()
    WHERE id = v_conversation_id;
    UPDATE public.outreach_emails SET status = 'replied', replied_at = v_ts_sanjay_reply1_received_at, updated_at = NOW() WHERE id = v_outreach_email_id;
    RAISE NOTICE 'Sanjay''s first reply added.';

    -- Step 4: AI replies - deliverables
    RAISE NOTICE 'Step 4: AI replies - deliverables';
    UPDATE public.conversations
    SET messages = messages || ARRAY[jsonb_build_object( -- Append to jsonb[]
            'id', uuid_generate_v4(),
            'provider_message_id', 'mock_gmail_ai_reply_1_' || substr(uuid_generate_v4()::text, 1, 4),
            'provider_thread_id', v_email_thread_id,
            'sender_type', 'system',
            'sender_email', v_user_email,
            'content_text', 'Here are the deliverables we are expecting in detail:\n1. A 15-minute dedicated YouTube review video.\n2. Three Instagram stories announcing the video.\n3. One Instagram post linking to the video.',
            'sent_at', to_char(v_ts_ai_reply1_sent_at, 'YYYY-MM-DD HH24:MI:SS.MS')::TEXT,
            'created_at', to_char(NOW(), 'YYYY-MM-DD HH24:MI:SS.MS')::TEXT
        )]::jsonb[],
        last_message_at = v_ts_ai_reply1_sent_at, updated_at = NOW()
    WHERE id = v_conversation_id;
    RAISE NOTICE 'AI detailed deliverables reply added.';

    -- Step 5: Sanjay replies - 10 min video request (this is the actual creator message for approval 1)
    RAISE NOTICE 'Step 5: Sanjay replies - 10 min video request';
    UPDATE public.conversations
    SET messages = messages || ARRAY[jsonb_build_object( -- Append to jsonb[]
            'id', uuid_generate_v4(),
            'provider_message_id', 'mock_gmail_sanjay_reply_2_' || substr(uuid_generate_v4()::text, 1, 4),
            'provider_thread_id', v_email_thread_id,
            'sender_type', 'creator',
            'sender_email', v_creator_email,
            'content_text', creator_msg_video_length, -- Actual creator message
            'received_at', to_char(v_ts_sanjay_reply2_received_at, 'YYYY-MM-DD HH24:MI:SS.MS')::TEXT,
            'created_at', to_char(NOW(), 'YYYY-MM-DD HH24:MI:SS.MS')::TEXT
        )]::jsonb[],
        last_message_at = v_ts_sanjay_reply2_received_at, updated_at = NOW()
    WHERE id = v_conversation_id;
    RAISE NOTICE 'Sanjay''s 10-min video request added.';

    -- Step 6: AI replies - hold & asks human
    RAISE NOTICE 'Step 6: AI replies - hold & asks human';
    UPDATE public.conversations
    SET messages = messages || ARRAY[jsonb_build_object( -- Append to jsonb[]
            'id', uuid_generate_v4(),
            'provider_message_id', 'mock_gmail_ai_reply_2_hold_' || substr(uuid_generate_v4()::text, 1, 4),
            'provider_thread_id', v_email_thread_id,
            'sender_type', 'system',
            'sender_email', v_user_email,
            'content_text', 'Thanks for letting us know, Sanjay. Let me check with my manager regarding the video length and I''''ll get back to you shortly.',
            'sent_at', to_char(v_ts_ai_reply2_hold_sent_at, 'YYYY-MM-DD HH24:MI:SS.MS')::TEXT,
            'created_at', to_char(NOW(), 'YYYY-MM-DD HH24:MI:SS.MS')::TEXT
        )]::jsonb[],
        needs_human_approval = true, -- Set flag as per schema
        last_message_at = v_ts_ai_reply2_hold_sent_at, updated_at = NOW()
    WHERE id = v_conversation_id;

    v_approval_1_id := uuid_generate_v4();
    INSERT INTO public.human_approvals
        (id, conversation_id, user_id, type, creator_message, ai_analysis, status, created_at, updated_at)
    VALUES
        (v_approval_1_id, v_conversation_id, mock_user_id, 'video_length_negotiation', 
         creator_msg_video_length, -- Actual creator message that needs review
         jsonb_build_object('original_video_length', '15 minutes', 'requested_video_length', '10 minutes', 'reason', 'audience retention falls after 10 min'), -- mapped from negotiation_points
         'pending', v_ts_approval1_created_at, NOW());
    RAISE NOTICE 'AI hold reply and human approval (1) created.';

    -- Step 7: Human decision on approval (1)
    RAISE NOTICE 'Step 7: Human decision on approval (1)';
    UPDATE public.human_approvals
    SET status = 'action_taken', notes = 'Approved 10 min video, countered with 2 Instagram posts.', reviewed_at = v_ts_approval1_resolved_at, updated_at = NOW()
    WHERE id = v_approval_1_id;
    UPDATE public.conversations SET needs_human_approval = false, human_notes = 'Approved 10 min video, countered with 2 Instagram posts.' WHERE id = v_conversation_id;
    RAISE NOTICE 'Human approval (1) updated.';

    -- Step 8: AI replies - counter offer
    RAISE NOTICE 'Step 8: AI replies - counter offer';
    UPDATE public.conversations
    SET messages = messages || ARRAY[jsonb_build_object( -- Append to jsonb[]
            'id', uuid_generate_v4(),
            'provider_message_id', 'mock_gmail_ai_reply_3_counter_' || substr(uuid_generate_v4()::text, 1, 4),
            'provider_thread_id', v_email_thread_id,
            'sender_type', 'system',
            'sender_email', v_user_email,
            'content_text', 'Hi Sanjay, good news! My manager has approved a 10-minute video. In addition to the 10-minute video, we''d also require two Instagram posts as part of the deliverables. Let me know if that works for you!',
            'sent_at', to_char(v_ts_ai_reply3_counter_sent_at, 'YYYY-MM-DD HH24:MI:SS.MS')::TEXT,
            'created_at', to_char(NOW(), 'YYYY-MM-DD HH24:MI:SS.MS')::TEXT
        )]::jsonb[],
        last_message_at = v_ts_ai_reply3_counter_sent_at, updated_at = NOW()
    WHERE id = v_conversation_id;
    RAISE NOTICE 'AI counter-offer reply added.';

    -- Step 9: Sanjay replies - accepts counter
    RAISE NOTICE 'Step 9: Sanjay replies - accepts counter';
    UPDATE public.conversations
    SET messages = messages || ARRAY[jsonb_build_object( -- Append to jsonb[]
            'id', uuid_generate_v4(),
            'provider_message_id', 'mock_gmail_sanjay_reply_3_accept_' || substr(uuid_generate_v4()::text, 1, 4),
            'provider_thread_id', v_email_thread_id,
            'sender_type', 'creator',
            'sender_email', v_creator_email,
            'content_text', 'Great, that sounds completely fine. I am ok with those deliverables.',
            'received_at', to_char(v_ts_sanjay_reply3_accept_received_at, 'YYYY-MM-DD HH24:MI:SS.MS')::TEXT,
            'created_at', to_char(NOW(), 'YYYY-MM-DD HH24:MI:SS.MS')::TEXT
        )]::jsonb[],
        stage = 'negotiation_agreed', last_message_at = v_ts_sanjay_reply3_accept_received_at, updated_at = NOW()
    WHERE id = v_conversation_id;
    RAISE NOTICE 'Sanjay accepts counter-offer.';

    -- Step 10: AI replies - contract drafting
    RAISE NOTICE 'Step 10: AI replies - contract drafting';
    UPDATE public.conversations
    SET messages = messages || ARRAY[jsonb_build_object( -- Append to jsonb[]
            'id', uuid_generate_v4(),
            'provider_message_id', 'mock_gmail_ai_reply_4_contract_prep_' || substr(uuid_generate_v4()::text, 1, 4),
            'provider_thread_id', v_email_thread_id,
            'sender_type', 'system',
            'sender_email', v_user_email,
            'content_text', 'Excellent! I''ll draft the contract with these terms and send it over to you shortly for review.',
            'sent_at', to_char(v_ts_ai_reply4_contract_prep_sent_at, 'YYYY-MM-DD HH24:MI:SS.MS')::TEXT,
            'created_at', to_char(NOW(), 'YYYY-MM-DD HH24:MI:SS.MS')::TEXT
        )]::jsonb[],
        last_message_at = v_ts_ai_reply4_contract_prep_sent_at, updated_at = NOW()
    WHERE id = v_conversation_id;

    INSERT INTO public.contracts
        (id, conversation_id, campaign_id, creator_id, created_by_user_id, final_terms, status, created_at, updated_at)
    VALUES
        (v_contract_id, v_conversation_id, mock_campaign_id, mock_creator_id, mock_user_id, -- mapped user_id to created_by_user_id
         jsonb_build_object('video_length', '10 minutes', 'instagram_posts', 2, 'compensation', 10000, 'currency', 'USD', 'product', 'Meta Ray-Ban Smart Glasses'),
         'drafting_by_ai', v_ts_contract_draft_created_at, NOW());
    RAISE NOTICE 'AI contract drafting message and contract record created.';

    -- Step 11: AI "sends" contract to human for approval
    RAISE NOTICE 'Step 11: AI "sends" contract to human for approval';
    UPDATE public.contracts
    SET contract_pdf_url = 'https://example.com/mock_contract_sanjay_v1.pdf', status = 'pending_user_approval', updated_at = NOW()
    WHERE id = v_contract_id;
    UPDATE public.conversations SET needs_human_approval = true WHERE id = v_conversation_id;

    v_approval_2_id := uuid_generate_v4();
    INSERT INTO public.human_approvals
        (id, conversation_id, user_id, type, creator_message, ai_analysis, status, created_at, updated_at)
    VALUES
        (v_approval_2_id, v_conversation_id, mock_user_id, 'contract_review_request', 
         creator_msg_contract_review, -- System message asking user to review
         jsonb_build_object('video_length', '10 minutes', 'instagram_posts', 2, 'compensation', 10000, 'currency', 'USD', 'product', 'Meta Ray-Ban Smart Glasses'), -- final_terms as ai_analysis
         'pending', v_ts_approval2_created_at, NOW());
    RAISE NOTICE 'Contract updated to pending human approval (2).';

    -- Step 12: Human approves contract for sending
    RAISE NOTICE 'Step 12: Human approves contract for sending';
    UPDATE public.human_approvals
    SET status = 'approved', notes = 'Contract approved by user for sending.', reviewed_at = v_ts_approval2_resolved_at, updated_at = NOW()
    WHERE id = v_approval_2_id;
    UPDATE public.conversations SET needs_human_approval = false, human_notes = 'Contract approved by user for sending.' WHERE id = v_conversation_id;

    UPDATE public.contracts
    SET status = 'sent_to_creator', sent_to_creator_at = v_ts_contract_sent_to_creator_at, user_signed_at = v_ts_contract_user_signed_at, updated_at = NOW()
    WHERE id = v_contract_id;

    UPDATE public.conversations
    SET messages = messages || ARRAY[jsonb_build_object( -- Append to jsonb[]
            'id', uuid_generate_v4(),
            'provider_message_id', 'mock_gmail_ai_reply_5_contract_sent_' || substr(uuid_generate_v4()::text, 1, 4),
            'provider_thread_id', v_email_thread_id,
            'sender_type', 'system',
            'sender_email', v_user_email,
            'content_text', 'Hi Sanjay, please find the contract attached based on our agreed terms. Let me know if you have any questions. Otherwise, please sign and return.',
            'attachments', jsonb_build_array(jsonb_build_object('fileName', 'Contract_SanjayMalladi_MetaRayBan.pdf', 'url', 'https://example.com/mock_contract_sanjay_v1.pdf')),
            'sent_at', to_char(v_ts_ai_reply5_contract_sent_at, 'YYYY-MM-DD HH24:MI:SS.MS')::TEXT,
            'created_at', to_char(NOW(), 'YYYY-MM-DD HH24:MI:SS.MS')::TEXT
        )]::jsonb[],
        last_message_at = v_ts_ai_reply5_contract_sent_at, updated_at = NOW()
    WHERE id = v_conversation_id;
    RAISE NOTICE 'Contract sent to Sanjay (simulated) & approval (2) updated.';

    -- Step 13: Sanjay returns signed contract
    RAISE NOTICE 'Step 13: Sanjay returns signed contract';
    UPDATE public.conversations
    SET messages = messages || ARRAY[jsonb_build_object( -- Append to jsonb[]
            'id', uuid_generate_v4(),
            'provider_message_id', 'mock_gmail_sanjay_reply_4_signed_' || substr(uuid_generate_v4()::text, 1, 4),
            'provider_thread_id', v_email_thread_id,
            'sender_type', 'creator',
            'sender_email', v_creator_email,
            'content_text', creator_msg_signed_contract, -- Actual creator message
            'attachments', jsonb_build_array(jsonb_build_object('fileName', 'Signed_Contract_SanjayMalladi.pdf', 'url', 'https://example.com/mock_signed_contract_sanjay.pdf')),
            'received_at', to_char(v_ts_sanjay_reply4_signed_received_at, 'YYYY-MM-DD HH24:MI:SS.MS')::TEXT,
            'created_at', to_char(NOW(), 'YYYY-MM-DD HH24:MI:SS.MS')::TEXT
        )]::jsonb[],
        stage = 'contract_signed', needs_human_approval = true, last_message_at = v_ts_sanjay_reply4_signed_received_at, updated_at = NOW()
    WHERE id = v_conversation_id;

    UPDATE public.contracts
    SET status = 'signed_by_creator', creator_signed_at = v_ts_contract_creator_signed_at, signed_contract_pdf_url = 'https://example.com/mock_signed_contract_sanjay.pdf', updated_at = NOW()
    WHERE id = v_contract_id;
    RAISE NOTICE 'Sanjay returns signed contract, records updated.';

    -- Step 14: AI asks human for final verification
    RAISE NOTICE 'Step 14: AI asks human for final verification';
    v_approval_3_id := uuid_generate_v4();
    INSERT INTO public.human_approvals
        (id, conversation_id, user_id, type, creator_message, status, created_at, updated_at)
    VALUES
        (v_approval_3_id, v_conversation_id, mock_user_id, 'signed_contract_verification', 
         creator_msg_signed_contract, -- Creator message about signed contract
         'pending', v_ts_approval3_created_at, NOW());
    RAISE NOTICE 'Human approval (3) for final verification created.';

    -- Step 15: Human verifies and completes negotiation
    RAISE NOTICE 'Step 15: Human verifies and completes negotiation';
    UPDATE public.human_approvals
    SET status = 'completed', notes = 'Signed contract verified by user.', resolved_at = v_ts_approval3_resolved_at, updated_at = NOW()
    WHERE id = v_approval_3_id;
    UPDATE public.conversations SET needs_human_approval = false, human_notes = 'Signed contract verified by user.', stage = 'contract_active' WHERE id = v_conversation_id;

    UPDATE public.contracts
    SET status = 'active', updated_at = NOW()
    WHERE id = v_contract_id;

    RAISE NOTICE 'Negotiation completed, contract active.';

    RAISE NOTICE '--- Mock Negotiation Seeding Script Finished Successfully ---';

EXCEPTION 
    WHEN OTHERS THEN
        RAISE NOTICE '--- Mock Negotiation Seeding Script FAILED ---';
        RAISE NOTICE 'SQLSTATE: %', SQLSTATE;
        RAISE NOTICE 'Error: %', SQLERRM;
END $$; 
const express = require('express');
const path = require('path');
const cors = require('cors');
const nodemailer = require('nodemailer');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Email transporter setup
let emailTransporter = null;

function setupEmailTransporter() {
    if (process.env.ZOHO_EMAIL && process.env.ZOHO_APP_PASSWORD) {
        emailTransporter = nodemailer.createTransport({
            host: 'smtp.zoho.com',
            port: 465,
            secure: true, // SSL
            auth: {
                user: process.env.ZOHO_EMAIL,
                pass: process.env.ZOHO_APP_PASSWORD
            }
        });
        console.log('✅ Email transporter configured');
    } else {
        console.log('⚠️ Email not configured - missing ZOHO credentials');
    }
}

// Google Gemini API function
// Google Gemini API function
async function callGoogleGeminiWithRetry(messages, systemPrompt = '', maxRetries = 3) {
    const API_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash-latest:generateContent?key=${process.env.GOOGLE_API_KEY}`;

    // Convert message format to the Gemini format
    const contents = messages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : msg.role,
        parts: [{ text: msg.content }]
    }));

    // NEW: For v1 API, the system prompt is part of the 'contents'
    if (systemPrompt) {
        contents.unshift(
            { role: 'user', parts: [{ text: systemPrompt }] },
            { role: 'model', parts: [{ text: 'Understood.' }] } // Acknowledge the instruction
        );
    }

    const requestData = {
        contents: contents,
        generationConfig: {
            maxOutputTokens: 1024,
        }
        // REMOVED: The invalid "systemInstruction" field
    };

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`🤖 Google Gemini API attempt ${attempt}/${maxRetries}...`);

            const response = await axios.post(API_URL, requestData, {
                headers: { 'Content-Type': 'application/json' },
                timeout: 60000 // 60 second timeout
            });

            // SAFE WAY: Check if candidates array exists and is not empty
            if (response.data && response.data.candidates && response.data.candidates.length > 0) {
                const responseMessage = response.data.candidates[0].content.parts[0].text;
                console.log('✅ Google Gemini API success! Response length:', responseMessage.length);
                return responseMessage;
            } else {
                // This handles cases where the API returns a response with no candidates (e.g., safety filters)
                throw new Error('API response received, but it contains no valid candidates.');
            }

        } catch (error) {
            if (error.response) {
                console.error(`❌ Google Gemini API attempt ${attempt} failed with status ${error.response.status}:`, error.response.data);
            } else {
                console.error(`❌ Google Gemini API attempt ${attempt} failed:`, error.message);
            }

            if (attempt === maxRetries) {
                console.log('❌ All Google Gemini API attempts failed');
                throw error;
            }
            await new Promise(resolve => setTimeout(resolve, attempt * 1500));
        }
    }
}


// Email sending function
async function sendLeadNotification(userEmail, conversationHistory) {
    if (!emailTransporter) {
        console.log('⚠️ Email transporter not available');
        return;
    }

    try {
        const conversationSummary = conversationHistory
            .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
            .join('\n\n');

        let projectSummary = '';
        try {
            // NEW: AI-powered summary generation
            console.log('🤖 Generating AI summary of user request...');
            const summaryPrompt = `Based on the following conversation, please summarize the user's core request into a concise, professional paragraph. Focus on their main goal and the key requirements they mentioned.

Conversation:
${conversationSummary}`;
            const summaryMessages = [{ role: 'user', content: summaryPrompt }];
            projectSummary = await callGoogleGeminiWithRetry(summaryMessages);
            console.log('✅ AI summary generated successfully');
        } catch (summaryError) {
            // Fallback to simple truncation if AI summary fails
            console.error('⚠️ Could not generate AI summary, falling back to simple summary.', summaryError.message);
            const userMessages = conversationHistory.filter(msg => msg.role === 'user');
            const allUserText = userMessages.map(msg => msg.content).join(' ');
            projectSummary = allUserText.length > 200 ? allUserText.substring(0, 200) + '...' : allUserText;
        }

        let aiProposal = '';
        try {
            const proposalPrompt = `Based on this conversation with a potential client, create a professional project proposal. Be specific about deliverables, timeline, and approach. Keep it concise but comprehensive.

Conversation:
${conversationSummary}

Create a proposal that includes:
1. Project Overview
2. Key Deliverables
3. Recommended Approach
4. Estimated Timeline
5. Next Steps

Make it professional but engaging. Address their specific needs mentioned in the conversation.`;

            const proposalMessages = [{ role: 'user', content: proposalPrompt }];
            aiProposal = await callGoogleGeminiWithRetry(proposalMessages);
            
            console.log('✅ AI proposal generated successfully');
            
        } catch (proposalError) {
            console.error('⚠️ Could not generate AI proposal:', proposalError.message);
            // Updated fallback uses the (potentially AI-generated) summary
            aiProposal = `Based on your inquiry about ${projectSummary}, we recommend a custom AI solution tailored to your specific needs. Our team will analyze your requirements and provide a detailed technical approach, implementation timeline, and cost estimate. We specialize in delivering scalable AI solutions that drive real business value.`;
        }

        // Email to company
        const companyMailOptions = {
            from: process.env.ZOHO_EMAIL,
            to: process.env.COMPANY_EMAIL || process.env.ZOHO_EMAIL,
            subject: '🔥 New AI Consultation Lead',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: white;">
                    <div style="text-align: center; padding: 20px; border-bottom: 2px solid #6366f1;">
                        <h2 style="color: #6366f1; margin: 10px 0;">New Lead from AI Chatbot</h2>
                    </div>
                    <div style="background: #f8fafc; padding: 20px; margin: 20px 0; border-left: 4px solid #6366f1;">
                        <h3 style="color: #1e293b; margin-top: 0;">Contact Information</h3>
                        <p><strong>Email:</strong> ${userEmail}</p>
                        <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
                    </div>
                    <div style="background: #fff7ed; padding: 20px; margin: 20px 0; border-left: 4px solid #f59e0b;">
                        <h3 style="color: #92400e; margin-top: 0;">What They Want (AI Summary)</h3>
                        <p style="color: #374151; font-size: 16px; line-height: 1.6;">${projectSummary}</p>
                    </div>
                    <div style="background: #f0f9ff; padding: 20px; margin: 20px 0; border-left: 4px solid #0ea5e9;">
                        <h3 style="color: #0c4a6e; margin-top: 0;">AI-Generated Proposal Draft</h3>
                        <div style="background: white; padding: 15px; border-radius: 5px; color: #374151; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${aiProposal}</div>
                    </div>
                    <div style="background: #f1f5f9; padding: 20px; margin: 20px 0;">
                        <h3 style="color: #1e293b; margin-top: 0;">Full Conversation</h3>
                        <div style="background: white; padding: 15px; border-radius: 5px; white-space: pre-wrap; font-size: 14px; line-height: 1.5; max-height: 300px; overflow-y: auto;">${conversationSummary}</div>
                    </div>
                    <div style="background: #ecfdf5; padding: 20px; margin: 20px 0; border-left: 4px solid #10b981;">
                        <h3 style="color: #065f46; margin-top: 0;">Action Required</h3>
                        <ul style="color: #065f46;">
                            <li>Review the AI-generated proposal above</li>
                            <li>Customize and refine based on your expertise</li>
                            <li>Follow up within 24-48 hours</li>
                            <li>Schedule a consultation call</li>
                        </ul>
                    </div>
                </div>
            `
        };

        // Email to user (confirmation)
        const userMailOptions = {
            from: process.env.ZOHO_EMAIL,
            to: userEmail,
            subject: 'Your AI Project Proposal - Nazarban Analytics',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: white;">
                    <div style="text-align: center; padding: 20px; border-bottom: 2px solid #6366f1;">
                        <h2 style="color: #6366f1; margin: 10px 0;">Your AI Project Proposal</h2>
                        <p style="color: #64748b; margin: 5px 0;">Nazarban Analytics-FZCO</p>
                    </div>
                    <div style="padding: 30px 20px;">
                        <p style="font-size: 16px; line-height: 1.6; color: #374151;">Dear Valued Client,</p>
                        <p style="font-size: 16px; line-height: 1.6; color: #374151;">Thank you for your interest in <strong>Nazarban Analytics-FZCO</strong> AI services! Based on our conversation, we've prepared an initial project proposal for your review.</p>
                        <div style="background: #f0f9ff; padding: 25px; margin: 25px 0; border-left: 4px solid #0ea5e9; border-radius: 8px;">
                            <h3 style="color: #0c4a6e; margin-top: 0; margin-bottom: 15px;">Project Proposal</h3>
                            <div style="background: white; padding: 20px; border-radius: 5px; color: #374151; font-size: 15px; line-height: 1.7; white-space: pre-wrap; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">${aiProposal}</div>
                        </div>
                        <div style="background: #f0fdf4; padding: 20px; margin: 20px 0; border-left: 4px solid #22c55e;">
                            <h3 style="color: #15803d; margin-top: 0;">What's Next?</h3>
                            <ul style="color: #15803d; line-height: 1.8;">
                                <li>Our team will refine this proposal based on your specific requirements</li>
                                <li>We'll prepare detailed technical specifications and cost estimates</li>
                                <li>You'll receive a follow-up call within <strong>24-48 hours</strong></li>
                                <li>We'll schedule a consultation to discuss implementation details</li>
                            </ul>
                        </div>
                        <p style="font-size: 16px; line-height: 1.6; color: #374151;">This proposal is our initial assessment based on our conversation. We'll work closely with you to refine and customize it to perfectly match your needs.</p>
                        <p style="font-size: 16px; line-height: 1.6; color: #374151;">If you have any questions or would like to discuss this proposal, feel free to reply to this email. We're excited to help bring your AI vision to life!</p>
                    </div>
                    <div style="background: #f8fafc; text-align: center; padding: 20px; border-top: 1px solid #e5e7eb;">
                        <p style="margin: 0; font-weight: 600; color: #1e293b;">Nazarban Analytics-FZCO</p>
                        <p style="margin: 5px 0; color: #64748b;">AI Solutions & Consulting</p>
                        <a href="mailto:${process.env.ZOHO_EMAIL}" style="color: #6366f1; text-decoration: none;">${process.env.ZOHO_EMAIL}</a>
                    </div>
                </div>
            `
        };

        // Send both emails
        await emailTransporter.sendMail(companyMailOptions);
        await emailTransporter.sendMail(userMailOptions);
        
        console.log(`📧 Lead notification sent for: ${userEmail}`);
        
    } catch (error) {
        console.error('❌ Email sending failed:', error);
    }
}

// Initialize email transporter on startup
setupEmailTransporter();

// Test endpoint
app.get('/api/test', (req, res) => {
    res.json({ status: 'Server is working!' });
});

// Main chat endpoint
app.post('/api/chat', async (req, res) => {
    try {
        const { message, conversationHistory = [], conversationStage = 'initial', userEmail } = req.body;
        
        if (!process.env.GOOGLE_API_KEY) {
            return res.status(500).json({ success: false, message: "Server configuration error: Missing Google API key." });
        }

        const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
        const emailMatch = message.match(emailRegex);
        
        if (emailMatch && !userEmail) {
            await sendLeadNotification(emailMatch[0], conversationHistory);
            return res.json({
                success: true,
                message: `Perfect! I've got your email: ${emailMatch[0]}. Thank you for your interest in Nazarban's AI services. Our team will review your requirements and get back to you within 24-48 hours with a personalized proposal. Have a great day!`,
                conversationStage: 'completion',
                userEmail: emailMatch[0],
                conversationComplete: true
            });
        }

        let responseMessage = '';
        try {
            let apiMessages = conversationHistory.length > 0 ? conversationHistory.slice(-8) : [];
            
            const systemPrompt = `You are an AI consultation assistant for Nazarban Analytics-FZCO.

**IMPORTANT: Your very first response to the user must be ONLY this sentence: "Ready to build? Tell me about your AI project or the business challenge you're facing."**

After the first message, your role is to:
1. Understand the user's specific AI needs and business challenges.
2. Ask relevant follow-up questions about their requirements.
3. Provide helpful, genuine insights about AI technologies like machine learning, NLP, and computer vision.
4. After understanding their needs well (usually after 3-4 exchanges), naturally ask for their email to continue the consultation.

Be professional, knowledgeable, and genuinely helpful. Keep responses conversational but informative (2-3 sentences).`;

            console.log('🤖 Calling Google Gemini API with', apiMessages.length, 'messages...');
            
            responseMessage = await callGoogleGeminiWithRetry(apiMessages, systemPrompt);

            if (conversationHistory.length >= 4 && !userEmail && conversationStage === 'initial') {
                if (!responseMessage.toLowerCase().includes('email')) {
                    responseMessage += "\n\nI'd love to have our AI specialists prepare a detailed proposal for you. Could you share your email address so we can send you a consultation summary and next steps?";
                }
            }

        } catch (apiError) {
            console.error('❌ Final Google Gemini API error:', apiError.message);
            responseMessage = "I apologize, but I'm encountering a technical issue and can't process your request right now. Please try again in a few moments.";
        }

        res.json({
            success: true,
            message: responseMessage,
            conversationStage: conversationStage,
            conversationComplete: false
        });

    } catch (error) {
        console.error('❌ Server Error:', error);
        res.status(500).json({ success: false, message: "An unexpected error occurred." });
    }
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 404 and Error handlers
app.use((req, res) => { res.status(404).json({ error: 'Route not found' }); });
app.use((error, req, res, next) => { 
    console.error('❌ Global Server Error:', error);
    res.status(500).json({ error: 'Internal server error' }); 
});

app.listen(PORT, () => {
    console.log(`\n🚀 Nazarban AI Chatbot Server Started on port ${PORT}`);
    console.log(`🔑 Google API Key: ${process.env.GOOGLE_API_KEY ? '✅ Found' : '❌ Missing'}`);
    console.log(`📧 Zoho Email: ${process.env.ZOHO_EMAIL && process.env.ZOHO_APP_PASSWORD ? '✅ Found' : '❌ Missing'}`);
});
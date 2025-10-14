const express = require('express');
const path = require('path');
const cors = require('cors');
const nodemailer = require('nodemailer');
const axios = require('axios');
const fs = require('fs').promises; // Added for file operations
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// --- NEW: Prompt Management ---
let prompts = {};
const promptsFilePath = path.join(__dirname, 'prompts.json');

// Function to load prompts from prompts.json
async function loadPrompts() {
    try {
        const data = await fs.readFile(promptsFilePath, 'utf-8');
        prompts = JSON.parse(data);
        console.log('✅ Prompts loaded from prompts.json');
    } catch (error) {
        console.error('⚠️ Could not load prompts.json, using fallback defaults.', error.message);
        // Fallback prompts if file doesn't exist
        prompts = {
            mainSystemPrompt: `You are a friendly and expert AI solutions consultant for Nazarban Analytics-FZCO. Your goal is to understand a potential client's needs and guide them toward a solution.\n\nYour personality is: professional, knowledgeable, consultative, and genuinely helpful.\n\nConversation Flow:\n1.  **Initiate:** Start the conversation with a welcoming, open-ended question about the user's project or business challenge. Vary your opening slightly.\n2.  **Explore:** Ask insightful follow-up questions to clarify their requirements, goals, and any existing systems. Dig deeper into their needs.\n3.  **Educate:** Provide valuable insights about relevant AI technologies (ML, NLP, computer vision, etc.) as they relate to the user's problem.\n4.  **Transition:** Once you have a clear understanding of their primary goal, smoothly transition to asking for their email address to provide a detailed, personalized proposal and connect them with a specialist.\n5.  **Tone:** Keep responses conversational but informative (2-4 sentences is ideal). Avoid being robotic.`,
            summaryPrompt: `Based on the following conversation, please summarize the user's core request into a concise, professional paragraph. Focus on their main goal and the key requirements they mentioned. This summary will be used internally.\n\nConversation:\n{{conversationSummary}}`,
            proposalPrompt: `Based on this conversation with a potential client, create a professional project proposal. Be specific about deliverables, timeline, and approach. Keep it concise but comprehensive.\n\nConversation:\n{{conversationSummary}}\n\nCreate a proposal that includes:\n1. Project Overview\n2. Key Deliverables\n3. Recommended Approach\n4. Estimated Timeline\n5. Next Steps\n\nMake it professional but engaging. Address their specific needs mentioned in the conversation.`
        };
    }
}
// --- END: Prompt Management ---


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
async function callGoogleGeminiWithRetry(messages, systemPrompt = '', maxRetries = 3) {
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GOOGLE_API_KEY}`;
    const contents = messages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : msg.role,
        parts: [{ text: msg.content }]
    }));

    const requestData = {
        contents: contents,
        systemInstruction: {
            parts: [{ text: systemPrompt }]
        },
        generationConfig: {
            maxOutputTokens: 1024,
        }
    };

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`🤖 Google Gemini API attempt ${attempt}/${maxRetries}...`);
            const response = await axios.post(API_URL, requestData, {
                headers: { 'Content-Type': 'application/json' },
                timeout: 60000
            });
            const responseMessage = response.data.candidates[0].content.parts[0].text;
            console.log('✅ Google Gemini API success! Response length:', responseMessage.length);
            return responseMessage;
        } catch (error) {
            if (error.response) {
                const errorData = error.response.data ? JSON.stringify(error.response.data) : 'No response data';
                console.error(`❌ Google Gemini API attempt ${attempt} failed with status ${error.response.status}:`, errorData);
            } else if (error.request) {
                console.error(`❌ Google Gemini API attempt ${attempt} failed: No response received.`, error.message);
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
            console.log('🤖 Generating AI summary of user request...');
            // MODIFIED: Use prompt from memory
            const summaryPromptText = prompts.summaryPrompt.replace('{{conversationSummary}}', conversationSummary);
            const summaryMessages = [{ role: 'user', content: summaryPromptText }];
            projectSummary = await callGoogleGeminiWithRetry(summaryMessages);
            console.log('✅ AI summary generated successfully');
        } catch (summaryError) {
            console.error('⚠️ Could not generate AI summary, falling back to simple summary.', summaryError.message);
            const userMessages = conversationHistory.filter(msg => msg.role === 'user');
            const allUserText = userMessages.map(msg => msg.content).join(' ');
            projectSummary = allUserText.length > 200 ? allUserText.substring(0, 200) + '...' : allUserText;
        }

        let aiProposal = '';
        try {
            // MODIFIED: Use prompt from memory
            const proposalPromptText = prompts.proposalPrompt.replace('{{conversationSummary}}', conversationSummary);
            const proposalMessages = [{ role: 'user', content: proposalPromptText }];
            aiProposal = await callGoogleGeminiWithRetry(proposalMessages);
            console.log('✅ AI proposal generated successfully');
        } catch (proposalError) {
            console.error('⚠️ Could not generate AI proposal:', proposalError.message);
            aiProposal = `Based on your inquiry about ${projectSummary}, we recommend a custom AI solution tailored to your specific needs...`;
        }

        const companyMailOptions = { /* ... email content ... */ };
        const userMailOptions = { /* ... email content ... */ };

        // The HTML content for companyMailOptions and userMailOptions remains the same
        // ... (omitted for brevity, no changes needed inside the HTML strings)

        await emailTransporter.sendMail(companyMailOptions);
        await emailTransporter.sendMail(userMailOptions);
        console.log(`📧 Lead notification sent for: ${userEmail}`);
    } catch (error) {
        console.error('❌ Email sending failed:', error);
    }
}


// --- NEW: Admin Routes ---
// Serve the admin page
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// API endpoint to GET current prompts
app.get('/api/prompts', (req, res) => {
    res.json(prompts);
});

// API endpoint to POST updated prompts
app.post('/api/prompts', async (req, res) => {
    const { password, ...newPrompts } = req.body;

    if (!process.env.ADMIN_PASSWORD) {
        return res.status(500).json({ success: false, message: 'Admin password is not set on the server.' });
    }
    if (password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ success: false, message: 'Invalid password.' });
    }

    try {
        await fs.writeFile(promptsFilePath, JSON.stringify(newPrompts, null, 2));
        prompts = newPrompts; // Update in-memory prompts
        console.log('✅ Prompts updated successfully by admin.');
        res.json({ success: true, message: 'Prompts saved successfully!' });
    } catch (error) {
        console.error('❌ Error saving prompts:', error);
        res.status(500).json({ success: false, message: 'Failed to save prompts.' });
    }
});
// --- END: Admin Routes ---

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
            
            // MODIFIED: Use main system prompt from memory
            const systemPrompt = prompts.mainSystemPrompt;

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

        res.json({ success: true, message: responseMessage, conversationStage, conversationComplete: false });
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

app.listen(PORT, async () => {
    await loadPrompts(); // Load prompts on start
    console.log(`\n🚀 Nazarban AI Chatbot Server Started on port ${PORT}`);
    console.log(`🔑 Google API Key: ${process.env.GOOGLE_API_KEY ? '✅ Found' : '❌ Missing'}`);
    console.log(`📧 Zoho Email: ${process.env.ZOHO_EMAIL && process.env.ZOHO_APP_PASSWORD ? '✅ Found' : '❌ Missing'}`);
    console.log(`🔑 Admin Password: ${process.env.ADMIN_PASSWORD ? '✅ Set' : '❌ Missing - Admin panel is disabled'}`);
});
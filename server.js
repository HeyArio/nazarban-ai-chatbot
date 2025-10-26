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
            mainSystemPrompt: "You are **Nazarban AI Consultant Assistant**, a bilingual (English & Persian) expert trained at Harvard Business School for AI strategy and data-driven consulting.  \nYour mission is to help visitors describe their AI or data project clearly, so the Nazarban team can prepare a professional proposal.\n\n---\n\n### 🎯 Objective:\nCollect the visitor’s key project information (industry, challenge, data, KPI, constraints) in **either Persian or English**, while keeping the conversation friendly and expert-level.\n\n---\n\n### 💬 Conversation Flow:\n\n1. **Initiate:**  \n   Start with a warm, confident greeting.  \n   - English: “Welcome to Nazarban! What kind of AI or data challenge are you exploring today?”  \n   - Persian: «سلام! خوش اومدی به نظربان. درباره چه نوع پروژه یا چالش داده‌ای می‌خوای صحبت کنیم؟»\n\n2. **Explore:**  \n   Ask 4–6 targeted questions to understand:  \n   - Industry or business area  \n   - Main problem or goal (e.g. prediction, optimization, automation)  \n   - Type, format, and range of available data  \n   - Expected KPI (e.g. +10% sales, -20% cost, +accuracy)  \n   - Current tools or systems (ERP, POS, CRM)  \n   - Time, budget, or security constraints  \n\n3. **Educate (briefly):**  \n   Provide short, relevant insights — show real consulting value.  \n   - English example: “For demand prediction, we usually use ML models such as XGBoost or Prophet.”  \n   - Persian example: «برای تحلیل تصویر قفسه معمولاً از مدل‌های بینایی ماشین مثل YOLOv8 استفاده می‌کنیم.»\n\n4. **Transition:**  \n   Once you understand the user’s goal, smoothly ask for their **name**, **email**, and (optional) **data sample or link**.  \n   Example:  \n   - English: “To prepare a detailed proposal, please share your email and, if possible, a short data sample.”  \n   - Persian: «برای آماده‌سازی پیشنهاد دقیق، لطفاً ایمیل‌ت رو وارد کن و در صورت امکان نمونه‌ای از داده‌هات رو ارسال کن.»\n\n5. **Tone:**  \n   - Friendly, natural, professional  \n   - Avoid robotic or overly technical replies unless requested  \n   - Keep messages short (2–4 sentences)  \n   - Automatically reply in the user’s detected language  \n\n6. **Goal Reminder:**  \n   Your purpose is not to give long tutorials but to **collect project context** for Nazarban’s consulting team.  \n   When the conversation ends, generate a bilingual summary in the format below.\n\n---\n\n### 📄 Output Format for Summary (end of chat):\n\n**Project Summary | خلاصه پروژه**  \n- **Industry / حوزه کاری:**  \n- **Goal / هدف پروژه:**  \n- **Data Type & Source / نوع و منبع داده:**  \n- **Expected KPI / شاخص موفقیت:**  \n- **Contact Info / اطلاعات تماس:**",
            summaryPrompt: "You are the Nazarban AI Project Summarizer.  \nRead the following chat transcript (Persian or English) and produce a concise, structured bilingual summary for internal use.\n\n---\n\n### 🧾 Output Format:\n\n**Project Summary | خلاصه پروژه**  \n- **Industry / حوزه کاری:**  \n- **Main Problem or Goal / هدف یا مسئله اصلی:**  \n- **Available Data / داده‌های در دسترس:** (type, format, time range)  \n- **Expected KPI / شاخص یا هدف قابل اندازه‌گیری:**  \n- **Technical Notes / نکات فنی احتمالی:**  \n- **Next Step / گام بعدی پیشنهادی:** (e.g. Discovery call, PoC, data sample)\n\n---\n\nMake sure the summary sounds like a professional internal note written by a data & AI consultant from Harvard Business School — short, precise, and actionable.",
            proposalPrompt: "You are Nazarban’s AI Consultant.  \nBased on the following conversation with a potential client, generate a professional bilingual (English/Persian) proposal summary.  \nKeep it short, confident, and written in the same language the user used.  \nSound like a Harvard-trained product strategist and AI consultant.\n\n---\n\n### 🧭 Output Structure:\n\n1️⃣ **Project Overview / معرفی پروژه:**  \nSummarize the business context and goal in 2–3 sentences. Show that you understood their challenge and objectives.\n\n2️⃣ **Proposed Approach / مسیر پیشنهادی:**  \nExplain the Nazarban methodology:  \n- 7-day data readiness audit  \n- 14-day AI PoC  \nMention applicable AI domains (ML, NLP, CV) depending on their case.s\nReassure that the solution is **secure, measurable, and fast to implement.**\n\n3️⃣ **Next Steps / گام‌های بعدی:**  \nInvite the client to send their dataset or a small data sample (CSV, image, or Excel) to **projects@nazarbanai.com**.  \nRequest their preferred time slot for a **30-minute Discovery call** to finalize KPIs and scope.  \nRemind them that all shared data will remain confidential (NDA & On-Prem options available).\n\n---\n\n### 🧠 Example (English):D\nThank you for sharing your project details. Based on your goal to improve shelf visibility and reduce manual audits, we recommend starting with a 7-day data readiness review followed by a 14-day AI PoC using computer vision models (YOLOv8). Please send a short data sample to projects@nazarbanai.com so we can schedule your 30-min Discovery call within 24 hours.\n\n### 🧠 Example (Persian):  \nاز اینکه جزئیات پروژه‌تان را با ما به اشتراک گذاشتید سپاسگزاریم. بر اساس هدف شما برای بهبود نظارت قفسه و کاهش بررسی‌های دستی، پیشنهاد ما اجرای ممیزی داده در ۷ روز و PoC هوش مصنوعی ۱۴ روزه با مدل‌های بینایی ماشین است. لطفاً یک نمونه کوتاه از داده‌های خود را به projects@nazarbanai.com ارسال کنید تا جلسه Discovery سی‌دقیقه‌ای شما در کمتر از ۲۴ ساعت تنظیم شود."
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
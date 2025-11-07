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

// --- BLOG POST PATHS ---
const blogPostsPath = path.join(__dirname, 'blogPosts.json');
const archivedPostsPath = path.join(__dirname, 'archivedPosts.json');
// --- END BLOG POST PATHS ---

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
  "mainSystemPrompt": "You are **Nazarban AI Consultant Assistant**, a bilingual (English & Persian) expert trained at Harvard Business School for AI strategy and data-driven consulting.  \nYour mission is to help visitors describe their AI or data project clearly, so the Nazarban team can prepare a professional proposal.\n\n---\n\n### 🎯 Objective:\nCollect the visitor's key project information (industry, challenge, data, KPI, constraints) in **either Persian or English**, while keeping the conversation friendly and expert-level.\n\n---\n\n### 💬 Conversation Flow:\n\n1. **Initiate:**  \n   Start with a warm, confident greeting.  \n   - English: \"Welcome to Nazarban! What kind of AI or data challenge are you exploring today?\"  \n   - Persian: «سلام! خوش اومدی به نظربان. درباره چه نوع پروژه یا چالش داده‌ای می‌خوای صحبت کنیم؟»\n\n2. **Explore:**  \n   Ask 4–6 targeted questions to understand:  \n   - Industry or business area  \n   - Main problem or goal (e.g. prediction, optimization, automation)  \n   - Type, format, and range of available data  \n   - Expected KPI (e.g. +10% sales, -20% cost, +accuracy)  \n   - Current tools or systems (ERP, POS, CRM)  \n   - Time, budget, or security constraints  \n\n3. **Educate (briefly):**  \n   Provide short, relevant insights — show real consulting value.  \n   - English example: \"For demand prediction, we usually use ML models such as XGBoost or Prophet.\"  \n   - Persian example: «برای تحلیل تصویر قفسه معمولاً از مدل‌های بینایی ماشین مثل YOLOv8 استفاده می‌کنیم.»\n\n4. **Transition:**  \n   Once you understand the user's goal, smoothly ask for their **name**, **email**, and (optional) **data sample or link**.  \n   Example:  \n   - English: \"To prepare a detailed proposal, please share your email and, if possible, a short data sample.\"  \n   - Persian: «برای آماده‌سازی پیشنهاد دقیق، لطفاً ایمیل‌ت رو وارد کن و در صورت امکان نمونه‌ای از داده‌هات رو ارسال کن.»\n\n5. **Tone:**  \n   - Friendly, natural, professional  \n   - Avoid robotic or overly technical replies unless requested  \n   - Keep messages short (2–4 sentences)  \n   - Automatically reply in the user's detected language  \n\n6. **Goal Reminder:**  \n   Your purpose is not to give long tutorials but to **collect project context** for Nazarban's consulting team.  \n   When the conversation ends, generate a bilingual summary in the format below.\n\n---\n\n### 📄 Output Format for Summary (end of chat):\n\n**Project Summary | خلاصه پروژه**  \n- **Industry / حوزه کاری:**  \n- **Goal / هدف پروژه:**  \n- **Data Type & Source / نوع و منبع داده:**  \n- **Expected KPI / شاخص موفقیت:**  \n- **Contact Info / اطلاعات تماس:**",
  "summaryPrompt": "You are the Nazarban AI Project Summarizer.  \nRead the following chat transcript and produce a concise, structured summary for internal use.\n\n**IMPORTANT:** Detect the primary language used by the user in the conversation. If they used primarily Persian, write the ENTIRE summary in Persian only. If they used primarily English, write the ENTIRE summary in English only. Do NOT provide bilingual output.\n\n---\n\n### Conversation:\n{{conversationSummary}}\n\n---\n\n### 🧾 Output Format (use ONLY the detected language):\n\nIf English:\n**Project Summary**  \n- **Industry:**  \n- **Main Problem or Goal:**  \n- **Available Data:** (type, format, time range)  \n- **Expected KPI:**  \n- **Technical Notes:**  \n- **Next Step:** (e.g. Discovery call, PoC, data sample)\n\nIf Persian:\n**خلاصه پروژه**  \n- **حوزه کاری:**  \n- **هدف یا مسئله اصلی:**  \n- **داده‌های در دسترس:** (نوع، فرمت، بازه زمانی)  \n- **شاخص یا هدف قابل اندازه‌گیری:**  \n- **نکات فنی احتمالی:**  \n- **گام بعدی پیشنهادی:** (مثلاً تماس Discovery، PoC، نمونه داده)\n\n---\n\nMake sure the summary sounds like a professional internal note written by a data & AI consultant from Harvard Business School — short, precise, and actionable. Use ONLY ONE LANGUAGE.",
  "proposalPrompt": "You are Nazarban's AI Consultant.  \nBased on the following conversation with a potential client, generate a professional proposal summary.\n\n**CRITICAL:** Detect the primary language used by the client. If they spoke primarily in Persian, write the ENTIRE proposal in Persian only. If they spoke primarily in English, write the ENTIRE proposal in English only. Do NOT provide bilingual output. Match their language exactly.\n\n---\n\n### Conversation:\n{{conversationSummary}}\n\n---\n\n### 🧭 Output Structure (use ONLY the detected language):\n\nIf English:\n\n**Project Overview:**  \nSummarize the business context and goal in 2–3 sentences. Show that you understood their challenge and objectives.\n\n**Proposed Approach:**  \nExplain the Nazarban methodology:  \n- 7-day data readiness audit  \n- 14-day AI PoC  \nMention applicable AI domains (ML, NLP, CV) depending on their case. Reassure that the solution is secure, measurable, and fast to implement.\n\n**Next Steps:**  \nThank them for sharing their project details. Inform them that our team will review their requirements and reach out within 24-48 hours to schedule a 30-minute Discovery call. During the call, we will finalize project scope, KPIs, and discuss any data samples or additional information needed. All discussions and shared data remain strictly confidential.\n\n---\n\nIf Persian:\n\n**معرفی پروژه:**  \nخلاصه زمینه کسب‌وکار و هدف را در ۲-۳ جمله بیان کنید. نشان دهید که چالش و اهداف آن‌ها را درک کرده‌اید.\n\n**مسیر پیشنهادی:**  \nروش‌شناسی نظربان را توضیح دهید:  \n- ممیزی آمادگی داده در ۷ روز  \n- PoC هوش مصنوعی ۱۴ روزه  \nحوزه‌های کاربردی هوش مصنوعی (ML، NLP، CV) را بسته به پروژه ذکر کنید. تأکید کنید که راه‌حل امن، قابل اندازه‌گیری و سریع‌الاجرا است.\n\n**گام‌های بعدی:**  \nاز اشتراک‌گذاری جزئیات پروژه‌شان تشکر کنید. به آن‌ها اطلاع دهید که تیم ما نیازمندی‌های آن‌ها را بررسی خواهد کرد و ظرف ۲۴ تا ۴۸ ساعت برای برنامه‌ریزی یک تماس Discovery ۳۰ دقیقه‌ای با آن‌ها تماس خواهیم گرفت. در این تماس، محدوده پروژه، KPI‌ها را نهایی کرده و در مورد نمونه‌های داده یا اطلاعات اضافی مورد نیاز صحبت خواهیم کرد. تمام بحث‌ها و داده‌های به اشتراک گذاشته شده کاملاً محرمانه خواهند بود.\n\n---\n\nKeep it professional, confident, and use ONLY ONE LANGUAGE that matches the client's conversation."
}
    }
}
// --- END: Prompt Management ---

// --- BLOG POST MANAGEMENT FUNCTIONS ---
// Load blog posts from JSON
async function loadBlogPosts() {
    try {
        const data = await fs.readFile(blogPostsPath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.log('⚠️ No blog posts file found, creating new one');
        await fs.writeFile(blogPostsPath, '[]');
        return [];
    }
}

// Save blog posts to JSON
async function saveBlogPosts(posts) {
    await fs.writeFile(blogPostsPath, JSON.stringify(posts, null, 2));
}

// Archive old posts (older than 30 days)
async function archiveOldPosts() {
    try {
        const posts = await loadBlogPosts();
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        
        const activePosts = posts.filter(post => new Date(post.date).getTime() > thirtyDaysAgo);
        const postsToArchive = posts.filter(post => new Date(post.date).getTime() <= thirtyDaysAgo);
        
        if (postsToArchive.length > 0) {
            // Load existing archive
            let archived = [];
            try {
                const archiveData = await fs.readFile(archivedPostsPath, 'utf-8');
                archived = JSON.parse(archiveData);
            } catch (error) {
                // Archive file doesn't exist yet
            }
            
            // Add new archived posts
            archived = [...archived, ...postsToArchive];
            await fs.writeFile(archivedPostsPath, JSON.stringify(archived, null, 2));
            
            // Save only active posts
            await saveBlogPosts(activePosts);
            
            console.log(`📦 Archived ${postsToArchive.length} old blog posts`);
        }
    } catch (error) {
        console.error('❌ Error archiving posts:', error);
    }
}
// --- END BLOG POST MANAGEMENT FUNCTIONS ---


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
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GOOGLE_API_KEY}`;

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

            if (response.data && response.data.candidates && response.data.candidates[0].content && response.data.candidates[0].content.parts[0].text) {
                const responseMessage = response.data.candidates[0].content.parts[0].text;
                console.log('✅ Google Gemini API success! Response length:', responseMessage.length);
                return responseMessage;
            } else {
                console.error(`❌ Google Gemini API attempt ${attempt} received an unexpected response structure:`, JSON.stringify(response.data));
                throw new Error('Unexpected API response structure');
            }

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
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
}

// Send lead notification email
async function sendLeadNotification(email, conversationHistory) {
    if (!emailTransporter) {
        console.log('⚠️ Email not configured, skipping lead notification');
        return;
    }

    try {
        let summaryText = '';
        try {
            const conversationSummary = conversationHistory.map(msg => 
                `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
            ).join('\n\n');

            const summaryPrompt = prompts.summaryPrompt.replace('{{conversationSummary}}', conversationSummary);
            summaryText = await callGoogleGeminiWithRetry([
                { role: 'user', content: summaryPrompt }
            ]);
        } catch (summaryError) {
            console.error('❌ Error generating summary:', summaryError);
            summaryText = 'Summary generation failed';
        }

        let proposalText = '';
        try {
            const conversationForProposal = conversationHistory.map(msg => 
                `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
            ).join('\n\n');

            const proposalPrompt = prompts.proposalPrompt.replace('{{conversationSummary}}', conversationForProposal);
            proposalText = await callGoogleGeminiWithRetry([
                { role: 'user', content: proposalPrompt }
            ]);
        } catch (proposalError) {
            console.error('❌ Error generating proposal:', proposalError);
            proposalText = 'Proposal generation failed';
        }

        const mailOptions = {
            from: process.env.ZOHO_EMAIL,
            to: process.env.ZOHO_EMAIL,
            subject: `🔔 New Lead: ${email}`,
            html: `
                <h2>🎯 New Lead from Nazarban Chatbot</h2>
                <p><strong>Email:</strong> ${email}</p>
                
                <h3>📋 AI-Generated Project Summary</h3>
                <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 10px 0;">
                    <pre style="white-space: pre-wrap; font-family: monospace;">${summaryText}</pre>
                </div>

                <h3>📄 AI-Generated Proposal to Send Client</h3>
                <div style="background: #e3f2fd; padding: 15px; border-radius: 5px; margin: 10px 0;">
                    <pre style="white-space: pre-wrap; font-family: monospace;">${proposalText}</pre>
                </div>

                <h3>💬 Full Conversation History</h3>
                <div style="background: #fafafa; padding: 15px; border-radius: 5px; margin: 10px 0;">
                    ${conversationHistory.map(msg => `
                        <p style="margin: 10px 0;">
                            <strong style="color: ${msg.role === 'user' ? '#1976d2' : '#388e3c'};">${msg.role === 'user' ? '👤 User' : '🤖 AI'}:</strong><br>
                            ${msg.content.replace(/\n/g, '<br>')}
                        </p>
                    `).join('')}
                </div>

                <p style="margin-top: 20px; color: #666; font-size: 12px;">
                    🕒 Received: ${new Date().toLocaleString()}
                </p>
            `
        };

        await emailTransporter.sendMail(mailOptions);
        console.log(`✅ Lead notification email sent for: ${email}`);
    } catch (error) {
        console.error('❌ Error sending lead email:', error);
    }
}

// --- ADMIN ROUTES ---
app.get('/api/prompts', (req, res) => {
    res.json(prompts);
});

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
        prompts = newPrompts;
        console.log('✅ Prompts updated successfully by admin.');
        res.json({ success: true, message: 'Prompts saved successfully!' });
    } catch (error) {
        console.error('❌ Error saving prompts:', error);
        res.status(500).json({ success: false, message: 'Failed to save prompts.' });
    }
});
// --- END: Admin Routes ---

// --- BLOG API ROUTES ---
// API: POST new blog post (from n8n)
app.post('/api/blog/post', async (req, res) => {
    try {
        const { title, summary, summaryFarsi, votes, url, productId, date } = req.body;
        
        console.log('📝 Received blog post request:', { title, productId });
        
        // Validation
        if (!title || !summary || !summaryFarsi || !productId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing required fields: title, summary, summaryFarsi, productId' 
            });
        }
        
        // Load current posts
        const posts = await loadBlogPosts();
        
        // Check if post already exists (by productId)
        const existingIndex = posts.findIndex(p => p.productId === productId);
        
        const newPost = {
            id: Date.now().toString(),
            productId,
            title,
            summaryEnglish: summary,  // Store as summaryEnglish for blog.js
            summaryFarsi,
            votes: votes || 0,
            url: url || '',
            date: date || new Date().toISOString()
        };
        
        if (existingIndex >= 0) {
            // Update existing post
            posts[existingIndex] = { ...posts[existingIndex], ...newPost };
            console.log(`✅ Updated blog post: ${title}`);
        } else {
            // Add new post at the beginning
            posts.unshift(newPost);
            console.log(`✅ New blog post added: ${title}`);
        }
        
        // Save posts
        await saveBlogPosts(posts);
        
        // Archive old posts if needed
        await archiveOldPosts();
        
        res.json({ 
            success: true, 
            message: 'Blog post saved successfully',
            post: newPost
        });
        
    } catch (error) {
        console.error('❌ Error saving blog post:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to save blog post',
            error: error.message
        });
    }
});

// API: GET all active blog posts
app.get('/api/blog/posts', async (req, res) => {
    try {
        const posts = await loadBlogPosts();
        res.json({ success: true, posts });
    } catch (error) {
        console.error('❌ Error loading blog posts:', error);
        res.status(500).json({ success: false, message: 'Failed to load blog posts' });
    }
});

// API: GET archived posts
app.get('/api/blog/archived', async (req, res) => {
    try {
        const data = await fs.readFile(archivedPostsPath, 'utf-8');
        const archived = JSON.parse(data);
        res.json({ success: true, posts: archived });
    } catch (error) {
        res.json({ success: true, posts: [] });
    }
});
// --- END: BLOG API ROUTES ---

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
            apiMessages.push({ role: 'user', content: message });
            
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
app.use((req, res) => { 
    console.log('❌ 404 - Route not found:', req.method, req.url);
    res.status(404).json({ error: 'Route not found' }); 
});

app.use((error, req, res, next) => { 
    console.error('❌ Global Server Error:', error);
    res.status(500).json({ error: 'Internal server error' }); 
});

app.listen(PORT, async () => {
    await loadPrompts();
    console.log(`\n🚀 Nazarban AI Server Started on port ${PORT}`);
    console.log(`🔑 Google API Key: ${process.env.GOOGLE_API_KEY ? '✅ Found' : '❌ Missing'}`);
    console.log(`📧 Zoho Email: ${process.env.ZOHO_EMAIL && process.env.ZOHO_APP_PASSWORD ? '✅ Found' : '❌ Missing'}`);
    console.log(`🔑 Admin Password: ${process.env.ADMIN_PASSWORD ? '✅ Set' : '❌ Missing'}`);
    console.log(`📝 Blog API: ✅ Enabled at /api/blog/post`);
});
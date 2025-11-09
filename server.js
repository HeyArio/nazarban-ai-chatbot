const express = require('express');
const path = require('path');
const cors = require('cors');
const nodemailer = require('nodemailer');
const axios = require('axios');
const fs = require('fs').promises; // Added for file operations
const cron = require('node-cron'); // NEW: For scheduling tasks
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

// Archive old posts (configurable via environment variable, defaults to 7 days)
async function archiveOldPosts() {
    try {
        const postsPath = path.join(__dirname, 'blogposts.json');
        const archivePath = path.join(__dirname, 'archive.json');
        
        // Read current posts
        const postsData = await fs.readFile(postsPath, 'utf8');
        const posts = JSON.parse(postsData);
        
        // Calculate cutoff date
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - (parseInt(process.env.ARCHIVE_AFTER_DAYS) || 7));
        
        console.log('🔍 DEBUG INFO:');
        console.log('📊 Total posts:', posts.length);
        console.log('📅 Cutoff date:', cutoffDate.toISOString());
        console.log('');
        
        // Check each post
        posts.forEach((post, index) => {
            const postDate = new Date(post.date);
            const isOld = postDate < cutoffDate;
            console.log(`Post ${index + 1}:`);
            console.log(`  Title: ${post.title}`);
            console.log(`  Date: ${post.date}`);
            console.log(`  Parsed: ${postDate.toISOString()}`);
            console.log(`  Is Old? ${isOld ? '✅ YES' : '❌ NO'}`);
            console.log('');
        });
        
        // Filter posts
        const postsToArchive = posts.filter(post => {
            const postDate = new Date(post.date);
            return postDate < cutoffDate;
        });
        
        const remainingPosts = posts.filter(post => {
            const postDate = new Date(post.date);
            return postDate >= cutoffDate;
        });
        
        console.log(`📦 Posts to archive: ${postsToArchive.length}`);
        console.log(`📝 Posts to keep: ${remainingPosts.length}`);
        
        if (postsToArchive.length === 0) {
            console.log('✅ No posts to archive');
            return 0;
        }
        
        // Read existing archive
        let archive = [];
        try {
            const archiveData = await fs.readFile(archivePath, 'utf8');
            archive = JSON.parse(archiveData);
        } catch (error) {
            console.log('📂 Creating new archive file');
        }
        
        // Add archived date
        const archivedPosts = postsToArchive.map(post => ({
            ...post,
            archivedAt: new Date().toISOString()
        }));
        
        // Update files
        archive.push(...archivedPosts);
        await fs.writeFile(archivePath, JSON.stringify(archive, null, 2));
        await fs.writeFile(postsPath, JSON.stringify(remainingPosts, null, 2));
        
        console.log(`✅ Successfully archived ${postsToArchive.length} posts`);
        return postsToArchive.length;
        
    } catch (error) {
        console.error('❌ Error archiving posts:', error);
        return 0;
    }
}
// --- END BLOG POST MANAGEMENT FUNCTIONS ---

// --- AUTOMATIC WEEKLY ARCHIVING ---
// Schedule archiving to run every Monday at 2:00 AM
// Cron format: '0 2 * * 1' = At 02:00 on Monday
// You can change the time by modifying the cron pattern:
// '0 2 * * 1' = 2:00 AM every Monday
// '0 0 * * 1' = Midnight every Monday
// '0 6 * * 1' = 6:00 AM every Monday
cron.schedule('12 18 */3 * *', async () => {
    console.log('🕐 Running scheduled weekly archive task...');
    const archivedCount = await archiveOldPosts();
    if (archivedCount > 0) {
        console.log(`✅ Weekly archive complete: ${archivedCount} posts archived`);
    } else {
        console.log('✅ Weekly archive check complete: No posts needed archiving');
    }
}, {
    timezone: "Asia/Tehran" // Change this to your timezone if needed
});

console.log('📅 Automatic weekly archiving scheduled for every Monday at 2:00 AM (Tehran time)');
// --- END AUTOMATIC WEEKLY ARCHIVING ---

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
            const response = await axios.post(API_URL, requestData, {
                headers: { 'Content-Type': 'application/json' },
                timeout: 30000
            });

            if (response.data.candidates?.[0]?.content?.parts?.[0]?.text) {
                const replyText = response.data.candidates[0].content.parts[0].text;
                return replyText;
            } else {
                throw new Error('Unexpected API response structure');
            }
        } catch (error) {
            console.error(`⚠️ Google Gemini API attempt ${attempt} failed:`, error.message);
            
            if (attempt === maxRetries) {
                throw new Error(`All ${maxRetries} API attempts failed.`);
            }
            
            const backoffTime = 1000 * Math.pow(2, attempt - 1);
            console.log(`⏳ Waiting ${backoffTime}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, backoffTime));
        }
    }
}

// Function to send email notification
async function sendLeadNotification(userEmail, conversationHistory) {
    if (!emailTransporter) {
        console.log('⚠️ Email not configured, skipping notification');
        return;
    }

    try {
        const conversationSummary = conversationHistory.slice(-8)
            .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
            .join('\n\n');

        const mailOptions = {
            from: process.env.ZOHO_EMAIL,
            to: process.env.ZOHO_EMAIL,
            subject: `🎯 New Lead from Nazarban Website: ${userEmail}`,
            html: `
                <h2>New Lead Captured!</h2>
                <p><strong>Email:</strong> ${userEmail}</p>
                <h3>Conversation History:</h3>
                <pre style="background-color: #f4f4f4; padding: 15px; border-radius: 5px; white-space: pre-wrap;">${conversationSummary}</pre>
                <hr>
                <p style="color: #666; font-size: 0.9em;">Generated by Nazarban AI Assistant</p>
            `
        };

        await emailTransporter.sendMail(mailOptions);
        console.log('✅ Lead notification email sent successfully');
    } catch (error) {
        console.error('❌ Failed to send lead notification:', error);
    }
}

// --- BLOG API ROUTES ---
// API: POST a new blog post (for n8n or manual use)
app.post('/api/blog/post', async (req, res) => {
    try {
        const { title, summaryEnglish, summaryFarsi, date, url, votes, password } = req.body;
        
        // Simple password protection for the blog API
        if (password !== process.env.ADMIN_PASSWORD) {
            return res.status(401).json({ 
                success: false, 
                message: 'Unauthorized: Invalid password' 
            });
        }
        
        // Validate required fields
        if (!title || !summaryEnglish || !summaryFarsi || !date) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing required fields: title, summaryEnglish, summaryFarsi, date' 
            });
        }
        
        const posts = await loadBlogPosts();
        
        // Create new post object
        const newPost = {
            id: Date.now().toString(),
            title,
            summaryEnglish,
            summaryFarsi,
            date,
            url: url || '',
            votes: votes || 0,
            createdAt: new Date().toISOString()
        };
        
        // Add to beginning of posts array (newest first)
        posts.unshift(newPost);
        
        // Check if we need to remove duplicates based on title
        const uniquePosts = [];
        const seenTitles = new Set();
        for (const post of posts) {
            if (!seenTitles.has(post.title)) {
                seenTitles.add(post.title);
                uniquePosts.push(post);
            }
        }
        
        // Save posts
        await saveBlogPosts(uniquePosts);
        
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

// API: Manually trigger archiving (optional - for testing or manual use)
app.post('/api/blog/archive', async (req, res) => {
    try {
        const { password } = req.body;
        
        // Simple password protection
        if (password !== process.env.ADMIN_PASSWORD) {
            return res.status(401).json({ 
                success: false, 
                message: 'Unauthorized: Invalid password' 
            });
        }
        
        const archivedCount = await archiveOldPosts();
        
        res.json({ 
            success: true, 
            message: `Archiving complete: ${archivedCount} posts archived`,
            archivedCount
        });
        
    } catch (error) {
        console.error('❌ Error in manual archive:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to archive posts',
            error: error.message
        });
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
    console.log('📅 Automatic archiving scheduled every 3 days at 22:25 (Tehran time)');
});

// 🧪 TEMPORARY TEST CODE - Remove after testing
console.log('⏰ Archive test will run in 5 seconds...');
setTimeout(async () => {
    console.log('');
    console.log('🧪 ========== TESTING ARCHIVE FUNCTION ==========');
    console.log('📅 Current date:', new Date().toISOString());
    console.log(`📊 Archive threshold: Posts older than ${process.env.ARCHIVE_AFTER_DAYS || 7} days`);
    console.log('');
    
    try {
        const archivedCount = await archiveOldPosts();
        console.log('');
        console.log('✅ ========== TEST COMPLETE ==========');
        console.log(`📦 Posts archived: ${archivedCount}`);
        console.log('');
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}, 5000);
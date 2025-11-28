const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet'); // Security headers
const nodemailer = require('nodemailer');
const axios = require('axios');
const fs = require('fs').promises; // Added for file operations
const fsSync = require('fs'); // For sync operations
const cron = require('node-cron'); // NEW: For scheduling tasks
const multer = require('multer'); // For file uploads
const rateLimit = require('express-rate-limit'); // For rate limiting
const jwt = require('jsonwebtoken'); // For JWT authentication
const cookieParser = require('cookie-parser'); // For parsing cookies
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// JWT Secret (must be set in .env for production)
const JWT_SECRET = process.env.JWT_SECRET

// --- SECURITY MIDDLEWARE ---
// Helmet: Security headers (XSS, clickjacking, etc.)
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://www.googletagmanager.com", "https://www.google-analytics.com", "https://cdn.jsdelivr.net"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:", "http:"],
            connectSrc: ["'self'", "https://www.google-analytics.com"],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"]
        }
    },
    hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true
    }
}));

// CORS: Only allow your domain
const allowedOrigins = [
    'https://nazarbanai.com',
    'https://www.nazarbanai.com',
    'http://localhost:3000', // For local development
    'http://127.0.0.1:3000'
];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.log('❌ CORS blocked origin:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true, // Allow cookies
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-session-id']
}));

// Body parser with size limits
app.use(express.json({ limit: '1mb' })); // Reduced from 10mb
app.use(cookieParser()); // Parse cookies for JWT
app.use(express.static(path.join(__dirname, 'public')));

// --- RATE LIMITING CONFIGURATION ---
// General API rate limiter - 100 requests per 15 minutes
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: { success: false, message: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Strict chat rate limiter - 10 messages per minute
const chatLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 10,
    message: { success: false, message: 'Please slow down. You can send 10 messages per minute.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Login rate limiter - 5 attempts per 15 minutes
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: { success: false, message: 'Too many login attempts. Please try again in 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Apply general rate limiter to all API routes
app.use('/api/', apiLimiter);
// --- END RATE LIMITING CONFIGURATION ---

// --- USAGE TRACKING & COST PROTECTION ---
let usageStats = {
    date: new Date().toDateString(),
    chatMessages: 0,
    apiCalls: 0,
    blockedIPs: new Set(),
    topIPs: new Map() // IP -> count
};

// Session tracking for hourly limits
const sessionLimits = new Map(); // sessionId -> { messages: count, resetTime: timestamp }

const MAX_DAILY_CHAT_MESSAGES = 1000;
const MAX_HOURLY_MESSAGES_PER_SESSION = 50;
const MAX_MESSAGE_LENGTH = 500;

// Reset usage stats daily
function resetDailyStats() {
    const today = new Date().toDateString();
    if (today !== usageStats.date) {
        console.log(`📊 Daily stats reset. Yesterday: ${usageStats.chatMessages} messages, ${usageStats.apiCalls} API calls`);
        usageStats = {
            date: today,
            chatMessages: 0,
            apiCalls: 0,
            blockedIPs: new Set(),
            topIPs: new Map()
        };
    }
}

// Check if daily limit reached
function checkDailyLimit() {
    resetDailyStats();
    return usageStats.chatMessages < MAX_DAILY_CHAT_MESSAGES;
}

// Track session message count
function checkSessionLimit(sessionId) {
    const now = Date.now();
    const sessionData = sessionLimits.get(sessionId) || {
        messages: 0,
        resetTime: now + 3600000 // 1 hour from now
    };

    // Reset if time expired
    if (now > sessionData.resetTime) {
        sessionData.messages = 0;
        sessionData.resetTime = now + 3600000;
    }

    // Check limit
    if (sessionData.messages >= MAX_HOURLY_MESSAGES_PER_SESSION) {
        return false;
    }

    sessionData.messages++;
    sessionLimits.set(sessionId, sessionData);
    return true;
}

// Track IP usage
function trackIPUsage(ip) {
    const count = (usageStats.topIPs.get(ip) || 0) + 1;
    usageStats.topIPs.set(ip, count);
}
// --- END USAGE TRACKING & COST PROTECTION ---

// --- JWT AUTHENTICATION MIDDLEWARE ---
// Middleware to verify JWT token from cookie
function requireAdmin(req, res, next) {
    const token = req.cookies.adminToken;

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required. Please log in.'
        });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.admin = decoded; // Add admin data to request
        next();
    } catch (err) {
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired token. Please log in again.'
        });
    }
}
// --- END JWT AUTHENTICATION MIDDLEWARE ---

// --- IMAGE UPLOAD CONFIGURATION ---
const uploadDir = path.join(__dirname, 'public', 'uploads', 'products');

// Ensure upload directory exists
if (!fsSync.existsSync(uploadDir)) {
    fsSync.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Generate unique filename with timestamp
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'product-' + uniqueSuffix + ext);
    }
});

// File filter - only allow images
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.'), false);
    }
};

// Multer upload instance
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});
// --- END IMAGE UPLOAD CONFIGURATION ---

// --- BLOG POST PATHS ---
const blogPostsPath = path.join(__dirname, 'blogPosts.json');
const archivedPostsPath = path.join(__dirname, 'archivedPosts.json');
// --- END BLOG POST PATHS ---

// --- BENCHMARK DATA PATHS ---
const benchmarkDataPath = path.join(__dirname, 'benchmarkData.json');
// --- END BENCHMARK DATA PATHS ---

// --- NEW: CRYPTO DATA PATH ---
const cryptoDataPath = path.join(__dirname, 'cryptoData.json');
// --- END: CRYPTO DATA PATH ---

// --- PRODUCTS DATA PATH ---
const productsDataPath = path.join(__dirname, 'productsData.json');
// --- END: PRODUCTS DATA PATH ---

// --- FAQS DATA PATH ---
const faqsDataPath = path.join(__dirname, 'faqsData.json');
// --- END: FAQS DATA PATH ---

// --- ABOUT VIDEO DATA PATH ---
const aboutVideoPath = path.join(__dirname, 'aboutVideo.json');
// --- END: ABOUT VIDEO DATA PATH ---

// --- SERVICES VIDEOS DATA PATH ---
const servicesVideosPath = path.join(__dirname, 'servicesVideos.json');
// --- END: SERVICES VIDEOS DATA PATH ---

// --- PAGE CONTENT DATA PATHS ---
const servicesContentPath = path.join(__dirname, 'servicesContent.json');
const aboutContentPath = path.join(__dirname, 'aboutContent.json');
const whitepaperContentPath = path.join(__dirname, 'whitepaperContent.json');
// --- END: PAGE CONTENT DATA PATHS ---

// --- CUSTOM ARTICLES DATA PATH ---
const customArticlesPath = path.join(__dirname, 'public', 'data', 'custom-articles.json');
// --- END: CUSTOM ARTICLES DATA PATH ---

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
  "mainSystemPrompt": "You are **Nazarban AI Consultant Assistant**, a bilingual (English & Persian) expert trained at Harvard Business School for AI strategy and data-driven consulting.  \nYour mission is to help visitors describe their AI or data project clearly, so the Nazarban team can prepare a professional proposal.\n\n---\n\n### 🎯 Objective:\nCollect the visitor's key project information (industry, challenge, data, KPI, constraints) in **either Persian or English**, while keeping the conversation friendly and expert-level.\n\n---\n\n### 💬 Conversation Flow:\n\n1. **Initiate:** \n   Start with a warm, confident greeting.  \n   - English: \"Welcome to Nazarban! What kind of AI or data challenge are you exploring today?\"  \n   - Persian: «سلام! خوش اومدی به نظربان. درباره چه نوع پروژه یا چالش داده‌ای می‌خوای صحبت کنیم؟»\n\n2. **Explore:** \n   Ask 4–6 targeted questions to understand:  \n   - Industry or business area  \n   - Main problem or goal (e.g. prediction, optimization, automation)  \n   - Type, format, and range of available data  \n   - Expected KPI (e.g. +10% sales, -20% cost, +accuracy)  \n   - Current tools or systems (ERP, POS, CRM)  \n   - Time, budget, or security constraints  \n\n3. **Educate (briefly):** \n   Provide short, relevant insights — show real consulting value.  \n   - English example: \"For demand prediction, we usually use ML models such as XGBoost or Prophet.\"  \n   - Persian example: «برای تحلیل تصویر قفسه معمولاً از مدل‌های بینایی ماشین مثل YOLOv8 استفاده می‌کنیم.»\n\n4. **Transition:** \n   Once you understand the user's goal, smoothly ask for their **name**, **email**, and (optional) **data sample or link**.  \n   Example:  \n   - English: \"To prepare a detailed proposal, please share your email and, if possible, a short data sample.\"  \n   - Persian: «برای آماده‌سازی پیشنهاد دقیق، لطفاً ایمیل‌ت رو وارد کن و در صورت امکان نمونه‌ای از داده‌هات رو ارسال کن.»\n\n5. **Tone:** \n   - Friendly, natural, professional  \n   - Avoid robotic or overly technical replies unless requested  \n   - Keep messages short (2–4 sentences)  \n   - Automatically reply in the user's detected language  \n\n6. **Goal Reminder:** \n   Your purpose is not to give long tutorials but to **collect project context** for Nazarban's consulting team.  \n   When the conversation ends, generate a bilingual summary in the format below.\n\n---\n\n### 📄 Output Format for Summary (end of chat):\n\n**Project Summary | خلاصه پروژه** \n- **Industry / حوزه کاری:** \n- **Goal / هدف پروژه:** \n- **Data Type & Source / نوع و منبع داده:** \n- **Expected KPI / شاخص موفقیت:** \n- **Contact Info / اطلاعات تماس:**",
  "summaryPrompt": "You are the Nazarban AI Project Summarizer.  \nRead the following chat transcript and produce a concise, structured summary for internal use.\n\n**IMPORTANT:** Detect the primary language used by the user in the conversation. If they used primarily Persian, write the ENTIRE summary in Persian only. If they used primarily English, write the ENTIRE summary in English only. Do NOT provide bilingual output.\n\n---\n\n### Conversation:\n{{conversationSummary}}\n\n---\n\n### 🧾 Output Format (use ONLY the detected language):\n\nIf English:\n**Project Summary** \n- **Industry:** \n- **Main Problem or Goal:** \n- **Available Data:** (type, format, time range)  \n- **Expected KPI:** \n- **Technical Notes:** \n- **Next Step:** (e.g. Discovery call, PoC, data sample)\n\nIf Persian:\n**خلاصه پروژه** \n- **حوزه کاری:** \n- **هدف یا مسئله اصلی:** \n- **داده‌های در دسترس:** (نوع، فرمت، بازه زمانی)  \n- **شاخص یا هدف قابل اندازه‌گیری:** \n- **نکات فنی احتمالی:** \n- **گام بعدی پیشنهادی:** (مثلاً تماس Discovery، PoC، نمونه داده)\n\n---\n\nMake sure the summary sounds like a professional internal note written by a data & AI consultant from Harvard Business School — short, precise, and actionable. Use ONLY ONE LANGUAGE.",
  "proposalPrompt": "You are Nazarban's AI Consultant.  \nBased on the following conversation with a potential client, generate a professional proposal summary.\n\n**CRITICAL:** Detect the primary language used by the client. If they spoke primarily in Persian, write the ENTIRE proposal in Persian only. If they spoke primarily in English, write the ENTIRE proposal in English only. Do NOT provide bilingual output. Match their language exactly.\n\n---\n\n### Conversation:\n{{conversationSummary}}\n\n---\n\n### 🧭 Output Structure (use ONLY the detected language):\n\nIf English:\n\n**Project Overview:** \nSummarize the business context and goal in 2–3 sentences. Show that you understood their challenge and objectives.\n\n**Proposed Approach:** \nExplain the Nazarban methodology:  \n- 7-day data readiness audit  \n- 14-day AI PoC  \nMention applicable AI domains (ML, NLP, CV) depending on their case. Reassure that the solution is secure, measurable, and fast to implement.\n\n**Next Steps:** \nThank them for sharing their project details. Inform them that our team will review their requirements and reach out within 24-48 hours to schedule a 30-minute Discovery call. During the call, we will finalize project scope, KPIs, and discuss any data samples or additional information needed. All discussions and shared data remain strictly confidential.\n\n---\n\nIf Persian:\n\n**معرفی پروژه:** \nخلاصه زمینه کسب‌وکار و هدف را در ۲-۳ جمله بیان کنید. نشان دهید که چالش و اهداف آن‌ها را درک کرده‌اید.\n\n**مسیر پیشنهادی:** \nروش‌شناسی نظربان را توضیح دهید:  \n- ممیزی آمادگی داده در ۷ روز  \n- PoC هوش مصنوعی ۱۴ روزه  \nحوزه‌های کاربردی هوش مصنوعی (ML، NLP، CV) را بسته به پروژه ذکر کنید. تأکید کنید که راه‌حل امن، قابل اندازه‌گیری و سریع‌الاجرا است.\n\n**گام‌های بعدی:** \nاز اشتراک‌گذاری جزئیات پروژه‌شان تشکر کنید. به آن‌ها اطلاع دهید که تیم ما نیازمندی‌های آن‌ها را بررسی خواهد کرد و ظرف ۲۴ تا ۴۸ ساعت برای برنامه‌ریزی یک تماس Discovery ۳۰ دقیقه‌ای با آن‌ها تماس خواهیم گرفت. در این تماس، محدوده پروژه، KPI‌ها را نهایی کرده و در مورد نمونه‌های داده یا اطلاعات اضافی مورد نیاز صحبت خواهیم کرد. تمام بحث‌ها و داده‌های به اشتراک گذاشته شده کاملاً محرمانه خواهند بود.\n\n---\n\nKeep it professional, confident, and use ONLY ONE LANGUAGE that matches the client's conversation."
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
        const archiveAfterDays = process.env.ARCHIVE_AFTER_DAYS || 7; // Changed default to 7 days
        const posts = await loadBlogPosts();
        const cutoffDate = Date.now() - (archiveAfterDays * 24 * 60 * 60 * 1000);
        
        const activePosts = posts.filter(post => new Date(post.date).getTime() > cutoffDate);
        const postsToArchive = posts.filter(post => new Date(post.date).getTime() <= cutoffDate);
        
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
            
            console.log(`📦 Archived ${postsToArchive.length} old blog posts (older than ${archiveAfterDays} days)`);
            return postsToArchive.length;
        } else {
            console.log('✅ No posts to archive');
            return 0;
        }
    } catch (error) {
        console.error('❌ Error archiving posts:', error);
        return 0;
    }
}
// --- END BLOG POST MANAGEMENT FUNCTIONS ---

// --- BENCHMARK DATA MANAGEMENT FUNCTIONS ---
// Load benchmark data from JSON
async function loadBenchmarkData() {
    try {
        const data = await fs.readFile(benchmarkDataPath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.log('⚠️ No benchmark data file found');
        return null;
    }
}

// Save benchmark data to JSON
async function saveBenchmarkData(data) {
    await fs.writeFile(benchmarkDataPath, JSON.stringify(data, null, 2));
    console.log('✅ Benchmark data saved successfully');
}
// --- END BENCHMARK DATA MANAGEMENT FUNCTIONS ---

// --- NEW: CRYPTO DATA MANAGEMENT FUNCTIONS ---
// Load crypto data from JSON
async function loadCryptoData() {
    try {
        const data = await fs.readFile(cryptoDataPath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.log('⚠️ No crypto data file found, creating new one');
        await fs.writeFile(cryptoDataPath, '[]'); // Create an empty file
        return []; // Return empty array on error/new file
    }
}

// Save crypto data to JSON
async function saveCryptoData(data) {
    await fs.writeFile(cryptoDataPath, JSON.stringify(data, null, 2));
    console.log('✅ Crypto data saved successfully');
}
// --- END: CRYPTO DATA MANAGEMENT FUNCTIONS ---

// --- PRODUCTS DATA MANAGEMENT FUNCTIONS ---
// Load products from JSON
async function loadProducts() {
    try {
        const data = await fs.readFile(productsDataPath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.log('⚠️ No products file found, creating new one');
        await fs.writeFile(productsDataPath, '[]');
        return [];
    }
}

// Save products to JSON
async function saveProducts(products) {
    await fs.writeFile(productsDataPath, JSON.stringify(products, null, 2));
    console.log('✅ Products saved successfully');
}
// --- END: PRODUCTS DATA MANAGEMENT FUNCTIONS ---

// --- FAQS DATA MANAGEMENT FUNCTIONS ---
// Load FAQs from JSON
async function loadFaqs() {
    try {
        const data = await fs.readFile(faqsDataPath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.log('⚠️ No FAQs file found, creating new one');
        await fs.writeFile(faqsDataPath, '[]');
        return [];
    }
}

// Save FAQs to JSON
async function saveFaqs(faqs) {
    await fs.writeFile(faqsDataPath, JSON.stringify(faqs, null, 2));
    console.log('✅ FAQs saved successfully');
}
// --- END: FAQS DATA MANAGEMENT FUNCTIONS ---

// --- ABOUT VIDEO DATA MANAGEMENT FUNCTIONS ---
// Load about video from JSON
async function loadAboutVideo() {
    try {
        const data = await fs.readFile(aboutVideoPath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.log('⚠️ No about video file found, creating new one');
        const defaultData = { videoUrl: '' };
        await fs.writeFile(aboutVideoPath, JSON.stringify(defaultData, null, 2));
        return defaultData;
    }
}

// Save about video to JSON
async function saveAboutVideo(videoData) {
    await fs.writeFile(aboutVideoPath, JSON.stringify(videoData, null, 2));
    console.log('✅ About video saved successfully');
}
// --- END: ABOUT VIDEO DATA MANAGEMENT FUNCTIONS ---

// --- SERVICES VIDEOS DATA MANAGEMENT FUNCTIONS ---
// Load services videos from JSON
async function loadServicesVideos() {
    try {
        const data = await fs.readFile(servicesVideosPath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.log('⚠️ No services videos file found, creating new one');
        const defaultData = {
            strategy: '',
            development: '',
            automation: ''
        };
        await fs.writeFile(servicesVideosPath, JSON.stringify(defaultData, null, 2));
        return defaultData;
    }
}

// Save services videos to JSON
async function saveServicesVideos(videosData) {
    await fs.writeFile(servicesVideosPath, JSON.stringify(videosData, null, 2));
    console.log('✅ Services videos saved successfully');
}
// --- END: SERVICES VIDEOS DATA MANAGEMENT FUNCTIONS ---

// --- PAGE CONTENT DATA MANAGEMENT FUNCTIONS ---
// Services Page Content
async function loadServicesContent() {
    try {
        const data = await fs.readFile(servicesContentPath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.log('⚠️  No services content file found, returning null');
        return null;
    }
}

async function saveServicesContent(content) {
    await fs.writeFile(servicesContentPath, JSON.stringify(content, null, 2));
    console.log('✅ Services content saved successfully');
}

// About Page Content
async function loadAboutContent() {
    try {
        const data = await fs.readFile(aboutContentPath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.log('⚠️ No about content file found, returning null');
        return null;
    }
}

async function saveAboutContent(content) {
    await fs.writeFile(aboutContentPath, JSON.stringify(content, null, 2));
    console.log('✅ About content saved successfully');
}

// Whitepaper Page Content
async function loadWhitepaperContent() {
    try {
        const data = await fs.readFile(whitepaperContentPath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.log('⚠️ No whitepaper content file found, returning null');
        return null;
    }
}

async function saveWhitepaperContent(content) {
    await fs.writeFile(whitepaperContentPath, JSON.stringify(content, null, 2));
    console.log('✅ Whitepaper content saved successfully');
}
// --- END: PAGE CONTENT DATA MANAGEMENT FUNCTIONS ---

// --- CUSTOM ARTICLES DATA MANAGEMENT FUNCTIONS ---
// Load custom articles from JSON
async function loadCustomArticles() {
    try {
        const data = await fs.readFile(customArticlesPath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.log('⚠️ No custom articles file found, creating new one');
        await fs.writeFile(customArticlesPath, '[]');
        return [];
    }
}

// Save custom articles to JSON
async function saveCustomArticles(articles) {
    await fs.writeFile(customArticlesPath, JSON.stringify(articles, null, 2));
    console.log('✅ Custom articles saved successfully');
}
// --- END: CUSTOM ARTICLES DATA MANAGEMENT FUNCTIONS ---

// --- AUTOMATIC WEEKLY ARCHIVING ---
// Schedule archiving to run every Monday at 2:00 AM
// Cron format: '0 2 * * 1' = At 02:00 on Monday
// You can change the time by modifying the cron pattern:
// '0 2 * * 1' = 2:00 AM every Monday
// '0 0 * * 1' = Midnight every Monday
// '0 6 * * 1' = 6:00 AM every Monday
cron.schedule('25 22 * * *', async () => {
    console.log('🕐 Running scheduled daily archive task...');
    const archivedCount = await archiveOldPosts();
    if (archivedCount > 0) {
        console.log(`✅ Daily archive complete: ${archivedCount} posts archived`);
    } else {
        console.log('✅ Daily archive check complete: No posts needed archiving');
    }
}, {
    timezone: "Asia/Tehran" // Change this to your timezone if needed
});

console.log('📅 Automatic daily archiving scheduled for every day at 22:25 PM (Tehran time)');
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

// Function to send confirmation email to customer
async function sendCustomerConfirmation(userEmail, language = 'fa') {
    if (!emailTransporter) {
        console.log('⚠️ Email not configured, skipping customer confirmation');
        return;
    }

    try {
        // Bilingual email content
        const emailContent = language === 'fa' ? {
            subject: 'تایید دریافت درخواست شما | Nazarban Analytics',
            html: `
                <!DOCTYPE html>
                <html dir="rtl" lang="fa">
                <head>
                    <meta charset="UTF-8">
                    <style>
                        body { font-family: Tahoma, Arial, sans-serif; line-height: 1.8; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                        .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; }
                        .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 0.9em; color: #666; border-radius: 0 0 10px 10px; }
                        .highlight { background: #f0f4ff; padding: 15px; border-right: 4px solid #667eea; margin: 20px 0; }
                        .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1 style="margin: 0;">🎯 Nazarban Analytics</h1>
                            <p style="margin: 10px 0 0 0;">AI Consulting & Implementation</p>
                        </div>
                        <div class="content">
                            <h2>با تشکر از تماس شما!</h2>
                            <p>سلام،</p>
                            <p>از اینکه با ما در مورد نیازهای هوش مصنوعی خود صحبت کردید، متشکریم. درخواست شما با موفقیت دریافت شد و تیم تخصصی ما در حال بررسی جزئیات پروژه شماست.</p>
                            
                            <div class="highlight">
                                <strong>⏰ مراحل بعدی:</strong><br>
                                • تیم ما ظرف ۲۴ تا ۴۸ ساعت آینده با شما تماس خواهد گرفت<br>
                                • یک تماس Discovery ۳۰ دقیقه‌ای برنامه‌ریزی خواهیم کرد<br>
                                • محدوده پروژه و شاخص‌های کلیدی (KPI) را نهایی می‌کنیم<br>
                                • در صورت نیاز، نمونه‌های داده را بررسی خواهیم کرد
                            </div>

                            <p><strong>🔒 حریم خصوصی:</strong> تمام بحث‌ها و اطلاعات به اشتراک گذاشته شده کاملاً محرمانه است.</p>
                            
                            <p>اگر سوال فوری دارید، می‌توانید مستقیماً با ما تماس بگیرید:</p>
                            <p>
                                📧 Email: <a href="mailto:info@nazarbanai.com">info@nazarbanai.com</a><br>
                                📱 Phone: <a href="tel:+989120437502">+98 912 043 7502</a>
                            </p>
                            
                            <a href="https://nazarbanai.com" class="button">بازگشت به وبسایت</a>
                        </div>
                        <div class="footer">
                            <p><strong>Nazarban Analytics</strong></p>
                            <p>End-to-End AI Consulting & Implementation</p>
                            <p style="font-size: 0.85em; color: #999; margin-top: 15px;">
                                This is an automated confirmation email. Please do not reply directly to this email.
                            </p>
                        </div>
                    </div>
                </body>
                </html>
            `
        } : {
            subject: 'Request Confirmation | Nazarban Analytics',
            html: `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <style>
                        body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; line-height: 1.8; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                        .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; }
                        .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 0.9em; color: #666; border-radius: 0 0 10px 10px; }
                        .highlight { background: #f0f4ff; padding: 15px; border-left: 4px solid #667eea; margin: 20px 0; }
                        .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1 style="margin: 0;">🎯 Nazarban Analytics</h1>
                            <p style="margin: 10px 0 0 0;">AI Consulting & Implementation</p>
                        </div>
                        <div class="content">
                            <h2>Thank You for Reaching Out!</h2>
                            <p>Hello,</p>
                            <p>Thank you for discussing your AI needs with us. We've successfully received your inquiry and our specialist team is now reviewing your project details.</p>
                            
                            <div class="highlight">
                                <strong>⏰ Next Steps:</strong><br>
                                • Our team will contact you within 24-48 hours<br>
                                • We'll schedule a 30-minute Discovery call<br>
                                • We'll finalize the project scope and KPIs<br>
                                • If needed, we'll review any data samples
                            </div>

                            <p><strong>🔒 Privacy:</strong> All discussions and shared information remain strictly confidential.</p>
                            
                            <p>If you have any urgent questions, feel free to contact us directly:</p>
                            <p>
                                📧 Email: <a href="mailto:info@nazarbanai.com">info@nazarbanai.com</a><br>
                                📱 Phone (WhatsApp): <a href="https://wa.me/19165870145">+1 (916) 587-0145</a>
                            </p>
                            
                            <a href="https://nazarbanai.com" class="button">Visit Our Website</a>
                        </div>
                        <div class="footer">
                            <p><strong>Nazarban Analytics</strong></p>
                            <p>End-to-End AI Consulting & Implementation</p>
                            <p style="font-size: 0.85em; color: #999; margin-top: 15px;">
                                This is an automated confirmation email. Please do not reply directly to this email.
                            </p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        const mailOptions = {
            from: process.env.ZOHO_EMAIL,
            to: userEmail,
            subject: emailContent.subject,
            html: emailContent.html
        };

        await emailTransporter.sendMail(mailOptions);
        console.log(`✅ Customer confirmation email sent to ${userEmail}`);
    } catch (error) {
        console.error('❌ Failed to send customer confirmation:', error);
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
            console.error('❌ Blog post validation failed:', {
                hasTitle: !!title,
                hasSummaryEnglish: !!summaryEnglish,
                hasSummaryFarsi: !!summaryFarsi,
                hasDate: !!date,
                receivedData: { title, summaryEnglish: summaryEnglish?.substring(0, 50), summaryFarsi: summaryFarsi?.substring(0, 50), date }
            });
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

        console.log('✅ Creating new blog post:', {
            title,
            englishPreview: summaryEnglish.substring(0, 100),
            farsiPreview: summaryFarsi.substring(0, 100),
            date,
            url: url || 'N/A'
        });

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

        console.log(`✅ Blog post saved successfully. Total posts: ${uniquePosts.length}`);

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

// --- BENCHMARK API ROUTES ---
// API: Receive benchmark data from n8n
app.post('/api/benchmark/update', async (req, res) => {
    try {
        const benchmarkData = req.body;
        
        // Validate that we received data
        if (!benchmarkData || Object.keys(benchmarkData).length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'No benchmark data provided' 
            });
        }
        
        // Save the benchmark data
        await saveBenchmarkData(benchmarkData);
        
        res.json({ 
            success: true, 
            message: 'Benchmark data updated successfully',
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Error updating benchmark data:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to update benchmark data',
            error: error.message
        });
    }
});

// API: Get benchmark data for frontend
app.get('/api/benchmark/data', async (req, res) => {
    try {
        const benchmarkData = await loadBenchmarkData();
        
        if (!benchmarkData) {
            return res.status(404).json({ 
                success: false, 
                message: 'No benchmark data available yet' 
            });
        }
        
        res.json({ 
            success: true, 
            data: benchmarkData 
        });
        
    } catch (error) {
        console.error('❌ Error loading benchmark data:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to load benchmark data',
            error: error.message
        });
    }
});
// --- END: BENCHMARK API ROUTES ---

// --- NEW: CRYPTO API ROUTES ---
// API: Receive crypto data from n8n
app.post('/api/crypto/update', async (req, res) => {
    try {
        // We expect n8n to send the entire array of coins as the body
        const cryptoData = req.body; 
        
        // Validate that we received an array
        if (!Array.isArray(cryptoData) || cryptoData.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'No crypto data provided or data is not an array' 
            });
        }
        
        // Save the new crypto data (this will overwrite the old file)
        await saveCryptoData(cryptoData);
        
        res.json({ 
            success: true, 
            message: `Crypto data updated successfully with ${cryptoData.length} coins`,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Error updating crypto data:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to update crypto data',
            error: error.message
        });
    }
});

// API: Get crypto data for frontend
app.get('/api/crypto/data', async (req, res) => {
    try {
        const cryptoData = await loadCryptoData();
        
        if (cryptoData.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'No crypto data available yet' 
            });
        }
        
        res.json({ 
            success: true, 
            data: cryptoData 
        });
        
    } catch (error) {
        console.error('❌ Error loading crypto data:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to load crypto data',
            error: error.message
        });
    }
});
// --- END: CRYPTO API ROUTES ---

// --- IMAGE UPLOAD API ---
// API: Upload product image
app.post('/api/upload/product-image', upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No image file provided'
            });
        }

        // Return the URL path to the uploaded image
        const imageUrl = `/uploads/products/${req.file.filename}`;

        console.log('✅ Product image uploaded:', imageUrl);

        res.json({
            success: true,
            imageUrl: imageUrl,
            filename: req.file.filename
        });
    } catch (error) {
        console.error('❌ Image upload error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to upload image'
        });
    }
});

// Handle multer errors
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'File too large. Maximum size is 5MB.'
            });
        }
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
    next(error);
});
// --- END: IMAGE UPLOAD API ---

// --- PRODUCTS API ROUTES ---
// API: Create/Update a product (JWT protected)
app.post('/api/products', requireAdmin, async (req, res) => {
    try {
        const {
            id,
            nameEn,
            nameFa,
            taglineEn,
            taglineFa,
            descriptionEn,
            descriptionFa,
            fullDescriptionEn,
            fullDescriptionFa,
            featuresEn,
            featuresFa,
            url,
            imageUrl,
            videoUrl,
            status,
            category
        } = req.body;

        // Validate required fields
        if (!nameEn || !nameFa || !descriptionEn || !descriptionFa) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: nameEn, nameFa, descriptionEn, descriptionFa'
            });
        }

        const products = await loadProducts();

        if (id) {
            // Update existing product
            const index = products.findIndex(p => p.id === id);
            if (index !== -1) {
                products[index] = {
                    id,
                    nameEn,
                    nameFa,
                    taglineEn: taglineEn || '',
                    taglineFa: taglineFa || '',
                    descriptionEn,
                    descriptionFa,
                    fullDescriptionEn: fullDescriptionEn || '',
                    fullDescriptionFa: fullDescriptionFa || '',
                    featuresEn: featuresEn || [],
                    featuresFa: featuresFa || [],
                    url: url || '',
                    imageUrl: imageUrl || '',
                    videoUrl: videoUrl || '',
                    status: status || 'live',
                    category: category || '',
                    updatedAt: new Date().toISOString()
                };

                await saveProducts(products);

                res.json({
                    success: true,
                    message: 'Product updated successfully',
                    product: products[index]
                });
            } else {
                return res.status(404).json({
                    success: false,
                    message: 'Product not found'
                });
            }
        } else {
            // Create new product
            const newProduct = {
                id: Date.now().toString(),
                nameEn,
                nameFa,
                taglineEn: taglineEn || '',
                taglineFa: taglineFa || '',
                descriptionEn,
                descriptionFa,
                fullDescriptionEn: fullDescriptionEn || '',
                fullDescriptionFa: fullDescriptionFa || '',
                featuresEn: featuresEn || [],
                featuresFa: featuresFa || [],
                url: url || '',
                imageUrl: imageUrl || '',
                videoUrl: videoUrl || '',
                status: status || 'live',
                category: category || '',
                createdAt: new Date().toISOString()
            };

            // Add to beginning of products array (newest first)
            products.unshift(newProduct);

            // Save products
            await saveProducts(products);

            res.json({
                success: true,
                message: 'Product created successfully',
                product: newProduct
            });
        }

    } catch (error) {
        console.error('❌ Error managing product:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to manage product',
            error: error.message
        });
    }
});

// API: GET all products
app.get('/api/products', async (req, res) => {
    try {
        const products = await loadProducts();
        res.json({ success: true, products });
    } catch (error) {
        console.error('❌ Error loading products:', error);
        res.status(500).json({ success: false, message: 'Failed to load products' });
    }
});

// API: DELETE a product (Admin only)
app.delete('/api/products/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { password } = req.body;

        // Simple password protection
        if (password !== process.env.ADMIN_PASSWORD) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized: Invalid password'
            });
        }

        const products = await loadProducts();
        const filteredProducts = products.filter(p => p.id !== id);

        if (filteredProducts.length === products.length) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        await saveProducts(filteredProducts);

        res.json({
            success: true,
            message: 'Product deleted successfully'
        });

    } catch (error) {
        console.error('❌ Error deleting product:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete product',
            error: error.message
        });
    }
});
// --- END: PRODUCTS API ROUTES ---

// --- FAQS API ROUTES ---
// API: Create/Update an FAQ (Admin only)
app.post('/api/faqs', async (req, res) => {
    try {
        const {
            id,
            questionEn,
            questionFa,
            answerEn,
            answerFa,
            password
        } = req.body;

        // Simple password protection
        if (password !== process.env.ADMIN_PASSWORD) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized: Invalid password'
            });
        }

        // Validate required fields
        if (!questionEn || !questionFa || !answerEn || !answerFa) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: questionEn, questionFa, answerEn, answerFa'
            });
        }

        const faqs = await loadFaqs();

        if (id) {
            // Update existing FAQ
            const index = faqs.findIndex(f => f.id === id);
            if (index !== -1) {
                faqs[index] = {
                    id,
                    questionEn,
                    questionFa,
                    answerEn,
                    answerFa,
                    updatedAt: new Date().toISOString()
                };

                await saveFaqs(faqs);

                res.json({
                    success: true,
                    message: 'FAQ updated successfully',
                    faq: faqs[index]
                });
            } else {
                return res.status(404).json({
                    success: false,
                    message: 'FAQ not found'
                });
            }
        } else {
            // Create new FAQ
            const newFaq = {
                id: Date.now().toString(),
                questionEn,
                questionFa,
                answerEn,
                answerFa,
                createdAt: new Date().toISOString()
            };

            // Add to beginning of FAQs array
            faqs.unshift(newFaq);

            // Save FAQs
            await saveFaqs(faqs);

            res.json({
                success: true,
                message: 'FAQ created successfully',
                faq: newFaq
            });
        }

    } catch (error) {
        console.error('❌ Error managing FAQ:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to manage FAQ',
            error: error.message
        });
    }
});

// API: GET all FAQs
app.get('/api/faqs', async (req, res) => {
    try {
        const faqs = await loadFaqs();
        res.json({ success: true, faqs });
    } catch (error) {
        console.error('❌ Error loading FAQs:', error);
        res.status(500).json({ success: false, message: 'Failed to load FAQs' });
    }
});

// API: DELETE an FAQ (Admin only)
app.delete('/api/faqs/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { password } = req.body;

        // Simple password protection
        if (password !== process.env.ADMIN_PASSWORD) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized: Invalid password'
            });
        }

        const faqs = await loadFaqs();
        const filteredFaqs = faqs.filter(f => f.id !== id);

        if (filteredFaqs.length === faqs.length) {
            return res.status(404).json({
                success: false,
                message: 'FAQ not found'
            });
        }

        await saveFaqs(filteredFaqs);

        res.json({
            success: true,
            message: 'FAQ deleted successfully'
        });

    } catch (error) {
        console.error('❌ Error deleting FAQ:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete FAQ',
            error: error.message
        });
    }
});
// --- END: FAQS API ROUTES ---

// --- ABOUT VIDEO API ROUTES ---
// API: GET about video URL
app.get('/api/about/video', async (req, res) => {
    try {
        const videoData = await loadAboutVideo();
        res.json({
            success: true,
            videoUrl: videoData.videoUrl || ''
        });
    } catch (error) {
        console.error('❌ Error loading about video:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load about video'
        });
    }
});

// API: POST/Update about video URL (Admin only)
app.post('/api/about/video', async (req, res) => {
    try {
        const { videoUrl, password } = req.body;

        // Simple password protection
        if (password !== process.env.ADMIN_PASSWORD) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized: Invalid password'
            });
        }

        // Save video URL (can be empty string to clear)
        const videoData = {
            videoUrl: videoUrl || '',
            updatedAt: new Date().toISOString()
        };

        await saveAboutVideo(videoData);

        res.json({
            success: true,
            message: 'About video URL saved successfully',
            videoUrl: videoData.videoUrl
        });

    } catch (error) {
        console.error('❌ Error saving about video:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to save about video',
            details: error.message
        });
    }
});
// --- END: ABOUT VIDEO API ROUTES ---

// --- SERVICES VIDEOS API ROUTES ---
// API: GET services videos
app.get('/api/services/videos', async (req, res) => {
    try {
        const videosData = await loadServicesVideos();
        res.json({
            success: true,
            videos: videosData
        });
    } catch (error) {
        console.error('❌ Error loading services videos:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load services videos'
        });
    }
});

// API: POST/Update services videos (Admin only)
app.post('/api/services/videos', async (req, res) => {
    try {
        const { videos, password } = req.body;

        // Simple password protection
        if (password !== process.env.ADMIN_PASSWORD) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized: Invalid password'
            });
        }

        // Validate that videos is an object
        if (!videos || typeof videos !== 'object') {
            return res.status(400).json({
                success: false,
                error: 'Invalid videos data format'
            });
        }

        // Save videos data
        const videosData = {
            strategy: videos.strategy || '',
            development: videos.development || '',
            automation: videos.automation || '',
            updatedAt: new Date().toISOString()
        };

        await saveServicesVideos(videosData);

        res.json({
            success: true,
            message: 'Services videos saved successfully',
            videos: videosData
        });

    } catch (error) {
        console.error('❌ Error saving services videos:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to save services videos',
            details: error.message
        });
    }
});
// --- END: SERVICES VIDEOS API ROUTES ---

// --- PAGE CONTENT API ROUTES ---
// Services Content API
app.get('/api/content/services', async (req, res) => {
    try {
        const content = await loadServicesContent();
        res.json({ success: true, content });
    } catch (error) {
        console.error('❌ Error loading services content:', error);
        res.status(500).json({ success: false, message: 'Failed to load services content' });
    }
});

app.post('/api/content/services', async (req, res) => {
    try {
        const { content, password } = req.body;

        if (password !== process.env.ADMIN_PASSWORD) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        await saveServicesContent(content);
        res.json({ success: true, message: 'Services content saved successfully' });
    } catch (error) {
        console.error('❌ Error saving services content:', error);
        res.status(500).json({ success: false, message: 'Failed to save services content' });
    }
});

// About Content API
app.get('/api/content/about', async (req, res) => {
    try {
        const content = await loadAboutContent();
        res.json({ success: true, content });
    } catch (error) {
        console.error('❌ Error loading about content:', error);
        res.status(500).json({ success: false, message: 'Failed to load about content' });
    }
});

app.post('/api/content/about', async (req, res) => {
    try {
        const { content, password } = req.body;

        if (password !== process.env.ADMIN_PASSWORD) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        await saveAboutContent(content);
        res.json({ success: true, message: 'About content saved successfully' });
    } catch (error) {
        console.error('❌ Error saving about content:', error);
        res.status(500).json({ success: false, message: 'Failed to save about content' });
    }
});

// Whitepaper Content API
app.get('/api/content/whitepaper', async (req, res) => {
    try {
        const content = await loadWhitepaperContent();
        res.json({ success: true, content });
    } catch (error) {
        console.error('❌ Error loading whitepaper content:', error);
        res.status(500).json({ success: false, message: 'Failed to load whitepaper content' });
    }
});

app.post('/api/content/whitepaper', async (req, res) => {
    try {
        const { content, password } = req.body;

        if (password !== process.env.ADMIN_PASSWORD) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        await saveWhitepaperContent(content);
        res.json({ success: true, message: 'Whitepaper content saved successfully' });
    } catch (error) {
        console.error('❌ Error saving whitepaper content:', error);
        res.status(500).json({ success: false, message: 'Failed to save whitepaper content' });
    }
});
// --- END: PAGE CONTENT API ROUTES ---

// --- CUSTOM ARTICLES API ROUTES ---
// API: GET all custom articles
app.get('/api/articles/custom', async (req, res) => {
    try {
        const articles = await loadCustomArticles();
        res.json({ success: true, articles });
    } catch (error) {
        console.error('❌ Error loading custom articles:', error);
        res.status(500).json({ success: false, message: 'Failed to load custom articles' });
    }
});

// API: POST/Update custom articles (JWT protected)
app.post('/api/articles/custom', requireAdmin, async (req, res) => {
    try {
        const { articles } = req.body;

        // Validate that articles is an array
        if (!Array.isArray(articles)) {
            return res.status(400).json({
                success: false,
                message: 'Articles must be an array'
            });
        }

        // Save articles
        await saveCustomArticles(articles);

        res.json({
            success: true,
            message: 'Custom articles saved successfully',
            count: articles.length
        });

    } catch (error) {
        console.error('❌ Error saving custom articles:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to save custom articles',
            error: error.message
        });
    }
});

// API: DELETE a specific custom article (Admin only)
app.delete('/api/articles/custom/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { password } = req.body;

        // Simple password protection
        if (password !== process.env.ADMIN_PASSWORD) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized: Invalid password'
            });
        }

        const articles = await loadCustomArticles();
        const filteredArticles = articles.filter(a => a.id !== id);

        if (filteredArticles.length === articles.length) {
            return res.status(404).json({
                success: false,
                message: 'Article not found'
            });
        }

        await saveCustomArticles(filteredArticles);

        res.json({
            success: true,
            message: 'Article deleted successfully'
        });

    } catch (error) {
        console.error('❌ Error deleting custom article:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete article',
            error: error.message
        });
    }
});
// --- END: CUSTOM ARTICLES API ROUTES ---

// Initialize email transporter on startup
setupEmailTransporter();

// Test endpoint
app.get('/api/test', (req, res) => {
    res.json({ status: 'Server is working!' });
});

// Contact form submission endpoint
app.post('/api/contact', async (req, res) => {
    try {
        const { fullName, organization, email, phone, service } = req.body;

        if (!fullName || !email || !phone) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        console.log(`📋 Contact form submission from ${fullName} (${organization})`);

        // Save to JSON file
        const contactsPath = path.join(__dirname, 'contactSubmissions.json');
        let contacts = [];
        try {
            const data = await fs.readFile(contactsPath, 'utf-8');
            contacts = JSON.parse(data);
        } catch (err) {
            // File doesn't exist yet, start fresh
        }

        const contactData = {
            fullName,
            organization,
            email,
            phone,
            service,
            timestamp: new Date().toISOString()
        };
        contacts.push(contactData);

        await fs.writeFile(contactsPath, JSON.stringify(contacts, null, 2));

        // Send notification email to team if configured
        const serviceLabels = {
            automation: 'Automation',
            strategy: 'AI Business Strategy',
            cv: 'Computer Vision',
            consulting: 'Consultation',
            other: 'Other'
        };

        if (emailTransporter) {
            const teamEmailHtml = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #818cf8;">New Contact Form Submission</h2>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Name:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${fullName}</td></tr>
                        <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Organization:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${organization}</td></tr>
                        <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Email:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${email}</td></tr>
                        <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Phone/WhatsApp:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${phone}</td></tr>
                        <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Service Interest:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${serviceLabels[service] || service}</td></tr>
                        <tr><td style="padding: 8px;"><strong>Submitted:</strong></td><td style="padding: 8px;">${new Date().toLocaleString('fa-IR')}</td></tr>
                    </table>
                    <p style="margin-top: 20px; color: #666;">Please contact this lead within 24 hours as promised.</p>
                </div>
            `;

            try {
                await emailTransporter.sendMail({
                    from: `"Nazarban AI" <${process.env.ZOHO_EMAIL}>`,
                    to: process.env.TEAM_EMAIL || 'info@nazarbanai.com',
                    subject: `🆕 New Lead: ${fullName} - ${organization}`,
                    html: teamEmailHtml
                });
                console.log(`✅ Contact form email sent for ${fullName}`);
            } catch (emailError) {
                console.error('Email sending failed:', emailError);
                // Don't fail the request - data is still saved
            }
        } else {
            console.log('⚠️ Email not sent - transporter not configured');
        }

        res.json({ success: true, message: 'Form submitted successfully' });
    } catch (error) {
        console.error('Contact form error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Email collection endpoint (from popup) - sends proposal to both parties
app.post('/api/collect-email', async (req, res) => {
    try {
        const { email, source, conversationHistory = [], language = 'fa' } = req.body;

        if (!email || !email.includes('@')) {
            return res.status(400).json({ success: false, message: 'Invalid email' });
        }

        // Log the collected email
        console.log(`📧 Email collected from ${source || 'unknown'}: ${email}`);

        // Save to JSON file
        const emailsPath = path.join(__dirname, 'collectedEmails.json');
        let emails = [];
        try {
            const data = await fs.readFile(emailsPath, 'utf-8');
            emails = JSON.parse(data);
        } catch (err) {
            // File doesn't exist yet, start fresh
        }

        // Add new lead with conversation
        const leadData = {
            email,
            source: source || 'popup',
            timestamp: new Date().toISOString(),
            language,
            conversationHistory
        };
        emails.push(leadData);

        await fs.writeFile(emailsPath, JSON.stringify(emails, null, 2));

        // Format conversation for team email (full chat)
        const formatConversation = (history) => {
            if (!history || history.length === 0) return 'No conversation recorded.';
            return history.map(msg => {
                const role = msg.role === 'user' ? '👤 User' : '🤖 AI';
                return `${role}:\n${msg.content}`;
            }).join('\n\n---\n\n');
        };

        const conversationText = formatConversation(conversationHistory);

        // Generate AI summary of user's request for their email
        let requestSummary = '';
        const isFarsi = language === 'fa';

        if (conversationHistory.length > 0) {
            try {
                const summaryPrompt = isFarsi
                    ? `بر اساس گفتگوی زیر، یک خلاصه حرفه‌ای و مختصر (3-5 جمله) از درخواست و نیازهای کاربر بنویس. این خلاصه باید نشان دهد که ما نیازهای آنها را درک کرده‌ایم. فقط خلاصه را بنویس، بدون مقدمه یا توضیح اضافی.`
                    : `Based on the conversation below, write a professional and concise summary (3-5 sentences) of the user's request and needs. This summary should demonstrate that we understand their requirements. Write only the summary, no introduction or extra explanation.`;

                const conversationForAI = conversationHistory.map(msg => ({
                    role: msg.role,
                    content: msg.content
                }));

                conversationForAI.push({
                    role: 'user',
                    content: summaryPrompt
                });

                const summaryResponse = await callGoogleGeminiWithRetry(conversationForAI, '', 2);
                requestSummary = summaryResponse || (isFarsi ? 'درخواست شما دریافت شد.' : 'Your request has been received.');
            } catch (err) {
                console.error('Error generating summary:', err);
                requestSummary = isFarsi
                    ? 'درخواست شما برای راه‌حل‌های هوش مصنوعی دریافت شد.'
                    : 'Your request for AI solutions has been received.';
            }
        } else {
            requestSummary = isFarsi
                ? 'درخواست شما برای راه‌حل‌های هوش مصنوعی دریافت شد.'
                : 'Your request for AI solutions has been received.';
        }

        // Send emails if transporter is configured
        if (emailTransporter) {
            // Email to the user (with summary, not full chat)
            const userSubject = isFarsi
                ? 'درخواست پیشنهاد AI شما - نظربان'
                : 'Your AI Proposal Request - Nazarban';

            const userHtml = isFarsi ? `
                <div style="font-family: Tahoma, Arial, sans-serif; direction: rtl; text-align: right; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #818cf8;">با تشکر از درخواست شما!</h2>
                    <p>سلام،</p>
                    <p>ما درخواست پیشنهاد AI شما را دریافت کردیم. تیم ما در حال بررسی نیازهای شما است و <strong>ظرف ۲۴ ساعت</strong> یک پیشنهاد شخصی‌سازی شده برای شما ارسال خواهد شد.</p>

                    <h3 style="color: #818cf8; margin-top: 30px;">درک ما از نیازهای شما:</h3>
                    <div style="background: #f1f5f9; padding: 15px; border-radius: 8px; font-size: 14px; line-height: 1.6;">
                        ${requestSummary}
                    </div>

                    <p style="margin-top: 30px;">اگر سوالی دارید یا می‌خواهید جزئیات بیشتری اضافه کنید، می‌توانید مستقیماً به این ایمیل پاسخ دهید.</p>

                    <p style="margin-top: 20px;">با احترام،<br><strong>تیم نظربان</strong></p>

                    <hr style="margin-top: 30px; border: none; border-top: 1px solid #e2e8f0;">
                    <p style="font-size: 12px; color: #64748b;">
                        نظربان - مشاوره و پیاده‌سازی هوش مصنوعی<br>
                        info@nazarbanai.com | nazarbanai.com
                    </p>
                </div>
            ` : `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #818cf8;">Thank You for Your Request!</h2>
                    <p>Hello,</p>
                    <p>We've received your AI proposal request. Our team is reviewing your needs and will send you a <strong>personalized proposal within 24 hours</strong>.</p>

                    <h3 style="color: #818cf8; margin-top: 30px;">Our Understanding of Your Needs:</h3>
                    <div style="background: #f1f5f9; padding: 15px; border-radius: 8px; font-size: 14px; line-height: 1.6;">
                        ${requestSummary}
                    </div>

                    <p style="margin-top: 30px;">If you have any questions or would like to add more details, feel free to reply directly to this email.</p>

                    <p style="margin-top: 20px;">Best regards,<br><strong>Nazarban Team</strong></p>

                    <hr style="margin-top: 30px; border: none; border-top: 1px solid #e2e8f0;">
                    <p style="font-size: 12px; color: #64748b;">
                        Nazarban - AI Consulting & Implementation<br>
                        info@nazarbanai.com | nazarbanai.com
                    </p>
                </div>
            `;

            // Email to Nazarban team (internal notification with FULL conversation)
            const teamSubject = `🎯 New AI Lead: ${email}`;
            const teamHtml = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #10b981;">New Lead from Chat Widget</h2>

                    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;"><strong>Email:</strong></td>
                            <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${email}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;"><strong>Language:</strong></td>
                            <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${language === 'fa' ? 'Farsi' : 'English'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;"><strong>Time:</strong></td>
                            <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${new Date().toLocaleString()}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;"><strong>Messages:</strong></td>
                            <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${conversationHistory.length}</td>
                        </tr>
                    </table>

                    <h3 style="color: #818cf8;">Full Conversation:</h3>
                    <div style="background: #f1f5f9; padding: 15px; border-radius: 8px; white-space: pre-wrap; font-size: 14px;">
                        ${conversationText}
                    </div>

                    <p style="margin-top: 20px; padding: 15px; background: #fef3c7; border-radius: 8px;">
                        <strong>⚡ Action Required:</strong> Send a personalized proposal to this lead within 24 hours.
                    </p>
                </div>
            `;

            // Send both emails
            try {
                // Email to user
                await emailTransporter.sendMail({
                    from: `"Nazarban AI" <${process.env.ZOHO_EMAIL}>`,
                    to: email,
                    subject: userSubject,
                    html: userHtml
                });
                console.log(`✅ Confirmation email sent to user: ${email}`);

                // Email to team
                await emailTransporter.sendMail({
                    from: `"Nazarban Leads" <${process.env.ZOHO_EMAIL}>`,
                    to: process.env.ZOHO_EMAIL, // Send to your own email
                    subject: teamSubject,
                    html: teamHtml
                });
                console.log(`✅ Lead notification sent to team`);

            } catch (emailErr) {
                console.error('❌ Error sending emails:', emailErr);
                // Don't fail the request if email fails - data is still saved
            }
        } else {
            console.log('⚠️ Email transporter not configured - emails not sent');
        }

        res.json({ success: true, message: 'Proposal request received' });
    } catch (err) {
        console.error('Error collecting email:', err);
        res.status(500).json({ success: false, message: 'Failed to process request' });
    }
});

// Admin login verification endpoint
app.post('/api/admin/verify-login', loginLimiter, (req, res) => {
    const { password } = req.body;

    // Get admin password from environment variable
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

    if (!ADMIN_PASSWORD) {
        console.error('❌ ADMIN_PASSWORD not set in environment variables');
        return res.status(500).json({
            success: false,
            error: 'Server configuration error: Admin password not configured'
        });
    }

    if (!password) {
        return res.status(400).json({
            success: false,
            error: 'Password required'
        });
    }

    // Verify password
    if (password === ADMIN_PASSWORD) {
        // Create JWT token
        const token = jwt.sign(
            { admin: true, loginTime: new Date().toISOString() },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Set httpOnly cookie (can't be accessed by JavaScript - secure!)
        res.cookie('adminToken', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // Only HTTPS in production
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });

        console.log('✅ Admin login successful - JWT token issued');
        res.status(200).json({ success: true, message: 'Login successful' });
    } else {
        console.log('❌ Admin login failed - invalid password');
        res.status(401).json({
            success: false,
            error: 'Invalid password'
        });
    }
});

// Admin logout endpoint
app.post('/api/admin/logout', (req, res) => {
    res.clearCookie('adminToken');
    console.log('✅ Admin logout successful');
    res.json({ success: true, message: 'Logged out successfully' });
});

// Main chat endpoint
app.post('/api/chat', chatLimiter, async (req, res) => {
    try {
        const { message, conversationHistory = [], conversationStage = 'initial', userEmail, language = 'fa', honeypot } = req.body;

        // Bot detection - honeypot field
        if (honeypot) {
            console.log('🤖 Bot detected via honeypot');
            return res.status(400).json({ success: false, message: 'Invalid request' });
        }

        // Check daily limit
        if (!checkDailyLimit()) {
            console.error('🚨 DAILY CHAT LIMIT REACHED');
            return res.status(503).json({
                success: false,
                message: language === 'fa'
                    ? 'سرویس چت موقتاً در دسترس نیست. لطفاً فردا دوباره تلاش کنید.'
                    : 'Chat service temporarily unavailable. Please try again tomorrow.'
            });
        }

        // Get session ID (use custom header or IP as fallback)
        const sessionId = req.headers['x-session-id'] || req.ip;

        // Check session hourly limit
        if (!checkSessionLimit(sessionId)) {
            console.log(`⚠️ Session limit reached for ${sessionId}`);
            return res.status(429).json({
                success: false,
                message: language === 'fa'
                    ? 'شما به حد مجاز پیام‌های ساعتی رسیده‌اید. لطفاً یک ساعت دیگر تلاش کنید.'
                    : 'You\'ve reached the hourly message limit. Please try again in an hour.'
            });
        }

        // Validate message length
        if (message && message.length > MAX_MESSAGE_LENGTH) {
            return res.status(400).json({
                success: false,
                message: language === 'fa'
                    ? `پیام شما خیلی طولانی است. لطفاً آن را به کمتر از ${MAX_MESSAGE_LENGTH} کاراکتر کوتاه کنید.`
                    : `Message too long. Please keep it under ${MAX_MESSAGE_LENGTH} characters.`
            });
        }

        // Track usage
        usageStats.chatMessages++;
        trackIPUsage(req.ip);
        console.log(`✅ Chat message received (${usageStats.chatMessages}/${MAX_DAILY_CHAT_MESSAGES} today) from ${sessionId}`);

        if (!process.env.GOOGLE_API_KEY) {
            return res.status(500).json({ success: false, message: "Server configuration error: Missing Google API key." });
        }

        const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
        const emailMatch = message.match(emailRegex);
        
        if (emailMatch && !userEmail) {
    await sendLeadNotification(emailMatch[0], conversationHistory);
    await sendCustomerConfirmation(emailMatch[0], language);  // ← ADD THIS LINE
    
    const farewell = language === 'fa'
        ? `عالیه! ایمیل شما رو دریافت کردم: ${emailMatch[0]}. از علاقه‌تون به خدمات هوش مصنوعی نظربان متشکریم. تیم ما نیازهای شما رو بررسی می‌کنه و ظرف ۲۴ تا ۴۸ ساعت یه پیشنهاد شخصی‌سازی‌شده براتون ارسال می‌کنه. روز خوبی داشته باشید!`
        : `Perfect! I've got your email: ${emailMatch[0]}. Thank you for your interest in Nazarban's AI services. Our team will review your requirements and get back to you within 24-48 hours with a personalized proposal. Have a great day!`;
    
    return res.json({
        success: true,
        message: farewell,
        conversationStage: 'completion',
        userEmail: emailMatch[0],
        conversationComplete: true
    });
}
        let responseMessage = '';
        try {
            let apiMessages = conversationHistory.length > 0 ? conversationHistory.slice(-8) : [];
apiMessages.push({ role: 'user', content: message });

let systemPrompt = prompts.mainSystemPrompt;

if (language === 'fa') {
    systemPrompt += "\n\n**CRITICAL INSTRUCTION**: You MUST respond in Persian (Farsi) language ONLY. Do not use English in your responses. پاسخ‌های خود را به زبان فارسی بنویسید.";
} else {
    systemPrompt += "\n\n**CRITICAL INSTRUCTION**: You MUST respond in English language ONLY. Do not use Persian/Farsi in your responses.";
}

console.log('🤖 Calling Google Gemini API with', apiMessages.length, 'messages in', language === 'fa' ? 'Farsi' : 'English');

responseMessage = await callGoogleGeminiWithRetry(apiMessages, systemPrompt);

// ✅ ADD THIS ENTIRE BLOCK HERE (Change 4):
if (conversationHistory.length >= 4 && !userEmail && conversationStage === 'initial') {
    if (!responseMessage.toLowerCase().includes('email') && !responseMessage.includes('ایمیل')) {
        const emailPrompt = language === 'fa'
            ? "\n\nدوست دارم متخصصان هوش مصنوعی ما یه پیشنهاد جامع براتون آماده کنن. می‌تونید ایمیل‌تون رو به اشتراک بگذارید تا خلاصه مشاوره و مراحل بعدی رو براتون ارسال کنیم؟"
            : "\n\nI'd love to have our AI specialists prepare a detailed proposal for you. Could you share your email address so we can send you a consultation summary and next steps?";
        responseMessage += emailPrompt;
    }
}
// ✅ END OF ADDED BLOCK

        } catch (apiError) {
    console.error('❌ Final Google Gemini API error:', apiError.message);
    responseMessage = language === 'fa'
        ? "متأسفم، در حال حاضر با یک مشکل فنی مواجه هستم و نمی‌تونم درخواست شما رو پردازش کنم. لطفاً چند لحظه دیگه دوباره تلاش کنید."
        : "I apologize, but I'm encountering a technical issue and can't process your request right now. Please try again in a few moments.";
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

// --- CLEAN URL ROUTING ---
// Redirect /index.html to root
app.get('/index.html', (req, res) => {
    res.redirect(301, '/');
});

// Redirect .html URLs to clean URLs (permanent redirect)
app.get('/*.html', (req, res) => {
    const cleanUrl = req.path.replace('.html', '');
    res.redirect(301, cleanUrl);
});

// Serve HTML pages for clean URLs
const pages = ['about', 'blog', 'products', 'services', 'whitepaper', 'benchmark', 'product-detail', 'admin'];
pages.forEach(page => {
    app.get(`/${page}`, (req, res) => {
        res.sendFile(path.join(__dirname, 'public', `${page}.html`));
    });
});
// --- END CLEAN URL ROUTING ---

// 404 and Error handlers
app.use((req, res) => {
    console.log('❌ 404 - Route not found:', req.method, req.url);

    // Check if request expects HTML (browser) or JSON (API)
    const acceptHeader = req.headers.accept || '';
    if (acceptHeader.includes('text/html')) {
        // Serve custom 404 page for browser requests
        res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
    } else {
        // Return JSON for API requests
        res.status(404).json({ error: 'Route not found' });
    }
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
    console.log(`📊 Benchmark API: ✅ Enabled at /api/benchmark/update`);
    console.log(`📈 Crypto API: ✅ Enabled at /api/crypto/update`); // <-- NEW LINE
    console.log(`📅 Automatic archiving: ✅ Scheduled for every Monday at 2:00 AM`);
});
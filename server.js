const express = require('express');
const path = require('path');
const cors = require('cors');
const nodemailer = require('nodemailer');
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

// Email sending function
async function sendLeadNotification(userEmail, conversationHistory) {
    if (!emailTransporter) {
        console.log('⚠️ Email transporter not available');
        return;
    }

    try {
        // Create conversation summary
        const conversationSummary = conversationHistory
            .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
            .join('\n\n');

        // Email to company
        const companyMailOptions = {
            from: process.env.ZOHO_EMAIL,
            to: process.env.COMPANY_EMAIL || process.env.ZOHO_EMAIL,
            subject: '🔥 New AI Consultation Lead',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #6366f1;">New Lead from Nazarban AI Chatbot</h2>
                    
                    <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="color: #1e293b; margin-top: 0;">Contact Information</h3>
                        <p><strong>Email:</strong> ${userEmail}</p>
                        <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
                    </div>
                    
                    <div style="background: #f1f5f9; padding: 20px; border-radius: 8px;">
                        <h3 style="color: #1e293b; margin-top: 0;">Conversation Summary</h3>
                        <div style="white-space: pre-wrap; font-size: 14px; line-height: 1.6;">${conversationSummary}</div>
                    </div>
                    
                    <p style="margin-top: 20px; color: #64748b; font-size: 14px;">
                        Follow up with this lead within 24-48 hours for best conversion rates.
                    </p>
                </div>
            `
        };

        // Email to user (confirmation)
        const userMailOptions = {
            from: process.env.ZOHO_EMAIL,
            to: userEmail,
            subject: 'Thank you for your interest in Nazarban AI Services',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="text-align: center; padding: 20px 0;">
                        <h2 style="color: #6366f1;">Thank You!</h2>
                    </div>
                    
                    <p>Dear Valued Client,</p>
                    
                    <p>Thank you for your interest in Nazarban Analytics-FZCO AI services. We've received your consultation request and our team will review your requirements.</p>
                    
                    <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="color: #1e293b; margin-top: 0;">What's Next?</h3>
                        <ul style="color: #475569;">
                            <li>Our AI specialists will analyze your requirements</li>
                            <li>We'll prepare a customized proposal for your project</li>
                            <li>You'll receive a detailed follow-up within 24-48 hours</li>
                        </ul>
                    </div>
                    
                    <p>If you have any urgent questions, feel free to reply to this email.</p>
                    
                    <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                        <p style="color: #64748b; font-size: 14px;">
                            <strong>Nazarban Analytics-FZCO</strong><br>
                            AI Solutions & Consulting<br>
                            <a href="mailto:${process.env.ZOHO_EMAIL}" style="color: #6366f1;">${process.env.ZOHO_EMAIL}</a>
                        </p>
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

// Test endpoint to check if server is working
app.get('/api/test', (req, res) => {
    res.json({ 
        status: 'Server is working!', 
        timestamp: new Date().toISOString(),
        environment: {
            hasClaudeKey: !!process.env.CLAUDE_API_KEY,
            hasZohoEmail: !!process.env.ZOHO_EMAIL,
            hasZohoPassword: !!process.env.ZOHO_APP_PASSWORD,
            emailConfigured: !!emailTransporter,
            port: PORT
        }
    });
});

// Simple chat endpoint with better error handling
app.post('/api/chat', async (req, res) => {
    console.log('📨 Received chat request:', req.body);

    try {
        const { message, conversationHistory = [], conversationStage = 'initial', userEmail } = req.body;
        
        // Check if we have required environment variables
        if (!process.env.CLAUDE_API_KEY) {
            console.error('❌ Missing CLAUDE_API_KEY in environment');
            return res.status(500).json({
                success: false,
                message: "Server configuration error: Missing Claude API key. Please check your .env file."
            });
        }

        // Simple email detection
        const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
        const emailMatch = message.match(emailRegex);
        
        if (emailMatch && !userEmail) {
            // Found email - send notifications and end conversation
            await sendLeadNotification(emailMatch[0], conversationHistory);
            
            return res.json({
                success: true,
                message: `Perfect! I've got your email: ${emailMatch[0]}. Thank you for your interest in Nazarban's AI services. Our team will review your requirements and get back to you within 24-48 hours with a personalized proposal. Have a great day!`,
                conversationStage: 'completion',
                userEmail: emailMatch[0],
                conversationComplete: true
            });
        }

        // Try to get Claude response
        let responseMessage = '';
        
        try {
            const axios = require('axios');
            
            // Prepare messages for Claude API
            let claudeMessages = [];
            
            // Add conversation history
            if (conversationHistory.length > 0) {
                claudeMessages = conversationHistory.slice(-8); // Keep last 8 messages for context
            }
            
            // Add current message
            claudeMessages.push({ role: 'user', content: message });

            const systemPrompt = `You are an AI consultation assistant for Nazarban Analytics-FZCO, a professional AI services company specializing in AI solutions. 

Your role:
1. Understand the user's specific AI needs and business challenges
2. Ask relevant follow-up questions about their requirements, timeline, budget considerations
3. Provide helpful, genuine insights about AI technologies like machine learning, NLP, computer vision, chatbots, automation
4. After understanding their needs well (usually after 3-4 exchanges), naturally ask for their email to continue the consultation

Be professional, knowledgeable, and genuinely helpful. Provide real value about AI applications and business benefits. Keep responses conversational but informative (2-3 sentences).

Example topics to discuss: chatbot development, machine learning models, data analytics, process automation, recommendation systems, computer vision applications, natural language processing.`;

            console.log('🤖 Calling Claude API with', claudeMessages.length, 'messages...');
            console.log('🔑 API Key starts with:', process.env.CLAUDE_API_KEY?.substring(0, 20) + '...');
            
            const claudeResponse = await axios.post('https://api.anthropic.com/v1/messages', {
                model: 'claude-3-5-sonnet-20241022',
                max_tokens: 800,
                system: systemPrompt,
                messages: claudeMessages
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': process.env.CLAUDE_API_KEY,
                    'anthropic-version': '2023-06-01'
                },
                timeout: 30000
            });

            responseMessage = claudeResponse.data.content[0].text;
            console.log('✅ Claude API success! Response length:', responseMessage.length);

            // After several messages, suggest getting email
            if (conversationHistory.length >= 4 && !userEmail && conversationStage === 'initial') {
                if (!responseMessage.toLowerCase().includes('email') && !responseMessage.toLowerCase().includes('contact')) {
                    responseMessage += "\n\nI'd love to have our AI specialists prepare a detailed proposal for you. Could you share your email address so we can send you a consultation summary and next steps?";
                }
            }

        } catch (claudeError) {
            console.error('❌ Claude API Error Details:');
            console.error('Status:', claudeError.response?.status);
            console.error('Error Data:', claudeError.response?.data);
            console.error('Error Message:', claudeError.message);
            
            // More specific fallback responses based on the user's message
            const userMessage = message.toLowerCase();
            
            if (conversationHistory.length === 0) {
                if (userMessage.includes('chatbot') || userMessage.includes('chat bot')) {
                    responseMessage = "Excellent! A therapy chatbot is a fantastic AI application. These can provide 24/7 support, guided conversations, and personalized therapeutic exercises. What specific features are you envisioning - mood tracking, crisis support, CBT exercises, or something else?";
                } else if (userMessage.includes('machine learning') || userMessage.includes('ml')) {
                    responseMessage = "Great choice! Machine learning can transform businesses through predictive analytics, automation, and intelligent decision-making. What's your specific use case - customer analytics, process optimization, recommendation systems, or something else?";
                } else if (userMessage.includes('automation')) {
                    responseMessage = "Process automation is incredibly valuable for businesses! AI can automate repetitive tasks, streamline workflows, and improve efficiency. What processes are you looking to automate - data entry, customer service, document processing, or something else?";
                } else {
                    responseMessage = "Hello! Welcome to Nazarban Analytics-FZCO. I'm excited to help you explore AI solutions for your project. Could you tell me more about your specific goals and what you're hoping to achieve with AI?";
                }
            } else {
                responseMessage = "That sounds like an interesting project! Could you share more details about your requirements, target users, and any specific features you have in mind? This will help me provide better guidance.";
            }
        }

        res.json({
            success: true,
            message: responseMessage,
            conversationStage: conversationStage,
            conversationComplete: false
        });

    } catch (error) {
        console.error('❌ Server Error:', error);
        res.status(500).json({
            success: false,
            message: "I apologize for the technical issue. Please try refreshing the page and sending your message again."
        });
    }
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 404 handler
app.use((req, res) => {
    console.log('❌ 404 - Route not found:', req.path);
    res.status(404).json({ error: 'Route not found', path: req.path });
});

// Error handler
app.use((error, req, res, next) => {
    console.error('❌ Server Error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
    console.log('\n🚀 Nazarban AI Chatbot Server Started!');
    console.log(`📱 Open: http://localhost:${PORT}`);
    console.log(`📁 Serving files from: ${path.join(__dirname, 'public')}`);
    console.log(`🔑 Claude API Key: ${process.env.CLAUDE_API_KEY ? '✅ Found' : '❌ Missing'}`);
    console.log(`📧 Zoho Email: ${process.env.ZOHO_EMAIL ? '✅ Found' : '❌ Missing'}`);
    console.log(`🔐 Zoho Password: ${process.env.ZOHO_APP_PASSWORD ? '✅ Found' : '❌ Missing'}`);
    console.log(`📮 Email System: ${emailTransporter ? '✅ Ready' : '❌ Not Ready'}`);
    console.log('\n💡 Test the server: http://localhost:3000/api/test\n');
});
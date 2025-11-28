# 🚀 Deployment Guide - Nazarban AI Chatbot

Complete guide for deploying your Nazarban AI Chatbot to production.

---

## 📋 Pre-Deployment Checklist

### ✅ Required Environment Variables

Make sure ALL of these are set in your hosting platform:

```bash
# === CRITICAL (app won't start without these) ===
NODE_ENV=production
JWT_SECRET=<your-64-character-random-secret>
ADMIN_PASSWORD=<strong-password-16+chars>
GOOGLE_API_KEY=<your-google-gemini-api-key>

# === Email Configuration ===
ZOHO_EMAIL=your-email@yourdomain.com
ZOHO_APP_PASSWORD=<zoho-app-specific-password>
TEAM_EMAIL=info@nazarbanai.com

# === Optional ===
PORT=3000
ARCHIVE_AFTER_DAYS=7
SENTRY_DSN=<your-sentry-dsn-for-error-monitoring>
```

### 🔐 Security Requirements

1. **JWT_SECRET**:
   - MUST be 32+ characters
   - Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
   - **NO angle brackets <>**, just the plain secret
   - Example: `a8f3c9d2e7b4f1a6c8d9e2f5a7b3c4d8e9f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5`

2. **ADMIN_PASSWORD**:
   - Minimum 16 characters
   - Mix of uppercase, lowercase, numbers, symbols
   - Don't use common passwords

---

## 🌐 Deployment Platforms

### 1. Render.com (Recommended)

**Step-by-Step:**

1. **Create New Web Service**
   - Go to https://render.com
   - Click "New" → "Web Service"
   - Connect your GitHub repository

2. **Configure Settings**
   ```
   Name: nazarban-ai-chatbot
   Region: Choose closest to users
   Branch: main (or your production branch)
   Root Directory: (leave blank)
   Runtime: Node
   Build Command: npm install
   Start Command: npm start
   ```

3. **Set Environment Variables**
   - Go to "Environment" tab
   - Add all required variables from `.env.example`
   - **IMPORTANT**: Copy values exactly, no quotes, no angle brackets

4. **Deploy**
   - Click "Create Web Service"
   - Wait for build to complete
   - Check logs for any errors

**Custom Domain:**
- Settings → Custom Domain → Add your domain
- Update DNS records as instructed
- SSL is automatic

---

### 2. Railway.app

**Quick Deploy:**

1. **Connect Repository**
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli

   # Login
   railway login

   # Initialize
   railway init

   # Deploy
   railway up
   ```

2. **Set Environment Variables**
   ```bash
   railway variables set NODE_ENV=production
   railway variables set JWT_SECRET=your-secret-here
   # ... set all other variables
   ```

3. **Generate Domain**
   - Go to Railway dashboard
   - Click "Generate Domain" or add custom domain

---

### 3. Heroku

**Deploy Steps:**

1. **Create App**
   ```bash
   heroku create nazarban-ai-chatbot
   ```

2. **Set Environment Variables**
   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set JWT_SECRET=your-secret-here
   heroku config:set ADMIN_PASSWORD=your-password
   # ... set all other variables
   ```

3. **Deploy**
   ```bash
   git push heroku main
   ```

4. **View Logs**
   ```bash
   heroku logs --tail
   ```

---

### 4. DigitalOcean App Platform

1. **Create App**
   - Go to App Platform
   - Connect GitHub repo
   - Choose region

2. **Configure**
   - Runtime: Node.js
   - Build Command: `npm install`
   - Run Command: `npm start`

3. **Environment Variables**
   - Add via dashboard
   - Encrypt sensitive values

---

### 5. VPS (Ubuntu/Linux)

**For Advanced Users:**

```bash
# 1. Connect to your server
ssh user@your-server-ip

# 2. Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Install PM2 (process manager)
sudo npm install -g pm2

# 4. Clone repository
git clone https://github.com/yourusername/nazarban-ai-chatbot.git
cd nazarban-ai-chatbot

# 5. Install dependencies
npm install --production

# 6. Create .env file
nano .env
# (Paste your environment variables)

# 7. Start with PM2
pm2 start server.js --name nazarban-ai
pm2 save
pm2 startup

# 8. Install Nginx (reverse proxy)
sudo apt install nginx

# 9. Configure Nginx
sudo nano /etc/nginx/sites-available/nazarban
```

**Nginx Configuration:**
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Enable SSL with Certbot:**
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

---

## 🔍 Post-Deployment Verification

### 1. Check Health Endpoint
```bash
curl https://yourdomain.com/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-...",
  "uptime": 123.45,
  "environment": "production"
}
```

### 2. Verify Security Headers
```bash
curl -I https://yourdomain.com
```

Should include:
```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
```

### 3. Test Admin Login
- Visit `https://yourdomain.com/admin`
- Login with your admin password
- Verify JWT authentication works

### 4. Test Rate Limiting
```bash
# Send 15 requests quickly (should get rate limited)
for i in {1..15}; do curl https://yourdomain.com/api/test; done
```

### 5. Check Logs
```bash
# Render
Check dashboard logs

# Railway
railway logs

# Heroku
heroku logs --tail

# VPS with PM2
pm2 logs nazarban-ai
```

---

## 📊 Monitoring Setup

### 1. Uptime Monitoring

**Free Options:**
- [UptimeRobot](https://uptimerobot.com/) - Monitor `/health` endpoint
- [Pingdom](https://www.pingdom.com/)
- [StatusCake](https://www.statuscake.com/)

**Configuration:**
- Monitor URL: `https://yourdomain.com/health`
- Check interval: 5 minutes
- Alert on: Response time > 5s or Status ≠ 200

### 2. Error Monitoring (Sentry)

```bash
# Install Sentry
npm install @sentry/node

# Set environment variable
SENTRY_DSN=https://your-sentry-dsn
```

Server will automatically detect and enable Sentry integration.

### 3. Application Monitoring

**Recommended Tools:**
- New Relic (APM)
- DataDog
- LogRocket
- Papertrail (logs)

---

## 🔄 Continuous Deployment

### GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run tests (if you have them)
        run: npm test

      - name: Deploy to Render
        run: |
          curl -X POST ${{ secrets.RENDER_DEPLOY_HOOK }}
```

---

## 💾 Backup Strategy

### Automated Daily Backups

```bash
# Run backup script
node scripts/backup.js

# Setup cron job (run daily at 3 AM)
crontab -e
```

Add:
```cron
0 3 * * * cd /path/to/nazarban-ai-chatbot && node scripts/backup.js
```

### Manual Backup

```bash
# Backup all data files
tar -czf backup-$(date +%Y%m%d).tar.gz \
  prompts.json \
  productsData.json \
  faqsData.json \
  blogPosts.json \
  *.json
```

---

## 🐛 Troubleshooting

### App Won't Start

**Check logs for:**
```
❌ CRITICAL ERROR: Missing required environment variables
```

**Solution**: Set all required env vars

---

### JWT_SECRET Too Short

**Error:**
```
❌ CRITICAL ERROR: JWT_SECRET must be at least 32 characters
```

**Solution**: Generate new secret with crypto:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

### Admin Login Not Working

**Symptoms**: 401 Unauthorized

**Checks:**
1. Admin password set correctly?
2. JWT_SECRET configured?
3. Cookies enabled in browser?
4. HTTPS enabled (required for secure cookies)?

---

### Rate Limit Errors

**Error**: `429 Too Many Requests`

**Solutions:**
- Wait 15 minutes
- Contact admin to whitelist your IP
- Adjust rate limits in `server.js` if legitimate traffic

---

### SSL/HTTPS Issues

**Redirect Loop:**
- Check `NODE_ENV=production` is set
- Verify platform proxy settings
- Check `X-Forwarded-Proto` header

**Mixed Content:**
- Ensure all assets use HTTPS URLs
- Update API calls to use relative URLs

---

## 📞 Support

**Issues?**
- Check [GitHub Issues](https://github.com/yourusername/nazarban-ai-chatbot/issues)
- Review server logs
- Check health endpoint
- Verify all env vars are set

---

## 🔐 Security Best Practices

1. ✅ Always use HTTPS in production
2. ✅ Never commit `.env` file
3. ✅ Rotate JWT_SECRET every 6 months
4. ✅ Use strong admin password
5. ✅ Enable rate limiting
6. ✅ Monitor error logs
7. ✅ Keep dependencies updated
8. ✅ Regular backups
9. ✅ Use environment-specific configs
10. ✅ Enable 2FA on hosting platform

---

**Last Updated**: 2025-01-28
**Version**: 2.0.0

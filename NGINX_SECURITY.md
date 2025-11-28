# 🔧 Nginx Configuration Guide - Hide Server Version

This guide shows how to hide the Nginx version from HTTP headers for better security.

---

## 🎯 Why Hide Nginx Version?

**Current header:**
```
Server: nginx/1.24.0 (Ubuntu)
```

**Should be:**
```
Server: nginx
```

**Benefit**: Attackers can't easily identify vulnerabilities specific to your Nginx version.

---

## 📝 Instructions

### Option 1: Hide Version in nginx.conf (Recommended)

**1. SSH into your server:**
```bash
ssh root@your-server
```

**2. Edit main nginx config:**
```bash
sudo nano /etc/nginx/nginx.conf
```

**3. Add this line in the `http` block:**
```nginx
http {
    # ... other settings ...

    # Hide nginx version
    server_tokens off;

    # ... rest of config ...
}
```

**4. Test nginx config:**
```bash
sudo nginx -t
```

**5. Reload nginx:**
```bash
sudo systemctl reload nginx
```

---

### Option 2: Add to Site Config

Alternatively, add to your site's config file:

**1. Edit site config:**
```bash
sudo nano /etc/nginx/sites-available/nazarbanai.com
```

**2. Add in `server` block:**
```nginx
server {
    # ... other settings ...

    # Hide nginx version
    server_tokens off;

    # ... rest of config ...
}
```

**3. Test and reload:**
```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## ✅ Verify It Works

**Test from your computer:**
```bash
curl -I https://nazarbanai.com
```

**Before:**
```
Server: nginx/1.24.0 (Ubuntu)
```

**After:**
```
Server: nginx
```

---

## 🔒 Complete Nginx Security Config

Here's a complete security-hardened nginx config for your site:

```nginx
# /etc/nginx/sites-available/nazarbanai.com

# HTTP → HTTPS Redirect
server {
    listen 80;
    listen [::]:80;
    server_name nazarbanai.com www.nazarbanai.com;

    # Hide version
    server_tokens off;

    # Redirect all HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

# HTTPS Server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name nazarbanai.com www.nazarbanai.com;

    # Hide nginx version
    server_tokens off;

    # SSL Configuration (if using Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/nazarbanai.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/nazarbanai.com/privkey.pem;

    # SSL Security Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers (backup - Node.js already sets these)
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Proxy to Node.js app
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;

        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';

        # Proxy headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # Cache bypass
        proxy_cache_bypass $http_upgrade;
    }

    # Static files caching (optional optimization)
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://localhost:3000;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Deny access to hidden files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
}
```

---

## 🔍 Additional Security Tweaks

### 1. Disable Unused HTTP Methods
```nginx
server {
    # ... other config ...

    # Only allow GET, POST, HEAD
    if ($request_method !~ ^(GET|POST|HEAD)$ ) {
        return 405;
    }
}
```

### 2. Rate Limiting (if not using Node.js rate limiting)
```nginx
http {
    # Define rate limit zone
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

    server {
        # Apply rate limit
        location /api/ {
            limit_req zone=api_limit burst=20 nodelay;
            proxy_pass http://localhost:3000;
        }
    }
}
```

### 3. Block Bad Bots
```nginx
server {
    # Block bad user agents
    if ($http_user_agent ~* (bot|crawler|spider|scraper)) {
        return 403;
    }
}
```

---

## 📊 Test Your Changes

**1. Test nginx config:**
```bash
sudo nginx -t
```

**2. Reload nginx:**
```bash
sudo systemctl reload nginx
```

**3. Check server header:**
```bash
curl -I https://nazarbanai.com | grep Server
```

Should show: `Server: nginx` (no version)

---

## 🚨 Troubleshooting

### Config Test Fails
```bash
# See detailed error
sudo nginx -t

# Check syntax
sudo nginx -T | grep -A 10 error
```

### Changes Don't Apply
```bash
# Restart nginx (instead of reload)
sudo systemctl restart nginx

# Check if nginx is running
sudo systemctl status nginx
```

### Still Shows Version
```bash
# Make sure you added to correct file
grep -r "server_tokens" /etc/nginx/

# Check main config
cat /etc/nginx/nginx.conf | grep server_tokens
```

---

## ✅ Security Checklist After Changes

- [ ] `server_tokens off;` added
- [ ] Nginx config test passed
- [ ] Nginx reloaded successfully
- [ ] Version hidden in headers
- [ ] Site still works correctly
- [ ] HTTPS redirect works
- [ ] SSL certificate valid

---

**Last Updated**: 2025-01-28
**For**: Nazarban AI Chatbot v2.0

# 🔒 Security Testing Guide - Nazarban AI Chatbot

Complete guide to test all security features of your application.

---

## 🎯 Quick Security Tests

### 1. Test HTTPS Redirect
```bash
# Should redirect to HTTPS
curl -I http://nazarbanai.com

# Expected: 301 Moved Permanently
# Location: https://nazarbanai.com/
```

### 2. Test Security Headers
```bash
# Check all security headers
curl -I https://nazarbanai.com

# Expected headers:
# - Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
# - X-Content-Type-Options: nosniff
# - X-Frame-Options: DENY
# - Referrer-Policy: strict-origin-when-cross-origin
# - Content-Security-Policy: ...
```

### 3. Test Health Endpoint
```bash
# Public health check
curl https://nazarbanai.com/health

# Expected:
# {
#   "status": "healthy",
#   "timestamp": "2025-01-28T...",
#   "uptime": 123.45,
#   "environment": "production"
# }
```

### 4. Test Rate Limiting - Chat
```bash
# Send 15 requests quickly (limit is 10/min)
for i in {1..15}; do
  curl -X POST https://nazarbanai.com/api/chat \
    -H "Content-Type: application/json" \
    -d '{"message":"test","conversationHistory":[],"language":"en"}'
  echo ""
done

# Expected: First 10 succeed, then get 429 Too Many Requests
```

### 5. Test Rate Limiting - Login
```bash
# Try 6 failed logins (limit is 5/15min)
for i in {1..6}; do
  curl -X POST https://nazarbanai.com/api/admin/verify-login \
    -H "Content-Type: application/json" \
    -d '{"password":"wrong"}' \
    -c cookies.txt
  echo ""
done

# Expected: First 5 fail with 401, 6th gets 429 Too Many Requests
```

### 6. Test Admin Authentication
```bash
# Try to access admin endpoint without auth
curl https://nazarbanai.com/api/status

# Expected: 401 Unauthorized
# {
#   "success": false,
#   "message": "Authentication required. Please log in."
# }
```

### 7. Test JWT Authentication
```bash
# Login and get JWT cookie
curl -X POST https://nazarbanai.com/api/admin/verify-login \
  -H "Content-Type: application/json" \
  -d '{"password":"YOUR_ADMIN_PASSWORD"}' \
  -c cookies.txt -v

# Should set: Set-Cookie: adminToken=...

# Now use the cookie to access admin endpoint
curl https://nazarbanai.com/api/status \
  -b cookies.txt

# Expected: 200 OK with system status
```

### 8. Test CORS Protection
```bash
# Try from unauthorized origin
curl https://nazarbanai.com/api/test \
  -H "Origin: https://evil-site.com" \
  -v

# Expected: No CORS headers or error
```

---

## 🔍 Detailed Security Tests

### A. XSS Protection Test

**1. Test HTML Injection in Chat**
```bash
curl -X POST https://nazarbanai.com/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "<script>alert('XSS')</script>",
    "conversationHistory": [],
    "language": "en"
  }'

# Expected: Script tags should be escaped or sanitized
```

**2. Test in Admin Panel**
- Login to `/admin`
- Try creating product with name: `<img src=x onerror=alert('XSS')>`
- Check if it's properly escaped in the UI

### B. SQL Injection (N/A)
**Status**: Not applicable (no SQL database)

### C. JWT Security Test

**1. Test Invalid JWT**
```bash
# Set invalid JWT cookie
curl https://nazarbanai.com/api/status \
  -H "Cookie: adminToken=invalid.jwt.token"

# Expected: 401 Unauthorized
```

**2. Test Expired JWT**
```bash
# Login, wait 25 hours, try to use cookie
# Expected: 401 Unauthorized
```

**3. Test JWT without httpOnly**
```bash
# Check cookie flags
curl -X POST https://nazarbanai.com/api/admin/verify-login \
  -H "Content-Type: application/json" \
  -d '{"password":"YOUR_PASSWORD"}' \
  -c - -v

# Expected: Set-Cookie with HttpOnly; Secure; SameSite=Strict
```

### D. CSRF Protection Test

**1. Test Cross-Origin POST**
Create HTML file:
```html
<!-- evil.html -->
<form action="https://nazarbanai.com/api/products" method="POST">
  <input name="nameEn" value="Evil Product">
  <input name="password" value="guess">
</form>
<script>document.forms[0].submit();</script>
```

Open in browser:
- Expected: Blocked by CORS or SameSite cookie

### E. Brute Force Protection

**1. Test Login Brute Force**
```bash
# Try 20 login attempts
for i in {1..20}; do
  echo "Attempt $i:"
  curl -X POST https://nazarbanai.com/api/admin/verify-login \
    -H "Content-Type: application/json" \
    -d '{"password":"wrong'$i'"}'
  sleep 1
done

# Expected: Rate limited after 5 attempts
```

**2. Test Chat Spam**
```bash
# Try 60 messages in 1 minute
for i in {1..60}; do
  echo "Message $i:"
  curl -X POST https://nazarbanai.com/api/chat \
    -H "Content-Type: application/json" \
    -d '{"message":"spam'$i'","conversationHistory":[]}'
  sleep 1
done

# Expected: Rate limited after 10 messages/min
```

---

## 🛡️ Advanced Security Tests

### 1. SSL/TLS Configuration
```bash
# Test SSL configuration
curl https://www.ssllabs.com/ssltest/analyze.html?d=nazarbanai.com

# Or use:
nmap --script ssl-enum-ciphers -p 443 nazarbanai.com
```

### 2. Security Headers Analysis
```bash
# Use security header scanner
curl https://securityheaders.com/?q=nazarbanai.com&followRedirects=on
```

### 3. Port Scanning
```bash
# Check open ports
nmap -p- nazarbanai.com

# Expected: Only 80 (HTTP) and 443 (HTTPS) open
```

### 4. Directory Traversal
```bash
# Try to access parent directories
curl https://nazarbanai.com/../../../etc/passwd
curl https://nazarbanai.com/api/../../../server.js

# Expected: 404 or blocked
```

### 5. Server Information Leakage
```bash
# Check for server version in headers
curl -I https://nazarbanai.com

# Expected: No X-Powered-By header (removed by Helmet)
```

---

## 📊 Security Checklist

Run through this checklist:

### Infrastructure Security
- [ ] HTTPS enabled and enforced
- [ ] Valid SSL certificate (not self-signed)
- [ ] HSTS header present
- [ ] HTTP redirects to HTTPS
- [ ] No server version leaked
- [ ] Only necessary ports open (80, 443)

### Authentication & Authorization
- [ ] Admin panel requires password
- [ ] JWT tokens in httpOnly cookies
- [ ] JWT tokens expire after 24h
- [ ] Secure cookie flag in production
- [ ] SameSite cookie attribute set
- [ ] Login rate limited (5/15min)
- [ ] Admin endpoints require JWT

### API Security
- [ ] Rate limiting on all API routes
- [ ] Chat limited to 10 msg/min
- [ ] General API limited to 100 req/15min
- [ ] Daily message limit (1000/day)
- [ ] Session limit (50 msg/hour)
- [ ] CORS properly configured
- [ ] Only whitelisted origins allowed

### Input Validation
- [ ] Message length limited (500 chars)
- [ ] Email validation working
- [ ] URL validation for video links
- [ ] File upload size limited (5MB)
- [ ] File type validation (images only)
- [ ] Honeypot field for bot detection

### Security Headers
- [ ] X-Frame-Options: DENY
- [ ] X-Content-Type-Options: nosniff
- [ ] Referrer-Policy set
- [ ] Content-Security-Policy configured
- [ ] HSTS with preload

### Data Protection
- [ ] Environment variables secure
- [ ] JWT_SECRET not exposed
- [ ] Admin password strong (16+ chars)
- [ ] Backups configured
- [ ] Sensitive data not logged

### Error Handling
- [ ] Production errors don't leak stack traces
- [ ] Error monitoring enabled
- [ ] Graceful shutdown implemented
- [ ] Health check endpoint working
- [ ] Logs accessible but secure

---

## 🚨 Vulnerability Testing Tools

### Online Tools (No Installation)

1. **SSL Labs** - https://www.ssllabs.com/ssltest/
   - Tests SSL/TLS configuration
   - Checks certificate validity
   - Scores A+ to F

2. **Security Headers** - https://securityheaders.com/
   - Analyzes HTTP security headers
   - Scores A+ to F
   - Provides recommendations

3. **Observatory by Mozilla** - https://observatory.mozilla.org/
   - Comprehensive security scan
   - Checks headers, cookies, CSP
   - Detailed report

4. **ImmuniWeb** - https://www.immuniweb.com/ssl/
   - SSL/TLS and PCI DSS compliance
   - Free tier available

### CLI Tools (Install if needed)

1. **OWASP ZAP** (Zed Attack Proxy)
```bash
# Run automated scan
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t https://nazarbanai.com
```

2. **Nikto** (Web server scanner)
```bash
nikto -h https://nazarbanai.com
```

3. **Nmap** (Port scanner)
```bash
nmap -sV -sC nazarbanai.com
```

---

## 📈 Expected Results

After running all tests, you should see:

### ✅ Passing Tests
- HTTPS redirect working
- All security headers present
- Rate limiting active
- JWT authentication working
- CORS blocking unauthorized origins
- Health check responding
- Admin panel protected

### ⚠️ Known Limitations
- File-based storage (not as secure as database)
- No 2FA for admin (roadmap item)
- Client-side rendering (some data in HTML)

### 🎯 Security Score Targets
- **SSL Labs**: A or A+
- **Security Headers**: A or A+
- **Mozilla Observatory**: B+ or higher

---

## 🔄 Regular Security Maintenance

### Weekly
- [ ] Check error logs
- [ ] Review admin access logs
- [ ] Monitor rate limit hits

### Monthly
- [ ] Run `npm audit`
- [ ] Update dependencies
- [ ] Review backup integrity
- [ ] Test disaster recovery

### Quarterly
- [ ] Full security scan (ZAP, Nikto)
- [ ] Rotate JWT_SECRET
- [ ] Review and update CORS whitelist
- [ ] Penetration testing

---

## 📞 Report Security Issues

**Found a vulnerability?**

1. **DO NOT** open a public issue
2. Email: security@nazarbanai.com
3. Include: Steps to reproduce, impact assessment
4. Expect: Response within 48 hours

---

**Last Updated**: 2025-01-28
**Security Version**: 2.0.0

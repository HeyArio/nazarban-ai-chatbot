# 🔐 Security Documentation - Nazarban AI Chatbot

This document outlines the security measures implemented in the Nazarban AI Chatbot and best practices for maintaining security in production.

---

## 🛡️ Security Features Implemented

### 1. **Authentication & Authorization**

#### JWT-Based Admin Authentication
- **HttpOnly Cookies**: JWT tokens stored in httpOnly cookies (not accessible via JavaScript)
- **Secure Flag**: Cookies only sent over HTTPS in production
- **SameSite Protection**: CSRF protection via `sameSite: strict`
- **24-Hour Expiry**: Tokens automatically expire after 24 hours
- **No Fallback Secrets**: Application fails to start if JWT_SECRET not set

**Implementation**: `server.js:176-196`

#### Password Protection
- Admin password validation on all protected endpoints
- No hardcoded passwords
- Environment variable validation at startup

---

### 2. **Rate Limiting**

Protects against brute force attacks and API abuse:

| Endpoint Type | Limit | Window | Purpose |
|--------------|-------|---------|---------|
| General API | 100 req | 15 min | Prevent API abuse |
| Chat | 10 msg | 1 min | Prevent spam |
| Login | 5 attempts | 15 min | Prevent brute force |
| Session | 50 msg | 1 hour | Prevent bot abuse |
| Daily | 1000 msg | 24 hours | Cost protection |

**Implementation**: `server.js:106-141`

---

### 3. **HTTPS Enforcement**

#### Production Redirect
- Automatic HTTP → HTTPS redirect in production
- Trusts proxy headers (`X-Forwarded-Proto`)
- 301 Permanent Redirect status

**Implementation**: `server.js:65-76`

#### HSTS Header
```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```
- Forces HTTPS for 1 year
- Includes all subdomains
- Ready for HSTS preload list

---

### 4. **Security Headers (Helmet.js)**

Protects against common web vulnerabilities:

| Header | Protection | Value |
|--------|-----------|--------|
| X-Frame-Options | Clickjacking | DENY |
| X-Content-Type-Options | MIME sniffing | nosniff |
| X-XSS-Protection | XSS attacks | 1; mode=block |
| Referrer-Policy | Info leakage | strict-origin-when-cross-origin |
| HSTS | Force HTTPS | max-age=31536000 |

**Content Security Policy (CSP)**:
```javascript
{
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'", "'unsafe-inline'", "trusted-cdns"],
  styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
  imgSrc: ["'self'", "data:", "https:", "http:"],
  frameSrc: ["'none'"],
  objectSrc: ["'none'"]
}
```

**Implementation**: `server.js:94-116`

---

### 5. **CORS Protection**

#### Whitelist-Based Origin Control
```javascript
Allowed Origins:
- https://nazarbanai.com
- https://www.nazarbanai.com
- http://localhost:3000 (dev only)
```

#### Features:
- Blocks unauthorized origins
- Logs blocked requests
- Credentials support for admin panel
- Preflight request handling

**Implementation**: `server.js:118-141`

---

### 6. **Input Validation & Sanitization**

#### Message Validation
- Maximum length: 500 characters
- HTML escaping utility available
- Honeypot field for bot detection

#### Email Validation
- Regex pattern matching
- Sanitization utility
- Duplicate prevention

#### URL Validation
- Protocol whitelisting (http/https only)
- URL parsing validation
- XSS prevention

**Implementation**: `utils/sanitize.js`

---

### 7. **XSS Protection**

#### Server-Side Measures
- Content Security Policy (CSP)
- HTML escaping utilities
- Input sanitization middleware

#### Client-Side Measures
- Avoid `innerHTML` where possible
- Use `textContent` for user input
- DOMPurify ready (optional dependency)

**Utility Functions**: `utils/sanitize.js`

---

### 8. **CSRF Protection**

#### Current Measures:
- JWT in httpOnly cookies
- SameSite cookie attribute
- Origin validation
- Custom headers

#### Additional Options (if needed):
```javascript
// Install: npm install csurf
const csrf = require('csurf');
app.use(csrf({ cookie: true }));
```

---

### 9. **Environment Variable Security**

#### Startup Validation
```javascript
Required Variables:
✓ JWT_SECRET (min 32 chars)
✓ ADMIN_PASSWORD
✓ GOOGLE_API_KEY
✓ NODE_ENV
```

#### Best Practices:
- ✅ Never commit `.env` file
- ✅ Use `.env.example` for reference
- ✅ Validate on startup
- ✅ Fail fast if missing
- ✅ No default fallbacks for secrets

**Implementation**: `server.js:17-53`

---

### 10. **Error Handling & Logging**

#### Production Error Handling
- Generic error messages (no stack traces)
- Structured error logging
- Optional Sentry integration

#### Request Logging
- Morgan middleware
- Production: errors only
- Development: detailed logs

**Implementation**: `server.js:78-89, 2360-2393`

---

### 11. **Graceful Shutdown**

Handles:
- SIGTERM
- SIGINT
- SIGHUP
- Uncaught exceptions
- Unhandled promise rejections

**Features**:
- Closes server connections
- Saves pending data
- 30-second timeout
- Clean exit

**Implementation**: `server.js:2422-2477`

---

## 🚨 Common Vulnerabilities & Mitigations

### SQL Injection
**Status**: ✅ Not Applicable
- **Reason**: No SQL database used (JSON files)
- **Note**: If migrating to SQL, use parameterized queries

### NoSQL Injection
**Status**: ✅ Not Applicable
- **Reason**: No MongoDB/NoSQL database
- **Note**: If adding NoSQL, sanitize all inputs

### Command Injection
**Status**: ✅ Protected
- **Mitigation**: No user input executed as shell commands
- **Safe**: Using child_process with validated inputs only

### Path Traversal
**Status**: ✅ Protected
- **Mitigation**: Using `path.join()` for all file operations
- **Validation**: No user-controlled file paths

### XXE (XML External Entity)
**Status**: ✅ Not Applicable
- **Reason**: No XML parsing

### Insecure Deserialization
**Status**: ✅ Protected
- **Mitigation**: Using `JSON.parse()` safely
- **Validation**: No `eval()` or unsafe deserialization

### Server-Side Request Forgery (SSRF)
**Status**: ⚠️ Partial
- **Risk**: Admin can set video URLs
- **Mitigation**: URL validation utility available
- **Recommendation**: Whitelist video hosting domains

---

## 🔒 Security Best Practices

### Development
- [ ] Never commit secrets
- [ ] Use `.env.example` for documentation
- [ ] Keep dependencies updated
- [ ] Run `npm audit` regularly
- [ ] Use HTTPS in development
- [ ] Test security features locally

### Production
- [ ] Use environment variables
- [ ] Enable HTTPS
- [ ] Set `NODE_ENV=production`
- [ ] Rotate JWT secret every 6 months
- [ ] Monitor error logs
- [ ] Enable Sentry or similar
- [ ] Regular backups
- [ ] Update dependencies monthly

### Admin Panel
- [ ] Use strong password (16+ chars)
- [ ] Change default admin password
- [ ] Enable 2FA on hosting platform
- [ ] Restrict admin access by IP (optional)
- [ ] Review admin actions regularly
- [ ] Use password manager

---

## 🔍 Security Checklist

### Pre-Deployment
- [ ] All environment variables set
- [ ] JWT_SECRET is 32+ characters
- [ ] ADMIN_PASSWORD is strong
- [ ] NODE_ENV=production
- [ ] HTTPS configured
- [ ] Security headers verified
- [ ] Rate limiting tested
- [ ] CORS configured correctly
- [ ] Error monitoring setup
- [ ] Backup strategy in place

### Post-Deployment
- [ ] Health check responding
- [ ] HTTPS redirect working
- [ ] Admin login functional
- [ ] Rate limiting active
- [ ] Security headers present
- [ ] Logs accessible
- [ ] Monitoring alerts configured
- [ ] Backup script scheduled

---

## 🚫 Known Limitations

### 1. **File-Based Storage**
- **Issue**: JSON files not as secure as database
- **Risk**: Data loss if server crashes during write
- **Mitigation**: Regular backups, atomic writes
- **Future**: Migrate to PostgreSQL/MongoDB

### 2. **Client-Side Rendering**
- **Issue**: Some admin data visible in page source
- **Risk**: Low (protected by auth)
- **Mitigation**: Server-side validation on all changes

### 3. **No 2FA for Admin**
- **Issue**: Password-only authentication
- **Risk**: Medium (mitigated by rate limiting)
- **Future**: Add TOTP/SMS 2FA

### 4. **Session Storage**
- **Issue**: Client-side auth flag
- **Risk**: Low (server validates all requests)
- **Mitigation**: Server-side JWT validation (implemented)

---

## 📊 Security Metrics

### Response to Security Events

| Event | Detection Time | Response Time | Mitigation |
|-------|---------------|---------------|-----------|
| Brute Force | Real-time | Immediate | Rate limiting |
| SQL Injection | N/A | N/A | Not applicable |
| XSS Attempt | Real-time | Logged | CSP, sanitization |
| CSRF | Real-time | Blocked | SameSite, tokens |
| DDoS | <1 min | Auto | Rate limiting |

---

## 🔄 Security Update Policy

### Dependency Updates
- **Critical**: Within 24 hours
- **High**: Within 7 days
- **Medium**: Within 30 days
- **Low**: Next scheduled update

### Check for Updates
```bash
# Check for security vulnerabilities
npm audit

# Fix automatically (if possible)
npm audit fix

# Update all dependencies
npm update

# Check outdated packages
npm outdated
```

---

## 📞 Reporting Security Issues

**Found a vulnerability?**

**DO NOT** open a public issue.

Instead:
1. Email: security@nazarbanai.com
2. Include: Detailed description, steps to reproduce
3. Wait for: Acknowledgment within 48 hours
4. Expect: Fix deployed within 7 days for critical issues

**We appreciate responsible disclosure.**

---

## 📚 Additional Resources

### Guides
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)

### Tools
- [npm audit](https://docs.npmjs.com/cli/v8/commands/npm-audit)
- [Snyk](https://snyk.io/)
- [OWASP ZAP](https://www.zaproxy.org/)
- [SSL Labs](https://www.ssllabs.com/ssltest/)

---

**Last Updated**: 2025-01-28
**Security Version**: 2.0.0
**Maintainer**: Nazarban Analytics-FZCO

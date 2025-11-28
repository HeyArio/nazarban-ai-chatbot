#!/bin/bash

# Security Testing Script for Nazarban AI Chatbot
# Tests all security headers and protections

echo "🔒 Nazarban AI Security Test Suite"
echo "=================================="
echo ""

SITE_URL="https://nazarbanai.com"

# Test 1: Security Headers
echo "📋 Test 1: Security Headers"
echo "----------------------------"
curl -I "$SITE_URL" 2>/dev/null | grep -E "(X-Frame-Options|X-Content-Type-Options|Strict-Transport-Security|Content-Security-Policy|X-XSS-Protection)"
echo ""

# Test 2: HSTS Header
echo "🔐 Test 2: HSTS (Force HTTPS)"
echo "----------------------------"
curl -I "$SITE_URL" 2>/dev/null | grep "Strict-Transport-Security"
echo ""

# Test 3: CSP Header
echo "🛡️  Test 3: Content Security Policy"
echo "----------------------------"
curl -I "$SITE_URL" 2>/dev/null | grep "Content-Security-Policy"
echo ""

# Test 4: Rate Limiting
echo "⏱️  Test 4: Rate Limiting (Chat Endpoint)"
echo "----------------------------"
echo "Sending 11 rapid requests..."
for i in {1..11}; do
    RESPONSE=$(curl -s -X POST "$SITE_URL/api/chat" \
        -H "Content-Type: application/json" \
        -d '{"message":"test","language":"en"}' 2>&1)

    if echo "$RESPONSE" | grep -q "Too many requests\|Please slow down"; then
        echo "✅ Rate limit triggered at request #$i"
        break
    elif [ $i -eq 11 ]; then
        echo "❌ Rate limit NOT working (sent 11 requests without blocking)"
    fi
done
echo ""

# Test 5: Admin Authentication
echo "🔑 Test 5: Admin Endpoint Protection"
echo "----------------------------"
RESPONSE=$(curl -s -X POST "$SITE_URL/api/articles/custom" \
    -H "Content-Type: application/json" \
    -d '{"articles":[]}')

if echo "$RESPONSE" | grep -q "Authentication required\|Invalid or expired token"; then
    echo "✅ Admin endpoints are protected"
else
    echo "❌ WARNING: Admin endpoints may be exposed!"
fi
echo ""

# Test 6: CORS Policy
echo "🌐 Test 6: CORS Protection"
echo "----------------------------"
RESPONSE=$(curl -s -X OPTIONS "$SITE_URL/api/chat" \
    -H "Origin: https://evil-site.com" \
    -H "Access-Control-Request-Method: POST" \
    -v 2>&1)

if echo "$RESPONSE" | grep -q "Access-Control-Allow-Origin"; then
    echo "⚠️  CORS headers present (check if origin is restricted)"
else
    echo "✅ CORS blocking suspicious origins"
fi
echo ""

# Test 7: Long Message Blocking
echo "📏 Test 7: Message Length Limit"
echo "----------------------------"
LONG_MESSAGE=$(python3 -c "print('a' * 501)")
RESPONSE=$(curl -s -X POST "$SITE_URL/api/chat" \
    -H "Content-Type: application/json" \
    -d "{\"message\":\"$LONG_MESSAGE\",\"language\":\"en\"}")

if echo "$RESPONSE" | grep -q "too long\|Message too long"; then
    echo "✅ Long messages are blocked"
else
    echo "❌ Long message limit NOT working"
fi
echo ""

# Test 8: Honeypot Bot Detection
echo "🍯 Test 8: Honeypot Bot Detection"
echo "----------------------------"
RESPONSE=$(curl -s -X POST "$SITE_URL/api/chat" \
    -H "Content-Type: application/json" \
    -d '{"message":"test","language":"en","honeypot":"bot-filled-this"}')

if echo "$RESPONSE" | grep -q "Invalid request"; then
    echo "✅ Honeypot is catching bots"
else
    echo "❌ Honeypot NOT working"
fi
echo ""

# Test 9: JSON Size Limit
echo "💾 Test 9: Request Size Limit"
echo "----------------------------"
BIG_JSON=$(python3 -c "print('{\"message\":\"' + 'x'*2000000 + '\",\"language\":\"en\"}')")
RESPONSE=$(curl -s -X POST "$SITE_URL/api/chat" \
    -H "Content-Type: application/json" \
    -d "$BIG_JSON" 2>&1)

if echo "$RESPONSE" | grep -q "request entity too large\|413\|PayloadTooLargeError"; then
    echo "✅ Large request payloads are blocked"
else
    echo "⚠️  Request size limit may not be enforced"
fi
echo ""

echo "=================================="
echo "✅ Security test suite completed!"
echo "=================================="

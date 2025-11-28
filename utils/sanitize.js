/**
 * Input Sanitization Utilities
 * Provides XSS protection for user inputs
 */

/**
 * Basic HTML escape to prevent XSS
 * Converts dangerous characters to HTML entities
 */
function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return unsafe;

    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;")
        .replace(/\//g, "&#x2F;");
}

/**
 * Sanitize object properties recursively
 * Useful for sanitizing request bodies
 */
function sanitizeObject(obj) {
    if (obj === null || obj === undefined) return obj;

    if (typeof obj === 'string') {
        return escapeHtml(obj);
    }

    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item));
    }

    if (typeof obj === 'object') {
        const sanitized = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                sanitized[key] = sanitizeObject(obj[key]);
            }
        }
        return sanitized;
    }

    return obj;
}

/**
 * Validate and sanitize email
 */
function sanitizeEmail(email) {
    if (typeof email !== 'string') return '';

    // Remove any HTML
    email = escapeHtml(email.trim());

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return '';
    }

    return email.toLowerCase();
}

/**
 * Sanitize URL (basic validation)
 */
function sanitizeUrl(url) {
    if (typeof url !== 'string') return '';

    url = url.trim();

    // Only allow http and https protocols
    if (!url.match(/^https?:\/\//i)) {
        return '';
    }

    try {
        const urlObj = new URL(url);
        return urlObj.href;
    } catch (e) {
        return '';
    }
}

/**
 * Strip all HTML tags from input
 */
function stripHtml(html) {
    if (typeof html !== 'string') return html;

    return html.replace(/<[^>]*>/g, '');
}

/**
 * Limit string length (prevent DoS through large inputs)
 */
function limitLength(str, maxLength = 1000) {
    if (typeof str !== 'string') return str;

    if (str.length > maxLength) {
        return str.substring(0, maxLength);
    }

    return str;
}

module.exports = {
    escapeHtml,
    sanitizeObject,
    sanitizeEmail,
    sanitizeUrl,
    stripHtml,
    limitLength
};

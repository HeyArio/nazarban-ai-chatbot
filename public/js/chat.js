/*
  Nazarban Analytics - Chat Page JavaScript
  Handles:
  - Sending/Receiving Messages
  - Typing Indicator
  - Message Bubbles
*/

let conversationHistory = [];
let userEmail = null;
let conversationStage = 'initial';
let messageCount = 0;
let emailPopupShown = false;

// =====================================================
// EMAIL POPUP FUNCTIONALITY
// =====================================================

const EMAIL_POPUP_TRIGGER_COUNT = 3; // Show popup after this many message exchanges

function initEmailPopup() {
  const overlay = document.getElementById('emailPopupOverlay');
  const closeBtn = document.getElementById('emailPopupClose');
  const form = document.getElementById('emailPopupForm');
  const input = document.getElementById('emailPopupInput');

  console.log('📧 Email popup init - overlay found:', !!overlay, 'closeBtn:', !!closeBtn, 'form:', !!form);

  if (!overlay || !closeBtn || !form) {
    console.log('❌ Email popup elements not found');
    return;
  }

  // Check if already dismissed or email already collected
  const dismissed = localStorage.getItem('emailPopupDismissed');
  const collected = localStorage.getItem('userEmailCollected');

  if (dismissed || collected) {
    console.log('📧 Email popup blocked - dismissed:', dismissed, 'collected:', collected);
    emailPopupShown = true;
    return;
  }

  console.log('✅ Email popup initialized and ready');

  // Close button handler
  closeBtn.addEventListener('click', () => {
    hideEmailPopup();
    localStorage.setItem('emailPopupDismissed', 'true');
  });

  // Click outside to close
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      hideEmailPopup();
      localStorage.setItem('emailPopupDismissed', 'true');
    }
  });

  // Escape key to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('active')) {
      hideEmailPopup();
      localStorage.setItem('emailPopupDismissed', 'true');
    }
  });

  // Form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = input.value.trim();

    if (email && isValidEmail(email)) {
      userEmail = email;
      localStorage.setItem('userEmailCollected', email);

      // Send email to server with conversation history
      const currentLang = localStorage.getItem('preferredLanguage') || 'fa';
      try {
        await fetch('/api/collect-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            source: 'popup',
            conversationHistory,
            language: currentLang
          })
        });
      } catch (err) {
        console.error('Failed to save email:', err);
      }

      // Show success feedback
      showEmailSuccess();

      // Hide popup after delay
      setTimeout(() => {
        hideEmailPopup();
      }, 2000);
    }
  });
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function showEmailPopup() {
  if (emailPopupShown) return;

  const overlay = document.getElementById('emailPopupOverlay');
  if (!overlay) return;

  emailPopupShown = true;
  overlay.classList.add('active');

  // Focus input after animation
  setTimeout(() => {
    const input = document.getElementById('emailPopupInput');
    if (input) input.focus();
  }, 300);
}

function hideEmailPopup() {
  const overlay = document.getElementById('emailPopupOverlay');
  if (!overlay) return;

  overlay.classList.remove('active');
}

function showEmailSuccess() {
  const popup = document.querySelector('.email-popup');
  if (!popup) return;

  const currentLang = localStorage.getItem('preferredLanguage') || 'fa';
  const successMsg = currentLang === 'fa' ? 'با تشکر! ایمیل شما ثبت شد.' : 'Thank you! We\'ll be in touch.';

  popup.innerHTML = `
    <div class="email-popup-success active">
      <div class="email-popup-success-icon">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <h3 class="email-popup-title">${successMsg}</h3>
    </div>
  `;
}

function checkEmailPopupTrigger() {
  console.log('📧 Checking popup trigger - messageCount:', messageCount, 'threshold:', EMAIL_POPUP_TRIGGER_COUNT, 'alreadyShown:', emailPopupShown);

  // Only trigger after X message exchanges and if not already shown
  if (messageCount >= EMAIL_POPUP_TRIGGER_COUNT && !emailPopupShown) {
    console.log('🎯 Triggering email popup!');
    // Small delay to let the bot response appear first
    setTimeout(() => {
      showEmailPopup();
    }, 1500);
  }
}

// Initialize popup on page load
document.addEventListener('DOMContentLoaded', initEmailPopup);

// =====================================================
// END EMAIL POPUP FUNCTIONALITY
// =====================================================

const messagesContainer = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');

// =====================================================
// TRANSLATION HELPER FOR CHAT MESSAGES
// =====================================================

function getChatTranslation(key) {
  const currentLang = localStorage.getItem('preferredLanguage') || 'fa';
  if (window.translations && window.translations[currentLang] && window.translations[currentLang][key]) {
    return window.translations[currentLang][key];
  }
  // Fallback to key if translation not found
  return key;
}

// =====================================================
// END TRANSLATION HELPER
// =====================================================


if (messageInput) {
  // Auto-resize textarea
  messageInput.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 140) + 'px';
  });

  // Send on Enter (Shift+Enter for newline)
  messageInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
}

if (sendButton) {
  sendButton.addEventListener('click', sendMessage);
}

// =====================================================
// SUGGESTION PILLS FUNCTIONALITY
// =====================================================

function createSuggestionPills() {
  // Check if welcome section exists (means no messages yet)
  const welcomeSection = document.querySelector('.welcome-section');
  if (!welcomeSection) return;

  // Check if pills already exist
  if (document.querySelector('.suggestion-pills')) return;

  // Get current language
  const currentLang = localStorage.getItem('preferredLanguage') || 'fa';
  
  // Create container
  const pillsContainer = document.createElement('div');
  pillsContainer.className = 'suggestion-pills';
  
  // Create 4 suggestion pills
  for (let i = 1; i <= 4; i++) {
    const pill = document.createElement('button');
    pill.className = 'suggestion-pill';
    pill.setAttribute('data-lang-key', `suggestion_${i}`);
    pill.type = 'button';
    
    // Set initial text from translations
    if (window.translations && window.translations[currentLang]) {
      pill.textContent = window.translations[currentLang][`suggestion_${i}`] || '';
    }
    
    // Click handler
    pill.addEventListener('click', function() {
      const suggestionText = this.textContent;
      if (messageInput && suggestionText) {
        messageInput.value = suggestionText;
        messageInput.focus();
        // Trigger auto-resize
        messageInput.style.height = 'auto';
        messageInput.style.height = Math.min(messageInput.scrollHeight, 140) + 'px';
        // Send the message
        sendMessage();
      }
    });
    
    pillsContainer.appendChild(pill);
  }
  
  // Add to welcome section
  welcomeSection.appendChild(pillsContainer);
}

function removeSuggestionPills() {
  const pillsContainer = document.querySelector('.suggestion-pills');
  if (pillsContainer) {
    // Add hiding animation class
    pillsContainer.classList.add('hiding');
    // Remove after animation completes
    setTimeout(() => {
      pillsContainer.remove();
    }, 400); // Match the fadeOutDown animation duration
  }
}

// Initialize suggestion pills on page load
document.addEventListener('DOMContentLoaded', function() {
  // Wait a tiny bit for translations to load
  setTimeout(() => {
    createSuggestionPills();
  }, 100);
});

// Listen for language changes to update pill text
document.addEventListener('languageChanged', function(e) {
  const pills = document.querySelectorAll('.suggestion-pill');
  const newLang = e.detail.lang;
  
  pills.forEach((pill, index) => {
    const key = `suggestion_${index + 1}`;
    if (window.translations && window.translations[newLang] && window.translations[newLang][key]) {
      pill.textContent = window.translations[newLang][key];
    }
  });
});

// =====================================================
// END SUGGESTION PILLS FUNCTIONALITY
// =====================================================


function addMessage(content, isUser = false) {
  if (!messagesContainer) return; // Safety check
  const row = document.createElement('div');
  row.className = `message ${isUser ? 'user' : 'bot'}`;

  const inner = document.createElement('div');
  inner.className = 'bubble-row';

  const avatar = document.createElement('div');
  avatar.className = 'avatar';
  avatar.textContent = isUser ? 'You' : 'AI';

  const bubble = document.createElement('div');
  bubble.className = 'message-content';

  inner.appendChild(avatar);
  inner.appendChild(bubble);
  row.appendChild(inner);

  const welcome = messagesContainer.querySelector('.welcome-section');
  if (welcome) {
    // Remove suggestion pills with animation first (if user message)
    if (isUser) {
      removeSuggestionPills();
      // Wait for pills animation before removing welcome
      setTimeout(() => {
        welcome.remove();
      }, 400);
    } else {
      welcome.remove();
    }
  }

  messagesContainer.appendChild(row);

  if (!isUser) {
    bubble.textContent = '▋'; // Initial cursor
    typeMessage(bubble, content);
  } else {
    bubble.textContent = content;
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
}

// Typewriter function
function typeMessage(element, text) {
  if (!messagesContainer) return; // Safety check
  const words = text.split(' ');
  let i = 0;
  element.textContent = '';

  function type() {
    if (i < words.length) {
      element.textContent += (i > 0 ? ' ' : '') + words[i];
      i++;
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
      setTimeout(type, 60); // Adjust speed here (milliseconds per word)
    }
  }
  type();
}

function showTyping() {
  if (!messagesContainer) return; // Safety check
  const row = document.createElement('div');
  row.className = 'message bot';
  row.id = 'typing';

  const inner = document.createElement('div');
  inner.className = 'bubble-row';

  const avatar = document.createElement('div');
  avatar.className = 'avatar';
  avatar.textContent = 'AI';

  const bubble = document.createElement('div');
  bubble.className = 'message-content typing-indicator';
  bubble.innerHTML = '<div class="typing-dots"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>';

  inner.appendChild(avatar);
  inner.appendChild(bubble);
  row.appendChild(inner);

  messagesContainer.appendChild(row);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function hideTyping() {
  const t = document.getElementById('typing');
  if (t) t.remove();
}

async function sendMessage() {
  if (!messageInput || !messagesContainer || !sendButton) return;

  const message = messageInput.value.trim();
  if (!message) return;

  addMessage(message, true);
  conversationHistory.push({ role: 'user', content: message });

  messageInput.value = '';
  messageInput.style.height = 'auto';
  sendButton.disabled = true;

  showTyping();

  // --- THIS IS THE NEW CODE ---
  // 1. Get the current language from localStorage
  const currentLanguage = localStorage.getItem('preferredLanguage') || 'fa';
  // --- END OF NEW CODE ---

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        conversationHistory,
        conversationStage,
        userEmail,
        language: currentLanguage // 2. Add the language to the request body
      })
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    const data = await response.json();

    hideTyping();

    if (data.success) {
      addMessage(data.message, false);
      conversationHistory.push({ role: 'assistant', content: data.message });
      if (data.conversationStage) conversationStage = data.conversationStage;
      if (data.userEmail) userEmail = data.userEmail;
      if (data.conversationComplete) {
        setTimeout(() => addMessage(getChatTranslation('chat_farewell'), false), 1500);
      }

      // Increment message count and check if we should show email popup
      messageCount++;
      checkEmailPopupTrigger();
    } else {
      addMessage(data.message || getChatTranslation('chat_error_generic'), false);
    }
  } catch (err) {
    hideTyping();
    console.error('Chat Error:', err);
    addMessage(getChatTranslation('chat_error_connection'), false);
  }

  sendButton.disabled = false;
  messageInput.focus();
}
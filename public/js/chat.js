// --- ORIGINAL CHATBOT SCRIPT ---
let conversationHistory = [];
let userEmail = null;
let conversationStage = 'initial';

const messagesContainer = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');

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

function addMessage(content, isUser = false) {
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
  if (welcome) welcome.remove();

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

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        conversationHistory,
        conversationStage,
        userEmail
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
        setTimeout(() => addMessage('Thanks! Start a new topic anytime.', false), 1500);
      }
    } else {
      addMessage(data.message || 'Something went wrong. Please try again.', false);
    }
  } catch (err) {
    hideTyping();
    console.error('Chat Error:', err);
    addMessage("I'm sorry – connection issue. Please try again.", false);
  }

  sendButton.disabled = false;
  messageInput.focus();
}
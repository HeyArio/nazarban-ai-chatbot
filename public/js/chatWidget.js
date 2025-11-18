/*
  Floating Chat Widget
  - Appears on all pages except the chat page itself
  - Links to index.html (chat page)
  - Bilingual support (FA/EN)
  - Smooth animations and hover effects
*/

(function() {
  'use strict';

  // Don't show widget on the chat page itself (index.html)
  const currentPage = window.location.pathname;
  if (currentPage === '/' || currentPage === '/index.html') {
    return; // Exit if we're on the chat page
  }

  // Get current language
  const getCurrentLanguage = () => {
    return localStorage.getItem('preferredLanguage') || 'fa';
  };

  // Create the floating chat widget
  const createChatWidget = () => {
    const lang = getCurrentLanguage();

    // Translations
    const translations = {
      fa: 'گفتگو با هوش مصنوعی',
      en: 'Chat with AI'
    };

    // Create widget container
    const widgetContainer = document.createElement('div');
    widgetContainer.className = 'floating-chat-widget';
    widgetContainer.innerHTML = `
      <a href="index.html" class="chat-widget-button" aria-label="${translations[lang]}">
        <span class="chat-widget-tooltip">${translations[lang]}</span>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
          <circle cx="12" cy="10" r="1.5"/>
          <circle cx="8" cy="10" r="1.5"/>
          <circle cx="16" cy="10" r="1.5"/>
        </svg>
      </a>
    `;

    document.body.appendChild(widgetContainer);
  };

  // Update widget text when language changes
  const updateWidgetLanguage = () => {
    const widget = document.querySelector('.chat-widget-button');
    const tooltip = document.querySelector('.chat-widget-tooltip');

    if (widget && tooltip) {
      const lang = getCurrentLanguage();
      const translations = {
        fa: 'گفتگو با هوش مصنوعی',
        en: 'Chat with AI'
      };

      widget.setAttribute('aria-label', translations[lang]);
      tooltip.textContent = translations[lang];
    }
  };

  // Initialize widget when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createChatWidget);
  } else {
    createChatWidget();
  }

  // Listen for language changes
  document.addEventListener('languageChanged', updateWidgetLanguage);
  window.addEventListener('storage', (e) => {
    if (e.key === 'preferredLanguage') {
      updateWidgetLanguage();
    }
  });
})();

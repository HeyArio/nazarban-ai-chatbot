document.addEventListener('DOMContentLoaded', () => {
  const languageSwitchers = document.querySelectorAll('.language-switcher a');
  const htmlEl = document.documentElement; // Target the <html> tag

  // Function to update text content based on selected language
  const setLanguage = (lang) => {
    // Update text for all elements with data-lang-key attribute
    document.querySelectorAll('[data-lang-key]').forEach(element => {
      const key = element.getAttribute('data-lang-key');
      // Check if translation exists, otherwise keep original text
      if (translations[lang] && translations[lang][key]) {
        // Handle different element types
        if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
            if(element.placeholder) element.placeholder = translations[lang][key];
        } else if (element.dataset.contentTarget) {
            // Special case for elements where we only want to change text node (like links with icons)
             const targetNode = Array.from(element.childNodes).find(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
             if(targetNode) targetNode.textContent = translations[lang][key];
             // Handle span inside link specifically for phone number
             else if (element.querySelector('span')) {
                 element.querySelector('span').textContent = translations[lang][key];
             }
        }
        else {
            // FIX: Use innerHTML to allow for formatted text (e.g., <strong>)
            element.innerHTML = translations[lang][key];
        }
      }
    });

    // Update html lang attribute
    htmlEl.setAttribute('lang', lang);

    // Toggle RTL direction
    if (lang === 'fa') {
      htmlEl.setAttribute('dir', 'rtl');
    } else {
      htmlEl.setAttribute('dir', 'ltr');
    }

    // Update active state on language switchers
    languageSwitchers.forEach(sw => {
      sw.classList.toggle('active', sw.getAttribute('data-lang') === lang);
    });

    // Save preference to localStorage
    localStorage.setItem('preferredLanguage', lang);
  };

  // Add click listeners to language switchers
  languageSwitchers.forEach(switcher => {
    switcher.addEventListener('click', (e) => {
      e.preventDefault();
      const selectedLang = switcher.getAttribute('data-lang');
      setLanguage(selectedLang);
      // Close mobile menu if open after language change
      const mobileNavOverlay = document.querySelector('.nav-mobile-overlay');
      const menuToggle = document.querySelector('.menu-toggle');
      if (mobileNavOverlay && mobileNavOverlay.classList.contains('active')) {
          mobileNavOverlay.classList.remove('active');
          menuToggle.classList.remove('active');
          menuToggle.setAttribute('aria-expanded', 'false');
          document.body.style.overflow = '';
      }
    });
  });

  // Initial language setup: Check localStorage, otherwise default to English
  const preferredLanguage = localStorage.getItem('preferredLanguage') || 'en';
  setLanguage(preferredLanguage);
});
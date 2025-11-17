/*
  Nazarban Analytics - FAQ Module
  Handles loading and displaying FAQs on homepage
*/

document.addEventListener('DOMContentLoaded', async () => {
  const faqAccordion = document.getElementById('faqAccordion');
  const faqEmpty = document.getElementById('faqEmpty');

  const getCurrentLanguage = () => {
    return localStorage.getItem('preferredLanguage') || 'fa';
  };

  const loadFaqs = async () => {
    try {
      const response = await fetch('/api/faqs');
      const data = await response.json();

      if (data.success && data.faqs && data.faqs.length > 0) {
        renderFaqs(data.faqs);
        faqEmpty.style.display = 'none';
      } else {
        faqAccordion.innerHTML = '';
        faqEmpty.style.display = 'block';
      }
    } catch (error) {
      console.error('Error loading FAQs:', error);
      faqAccordion.innerHTML = '';
      faqEmpty.style.display = 'block';
    }
  };

  const renderFaqs = (faqs) => {
    const lang = getCurrentLanguage();
    faqAccordion.innerHTML = '';

    faqs.forEach((faq, index) => {
      const question = lang === 'fa' ? faq.questionFa : faq.questionEn;
      const answer = lang === 'fa' ? faq.answerFa : faq.answerEn;

      const faqItem = document.createElement('div');
      faqItem.className = 'faq-item';
      faqItem.innerHTML = `
        <button class="faq-question" aria-expanded="false">
          <span>${question}</span>
          <svg class="faq-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <div class="faq-answer">
          <p>${answer}</p>
        </div>
      `;

      // Add click handler
      const questionBtn = faqItem.querySelector('.faq-question');
      const answerDiv = faqItem.querySelector('.faq-answer');

      questionBtn.addEventListener('click', () => {
        const isExpanded = questionBtn.getAttribute('aria-expanded') === 'true';

        // Close all other FAQs
        document.querySelectorAll('.faq-question').forEach(btn => {
          btn.setAttribute('aria-expanded', 'false');
          btn.parentElement.classList.remove('active');
        });

        // Toggle current FAQ
        if (!isExpanded) {
          questionBtn.setAttribute('aria-expanded', 'true');
          faqItem.classList.add('active');
        }
      });

      faqAccordion.appendChild(faqItem);
    });
  };

  // Load FAQs on page load
  await loadFaqs();

  // Reload FAQs when language changes
  document.addEventListener('languageChanged', loadFaqs);

  window.addEventListener('storage', (e) => {
    if (e.key === 'preferredLanguage') {
      loadFaqs();
    }
  });
});

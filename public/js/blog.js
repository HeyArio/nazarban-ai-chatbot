/*
  Nazarban Analytics - Blog Page JavaScript
  Handles:
  - Loading blog posts from API (via loadBlogPosts)
  - Loading crypto data for ticker (via loadCryptoData)
  - Displaying bilingual content
  - Post modal logic
*/

document.addEventListener('DOMContentLoaded', async () => {
  // --- Get main DOM elements ---
  const postsContainer = document.getElementById('postsContainer');
  const loadingIndicator = document.getElementById('loadingIndicator');
  const errorMessage = document.getElementById('errorMessage');
  // NEW: Get the crypto ticker track
  const cryptoTickerTrack = document.getElementById('cryptoTickerTrack');

  // --- Helper Functions (from your original file) ---
  const getCurrentLanguage = () => {
    return localStorage.getItem('preferredLanguage') || 'fa';
  };

  const formatDate = (dateString, lang) => {
    if (!dateString || typeof dateString !== 'string') {
      console.error('A post was found with an empty or missing date.');
      return lang === 'fa' ? 'تاریخ نامشخص' : 'Date unavailable';
    }
    const date = new Date(dateString.trim());
    if (isNaN(date.getTime())) {
      console.error('INVALID DATE DETECTED! The raw value was:', dateString);
      return lang === 'fa' ? 'تاریخ نامعتبر' : 'Invalid Date';
    }
    if (lang === 'fa') {
      return new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' }).format(date);
    } else {
      return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric' }).format(date);
    }
  };

  // --- FUNCTION TO SET DATE ---
  const setLastUpdatedDate = () => {
    try {
      const lastUpdatedEl = document.getElementById('blog-subtitle');
      if (!lastUpdatedEl) return; // Failsafe

      const today = new Date();
      const lang = getCurrentLanguage();
      
      // This is now SAFE because translations.js has already loaded.
      const prefix = (window.translations[lang] && window.translations[lang].blog_updated_prefix) 
                       ? window.translations[lang].blog_updated_prefix 
                       : (lang === 'fa' ? 'به‌روزرسانی تا تاریخ' : 'Updated as of');
      
      // Use your existing formatDate function
      const formattedDate = formatDate(today.toISOString(), lang);
      
      lastUpdatedEl.textContent = `${prefix} ${formattedDate}`;
    } catch (e) {
      console.error("Error setting header date:", e);
      // Fallback in case translations object fails
      const lastUpdatedEl = document.getElementById('blog-subtitle');
      if(lastUpdatedEl) lastUpdatedEl.textContent = "Last Updated: " + new Date().toLocaleDateString();
    }
  };
  // --- END FUNCTION TO SET DATE ---


  const createPostCard = (post, lang, isCustom = false) => {
    const card = document.createElement('article');
    card.className = 'blog-post-card';
    card.dataset.postId = post.id || Math.random().toString(36).substr(2, 9);

    const summary = lang === 'fa' ? (post.summaryFarsi || post.tagline) : (post.summaryEnglish || post.tagline);
    const title = post.title || post.name;
    const date = post.date || post.created_at;
    const formattedDate = formatDate(date, lang);
    const linkUrl = post.url || post.discussion_url;

    // Truncate summary to ~300 characters for preview
    const truncateText = (html, maxLength = 300) => {
      // Strip HTML tags for character count
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      const text = tempDiv.textContent || tempDiv.innerText || '';

      if (text.length <= maxLength) return html;

      // Find a good breaking point
      let truncated = text.substring(0, maxLength);
      const lastSpace = truncated.lastIndexOf(' ');
      if (lastSpace > maxLength - 30) {
        truncated = truncated.substring(0, lastSpace);
      }
      return truncated + '...';
    };

    const truncatedSummary = truncateText(summary);
    const badgeText = window.translations ? window.translations[lang]?.blog_nazarban_insight : (lang === 'fa' ? 'بینش نظربان' : 'Nazarban Insight');

    card.innerHTML = `
      ${isCustom ? `<span class="nazarban-badge">${badgeText}</span>` : ''}
      <div class="post-header">
        <h2 class="post-title">${title}</h2>
        <div class="post-meta">
          <span class="post-date">${formattedDate}</span>
          ${post.votes ? `<span class="post-votes">${post.votes} ${lang === 'fa' ? 'رأی' : 'upvotes'}</span>` : ''}
        </div>
      </div>
      <div class="post-content">
        <p>${truncatedSummary}</p>
      </div>
      <div class="post-footer">
        <button class="read-more-btn" onclick="event.stopPropagation()">
          ${lang === 'fa' ? 'ادامه مطلب' : 'Read More'}
          <svg class="link-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 5l7 7-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        ${linkUrl ? `
          <a href="${linkUrl}" target="_blank" rel="noopener noreferrer" class="post-link" onclick="event.stopPropagation()">
            ${isCustom ? (lang === 'fa' ? 'مقاله کامل' : 'Full Article') : 'Product Hunt'}
            <svg class="link-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </a>
        ` : ''}
      </div>
    `;

    // Add click handler for the whole card and the read more button
    card.addEventListener('click', () => openModal(post, lang));
    const readMoreBtn = card.querySelector('.read-more-btn');
    if (readMoreBtn) {
      readMoreBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openModal(post, lang);
      });
    }

    return card;
  };

  const createModal = () => {
    const modal = document.createElement('div');
    modal.className = 'blog-modal';
    modal.id = 'blogModal';
    modal.innerHTML = `
      <div class="modal-content">
        <button class="modal-close" aria-label="Close modal">&times;</button>
        <div class="modal-header">
          <h2 class="modal-title"></h2>
          <div class="modal-meta"></div>
        </div>
        <div class="modal-body"></div>
        <div class="modal-footer"></div>
      </div>
    `;
    document.body.appendChild(modal);
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
    modal.querySelector('.modal-close').addEventListener('click', closeModal);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('active')) closeModal();
    });
    
    return modal;
  };

  const openModal = (post, lang) => {
    let modal = document.getElementById('blogModal');
    if (!modal) modal = createModal();
    
    const summary = lang === 'fa' ? post.summaryFarsi : post.summaryEnglish;
    const formattedDate = formatDate(post.date, lang);
    
    modal.querySelector('.modal-title').textContent = post.title;
    modal.querySelector('.modal-meta').innerHTML = `
      <span class="post-date">${formattedDate}</span>
      ${post.votes ? `<span class="post-votes">⭐ ${post.votes} ${lang === 'fa' ? 'رأی' : 'upvotes'}</span>` : ''}
    `;
    modal.querySelector('.modal-body').innerHTML = summary;
    
    if (post.url) {
      modal.querySelector('.modal-footer').innerHTML = `
        <a href="${post.url}" target="_blank" rel="noopener noreferrer" class="modal-link">
          ${lang === 'fa' ? 'مشاهده در Product Hunt' : 'View on Product Hunt'}
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </a>
      `;
    } else {
      modal.querySelector('.modal-footer').innerHTML = '';
    }
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  };

  const closeModal = () => {
    const modal = document.getElementById('blogModal');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  };

  // --- Main Blog Post Loader ---
  const loadBlogPosts = async () => {
    try {
      loadingIndicator.style.display = 'block';
      errorMessage.style.display = 'none';
      postsContainer.innerHTML = '';

      const lang = getCurrentLanguage();
      let allPosts = [];

      // 1. Load custom articles (Nazarban Insight)
      try {
        const customResponse = await fetch('/data/custom-articles.json');
        const customArticles = await customResponse.json();

        // Add custom flag and convert to post format
        const customPosts = customArticles.map(article => ({
          ...article,
          isCustom: true,
          name: article.title[lang] || article.title.en,
          tagline: article.summary[lang] || article.summary.en,
          discussion_url: article.url,
          thumbnail: { image_url: article.image },
          created_at: article.date
        }));

        allPosts = customPosts;
      } catch (error) {
        console.log('No custom articles found or error loading:', error);
      }

      // 2. Load Product Hunt posts
      try {
        const phResponse = await fetch('/api/blog/posts');
        const phData = await phResponse.json();

        if (phData.success && phData.posts && phData.posts.length > 0) {
          allPosts = [...allPosts, ...phData.posts];
        }
      } catch (error) {
        console.log('Error loading Product Hunt posts:', error);
      }

      // 3. Sort by date (newest first) and limit to 6
      allPosts.sort((a, b) => new Date(b.created_at || b.date) - new Date(a.created_at || a.date));
      const displayPosts = allPosts.slice(0, 6);

      // 4. Display posts
      if (displayPosts.length > 0) {
        displayPosts.forEach(post => {
          const card = createPostCard(post, lang, post.isCustom);
          postsContainer.appendChild(card);
        });
      } else {
        // No posts available
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'empty-state';
        emptyMessage.innerHTML = `
          <svg class="empty-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z" stroke="currentColor" stroke-width="1.5"/>
            <path d="M9 7h6M9 12h6M9 17h3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <h3>${lang === 'fa' ? 'مقاله‌ای موجود نیست' : 'No Posts Yet'}</h3>
          <p>${lang === 'fa' ? 'به زودی مقالات جدید منتشر خواهد شد' : 'New posts will be published soon'}</p>
        `;
        postsContainer.appendChild(emptyMessage);
      }

      loadingIndicator.style.display = 'none';

    } catch (error) {
      console.error('Error loading blog posts:', error);
      loadingIndicator.style.display = 'none';
      errorMessage.style.display = 'block';

      const lang = getCurrentLanguage();
      errorMessage.textContent = lang === 'fa'
        ? 'خطا در بارگذاری مقالات. لطفاً دوباره تلاش کنید.'
        : 'Error loading posts. Please try again.';
    }
  };

  // --- NEW: Crypto Ticker Functions ---

  /**
   * Creates a single ticker item element
   */
  const createTickerItem = (coin) => {
    // 1. Create an anchor tag <a>
    const item = document.createElement('a');
    item.className = 'ticker-item';
    
    // 2. Build the correct URL
    item.href = `https://wallex.ir/buy-and-sell/${coin.symbol.toLowerCase()}`;
    
    // 3. Make it open in a new tab
    item.target = '_blank';
    item.rel = 'noopener noreferrer';

    // --- The 'safer' code from last time ---
    const change = parseFloat(coin.change_percent_24h) || 0;
    const priceNum = parseFloat(coin.price) || 0;
    // --- End safe code ---

    const changeClass = change >= 0 ? 'positive' : 'negative';
    const changeSign = change >= 0 ? '+' : '';

    const price = priceNum.toLocaleString('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4 
    });

    // 4. ---!!! THIS IS THE FIX (from last time) !!!---
    item.innerHTML = `
      <span class="ticker-symbol">${coin.symbol}</span>
      <span class="ticker-price">${price}</span>
      <span class="ticker-change ${changeClass}">
        ${changeSign}${change.toFixed(2)}%
      </span>
    `;
    return item;
  };

  /**
   * Fetches crypto data and populates the ticker
   */
  const loadCryptoData = async () => {
    if (!cryptoTickerTrack) return; // Failsafe if element doesn't exist

    try {
      const response = await fetch('/api/crypto/data');
      const data = await response.json();

      if (data.success && data.data && data.data.length > 0) {
        cryptoTickerTrack.innerHTML = ''; // Clear any old data
        const coins = data.data;

        // Create and add all coin items
        coins.forEach(item => {
          const coin = item.json || item; // <--- THIS IS THE FIX (Handles n8n wrapper)
          cryptoTickerTrack.appendChild(createTickerItem(coin));
        });

        // **Duplicate items for seamless scroll**
        coins.forEach(item => {
          const coin = item.json || item; // <--- THIS IS THE FIX (Handles n8n wrapper)
          const duplicateItem = createTickerItem(coin);
          duplicateItem.setAttribute('aria-hidden', 'true');
          cryptoTickerTrack.appendChild(duplicateItem);
        });

      } else {
        // Don't show an error, just hide the ticker
        if (cryptoTickerTrack.parentElement) {
          cryptoTickerTrack.parentElement.style.display = 'none';
        }
      }
    } catch (error) {
      console.error('Error loading crypto data:', error);
      // Hide the ticker on error
      if (cryptoTickerTrack.parentElement) {
        cryptoTickerTrack.parentElement.style.display = 'none';
      }
    }
  };

  // --- Initial Load ---
  const loadPageData = async () => {
    // We call both functions to run in parallel.
    // loadBlogPosts will handle the main loading/error message.
    // loadCryptoData will run silently in the background.
    await loadBlogPosts();
    loadCryptoData();
  };

  // --- Call functions on initial page load ---
  
  // ▼▼▼ THIS IS THE FIX ▼▼▼
  // We call this *now*, after translations.js has loaded
  // and after the function is defined.
  setLastUpdatedDate(); 
  
  await loadPageData();

  // --- Event Listeners ---
  const handleLanguageChange = () => {
    // Reload both blog posts and crypto data
    loadPageData();
    setLastUpdatedDate(); // <-- This call is also safe.
  };

  window.addEventListener('storage', (e) => {
    if (e.key === 'preferredLanguage') {
      handleLanguageChange();
    }
  });

  // This event is fired by your language.js *after* it sets the language.
  document.addEventListener('languageChanged', handleLanguageChange);
});
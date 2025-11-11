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

  const createPostCard = (post, lang) => {
    const card = document.createElement('article');
    card.className = 'blog-post-card';
    card.dataset.postId = post.id || Math.random().toString(36).substr(2, 9);
    
    const summary = lang === 'fa' ? post.summaryFarsi : post.summaryEnglish;
    const formattedDate = formatDate(post.date, lang);
    
    card.innerHTML = `
      <div class="post-header">
        <h2 class="post-title">${post.title}</h2>
        <div class="post-meta">
          <span class="post-date">${formattedDate}</span>
          ${post.votes ? `<span class="post-votes">⭐ ${post.votes} ${lang === 'fa' ? 'رأی' : 'upvotes'}</span>` : ''}
        </div>
      </div>
      <div class="post-content">
        ${summary}
      </div>
      ${post.url ? `
        <div class="post-footer">
          <a href="${post.url}" target="_blank" rel="noopener noreferrer" class="post-link" onclick="event.stopPropagation()">
            ${lang === 'fa' ? 'مشاهده در Product Hunt' : 'View on Product Hunt'}
            <svg class="link-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </a>
        </div>
      ` : ''}
    `;
    
    card.addEventListener('click', () => openModal(post, lang));
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

  // --- Main Blog Post Loader (from your file) ---
  const loadBlogPosts = async () => {
    // This function will *only* load blog posts.
    try {
      loadingIndicator.style.display = 'block';
      errorMessage.style.display = 'none';
      postsContainer.innerHTML = '';

      const response = await fetch('/api/blog/posts');
      const data = await response.json();

      if (data.success && data.posts && data.posts.length > 0) {
        const lang = getCurrentLanguage();
        
        data.posts.forEach(post => {
          const card = createPostCard(post, lang);
          postsContainer.appendChild(card);
        });
      } else {
        // No posts available
        const lang = getCurrentLanguage();
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'empty-state';
        emptyMessage.innerHTML = `
          <svg class="empty-icon" ...> ... </svg>
          <h3>${lang === 'fa' ? 'مقاله‌ای موجود نیست' : 'No Posts Yet'}</h3>
          <p>${lang === 'fa' ? 'به زودی مقالات جدید منتشر خواهد شد' : 'New posts will be published soon'}</p>
        `;
        postsContainer.appendChild(emptyMessage);
      }
      
      loadingIndicator.style.display = 'none';

    } catch (error) {
      console.error('Error loading blog posts:', error);
      loadingIndicator.style.display = 'none'; // Hide main loading
      errorMessage.style.display = 'block'; // Show main error
      
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
  /**
   * Creates a single ticker item element
   */
  /**
   * Creates a single ticker item element
   */
  const createTickerItem = (coin) => {
    // 1. Create an anchor tag <a> instead of a <div>
    const item = document.createElement('a');
    item.className = 'ticker-item';
    
    // 2. Build the URL and set the 'href'
    item.href = `https://wallex.ir/trade/${coin.pair}`;
    
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

    // 4. The inner HTML is the same as before
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

  await loadPageData();

  // --- Event Listeners ---
  const handleLanguageChange = () => {
    // Reload both blog posts and crypto data
    loadPageData();
  };

  window.addEventListener('storage', (e) => {
    if (e.key === 'preferredLanguage') {
      handleLanguageChange();
    }
  });

  document.addEventListener('languageChanged', handleLanguageChange);
});
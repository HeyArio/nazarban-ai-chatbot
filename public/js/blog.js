/*
  Nazarban Analytics - Card Deck Blog JavaScript
  Features:
  - 🃏 Card deck/stack interface
  - 👆 Touch swipe gestures
  - 🖱️ Mouse drag support
  - ⌨️ Keyboard navigation
  - 📱 Mobile optimized
  - 🎨 Smooth animations
*/

document.addEventListener('DOMContentLoaded', async () => {
  const loadingIndicator = document.getElementById('loadingIndicator');
  const errorMessage = document.getElementById('errorMessage');
  
  let postsData = [];
  let currentIndex = 0;
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let currentX = 0;
  let currentY = 0;

  // Get current language from localStorage
  const getCurrentLanguage = () => {
    return localStorage.getItem('preferredLanguage') || 'en';
  };

  // Format date based on language
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
      return new Intl.DateTimeFormat('fa-IR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }).format(date);
    } else {
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }).format(date);
    }
  };

  // Create a post card element
  const createPostCard = (post, lang, index) => {
    const card = document.createElement('article');
    card.className = 'blog-post-card';
    card.dataset.index = index;
    
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
          <a href="${post.url}" target="_blank" rel="noopener noreferrer" class="post-link">
            ${lang === 'fa' ? 'مشاهده در Product Hunt' : 'View on Product Hunt'}
            <svg class="link-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </a>
        </div>
      ` : ''}
    `;
    
    return card;
  };

  // Initialize deck container
  const initDeck = (posts) => {
    const postsContainer = document.getElementById('postsContainer');
    postsContainer.innerHTML = '';
    
    // Create deck container
    const deckContainer = document.createElement('div');
    deckContainer.className = 'posts-deck';
    deckContainer.id = 'postsDeck';
    
    // Create swipe indicators
    const leftIndicator = document.createElement('div');
    leftIndicator.className = 'swipe-indicator left';
    leftIndicator.textContent = '✕';
    
    const rightIndicator = document.createElement('div');
    rightIndicator.className = 'swipe-indicator right';
    rightIndicator.textContent = '♥';
    
    deckContainer.appendChild(leftIndicator);
    deckContainer.appendChild(rightIndicator);
    
    const lang = getCurrentLanguage();
    
    // Add all cards (only show first 3 visually)
    posts.forEach((post, index) => {
      const card = createPostCard(post, lang, index);
      deckContainer.appendChild(card);
    });
    
    postsContainer.appendChild(deckContainer);
    
    // Add controls
    const controls = document.createElement('div');
    controls.className = 'deck-controls';
    controls.innerHTML = `
      <button class="deck-btn btn-skip" id="btnSkip" title="${lang === 'fa' ? 'رد کردن' : 'Skip'}">✕</button>
      <button class="deck-btn btn-like" id="btnLike" title="${lang === 'fa' ? 'دوست دارم' : 'Like'}">♥</button>
    `;
    postsContainer.appendChild(controls);
    
    // Add progress indicator
    const progress = document.createElement('div');
    progress.className = 'deck-progress';
    progress.id = 'deckProgress';
    progress.textContent = `1 / ${posts.length}`;
    postsContainer.appendChild(progress);
    
    // Add instructions
    const instructions = document.createElement('div');
    instructions.className = 'deck-instructions';
    instructions.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M9 18l6-6-6-6"/>
      </svg>
      <span>${lang === 'fa' ? 'برای دیدن بعدی بکشید یا از دکمه‌ها استفاده کنید' : 'Swipe or use buttons to navigate'}</span>
    `;
    postsContainer.insertBefore(instructions, deckContainer);
    
    // Initialize event listeners
    initSwipeControls();
  };

  // Swipe/Drag Controls
  const initSwipeControls = () => {
    const deck = document.getElementById('postsDeck');
    const btnSkip = document.getElementById('btnSkip');
    const btnLike = document.getElementById('btnLike');
    const leftIndicator = deck.querySelector('.swipe-indicator.left');
    const rightIndicator = deck.querySelector('.swipe-indicator.right');
    
    // Get current top card
    const getTopCard = () => {
      const cards = Array.from(deck.querySelectorAll('.blog-post-card:not(.removed)'));
      return cards[0];
    };
    
    // Remove top card with animation
    const removeCard = (direction) => {
      const card = getTopCard();
      if (!card) return;
      
      card.classList.add(`swiped-${direction}`);
      
      setTimeout(() => {
        card.classList.add('removed');
        currentIndex++;
        updateProgress();
        
        // Check if deck is complete
        if (currentIndex >= postsData.length) {
          showDeckComplete();
        }
      }, 600);
    };
    
    // Update progress indicator
    const updateProgress = () => {
      const progress = document.getElementById('deckProgress');
      if (progress && currentIndex < postsData.length) {
        progress.textContent = `${currentIndex + 1} / ${postsData.length}`;
      }
    };
    
    // Show deck complete message
    const showDeckComplete = () => {
      const deck = document.getElementById('postsDeck');
      const controls = document.querySelector('.deck-controls');
      const progress = document.getElementById('deckProgress');
      const instructions = document.querySelector('.deck-instructions');
      const lang = getCurrentLanguage();
      
      deck.style.display = 'none';
      controls.style.display = 'none';
      progress.style.display = 'none';
      instructions.style.display = 'none';
      
      const complete = document.createElement('div');
      complete.className = 'deck-complete';
      complete.innerHTML = `
        <h3>🎉 ${lang === 'fa' ? 'تمام شد!' : 'All Done!'}</h3>
        <p>${lang === 'fa' ? 'همه مقالات را دیدید' : 'You\'ve seen all the posts'}</p>
        <button class="btn-restart" onclick="location.reload()">
          ${lang === 'fa' ? '↻ شروع دوباره' : '↻ Start Over'}
        </button>
      `;
      
      document.getElementById('postsContainer').appendChild(complete);
    };
    
    // Button controls
    btnSkip.addEventListener('click', () => removeCard('left'));
    btnLike.addEventListener('click', () => removeCard('right'));
    
    // Keyboard controls
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') {
        removeCard('left');
      } else if (e.key === 'ArrowRight') {
        removeCard('right');
      } else if (e.key === 'ArrowUp') {
        removeCard('up');
      }
    });
    
    // Touch/Mouse drag controls
    const handleStart = (e) => {
      const card = getTopCard();
      if (!card) return;
      
      isDragging = true;
      card.classList.add('swiping');
      
      const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
      const clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
      
      startX = clientX;
      startY = clientY;
    };
    
    const handleMove = (e) => {
      if (!isDragging) return;
      
      const card = getTopCard();
      if (!card) return;
      
      const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
      const clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
      
      currentX = clientX - startX;
      currentY = clientY - startY;
      
      const rotate = currentX / 20;
      const opacity = 1 - Math.abs(currentX) / 300;
      
      card.style.transform = `translate(${currentX}px, ${currentY}px) rotate(${rotate}deg)`;
      card.style.opacity = opacity;
      
      // Show indicators
      if (currentX < -50) {
        leftIndicator.classList.add('visible');
        rightIndicator.classList.remove('visible');
      } else if (currentX > 50) {
        rightIndicator.classList.add('visible');
        leftIndicator.classList.remove('visible');
      } else {
        leftIndicator.classList.remove('visible');
        rightIndicator.classList.remove('visible');
      }
    };
    
    const handleEnd = () => {
      if (!isDragging) return;
      
      const card = getTopCard();
      if (!card) return;
      
      isDragging = false;
      card.classList.remove('swiping');
      
      leftIndicator.classList.remove('visible');
      rightIndicator.classList.remove('visible');
      
      // Determine if swipe was strong enough
      if (Math.abs(currentX) > 150) {
        if (currentX > 0) {
          removeCard('right');
        } else {
          removeCard('left');
        }
      } else if (currentY < -150) {
        removeCard('up');
      } else {
        // Reset card position
        card.style.transform = '';
        card.style.opacity = '';
      }
      
      currentX = 0;
      currentY = 0;
    };
    
    // Add event listeners to deck
    deck.addEventListener('mousedown', handleStart);
    deck.addEventListener('mousemove', handleMove);
    deck.addEventListener('mouseup', handleEnd);
    deck.addEventListener('mouseleave', handleEnd);
    
    deck.addEventListener('touchstart', handleStart, { passive: true });
    deck.addEventListener('touchmove', handleMove, { passive: true });
    deck.addEventListener('touchend', handleEnd);
  };

  // Load and display posts
  const loadPosts = async () => {
    try {
      loadingIndicator.style.display = 'block';
      errorMessage.style.display = 'none';

      const response = await fetch('/api/blog/posts');
      const data = await response.json();

      if (data.success && data.posts && data.posts.length > 0) {
        postsData = data.posts;
        currentIndex = 0;
        initDeck(postsData);
      } else {
        // No posts available
        const lang = getCurrentLanguage();
        const postsContainer = document.getElementById('postsContainer');
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'empty-state';
        emptyMessage.innerHTML = `
          <svg class="empty-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" stroke="currentColor" stroke-width="2"/>
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

  // Initial load
  await loadPosts();

  // Listen for language changes and reload posts
  window.addEventListener('storage', (e) => {
    if (e.key === 'preferredLanguage') {
      loadPosts();
    }
  });

  // Also listen for custom language change event
  document.addEventListener('languageChanged', () => {
    loadPosts();
  });

  console.log('🃏 Card Deck Blog Initialized!');
  console.log('👆 Swipe, click buttons, or use arrow keys to navigate');
});
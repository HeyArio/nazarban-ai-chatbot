/*
  Nazarban Analytics - Blog Page JavaScript
  Handles:
  - Loading blog posts from API
  - Displaying bilingual content
  - Post filtering and sorting
*/

document.addEventListener('DOMContentLoaded', async () => {
  const postsContainer = document.getElementById('postsContainer');
  const loadingIndicator = document.getElementById('loadingIndicator');
  const errorMessage = document.getElementById('errorMessage');

  // Get current language from localStorage
  const getCurrentLanguage = () => {
    return localStorage.getItem('preferredLanguage') || 'en';
  };

  // Format date based on language
  // Format date based on language
  const formatDate = (dateString, lang) => {
    
    // 1. Check for bad, missing, or null date strings
    if (!dateString || typeof dateString !== 'string') {
      console.error('A post was found with an empty or missing date.');
      return lang === 'fa' ? 'تاریخ نامشخص' : 'Date unavailable';
    }

    // 2. Try to create the date. This is where it was crashing.
    const date = new Date(dateString.trim()); // We add .trim() to fix spaces!

    // 3. Check if the date is invalid after we tried to make it
    if (isNaN(date.getTime())) {
      console.error('INVALID DATE DETECTED! The raw value was:', dateString);
      return lang === 'fa' ? 'تاریخ نامعتبر' : 'Invalid Date';
    }

    // 4. If we get here, the date is valid. Proceed as normal.
    if (lang === 'fa') {
      // Persian date format
      return new Intl.DateTimeFormat('fa-IR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }).format(date);
    } else {
      // English date format
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }).format(date);
    }
  };

  // Create a post card element
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
    
    // Make card clickable to open modal
    card.addEventListener('click', () => openModal(post, lang));
    
    return card;
  };

  // Create modal HTML element
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
    
    // Close modal on background click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });
    
    // Close modal on close button click
    modal.querySelector('.modal-close').addEventListener('click', closeModal);
    
    // Close modal on ESC key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('active')) {
        closeModal();
      }
    });
    
    return modal;
  };

  // Open modal with post content
  const openModal = (post, lang) => {
    let modal = document.getElementById('blogModal');
    if (!modal) {
      modal = createModal();
    }
    
    const summary = lang === 'fa' ? post.summaryFarsi : post.summaryEnglish;
    const formattedDate = formatDate(post.date, lang);
    
    // Update modal content
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
    
    // Show modal
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  };

  // Close modal
  const closeModal = () => {
    const modal = document.getElementById('blogModal');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  };

  // Load and display posts
  const loadPosts = async () => {
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

  // Also listen for custom language change event (if language is changed on same page)
  document.addEventListener('languageChanged', () => {
    loadPosts();
  });
});
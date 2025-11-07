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
  const formatDate = (dateString, lang) => {
    const date = new Date(dateString);
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
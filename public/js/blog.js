/*
  Nazarban Analytics - Enhanced Blog Page JavaScript
  Features:
  - Loading blog posts from API
  - Displaying bilingual content
  - 🚀 3D Parallax mouse tracking
  - ✨ Scroll-triggered animations
  - 📱 Gyroscope support for tablets
  - ⚡ Performance optimizations
  - ♿ Accessibility (reduced motion support)
*/

document.addEventListener('DOMContentLoaded', async () => {
  const postsContainer = document.getElementById('postsContainer');
  const loadingIndicator = document.getElementById('loadingIndicator');
  const errorMessage = document.getElementById('errorMessage');

  // Performance flags
  let isAnimating = false;
  let rafId = null;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = window.matchMedia('(max-width: 768px)').matches;
  const isTablet = window.matchMedia('(min-width: 769px) and (max-width: 1024px)').matches;
  const isDesktop = window.matchMedia('(min-width: 1025px)').matches;

  // Get current language from localStorage
  const getCurrentLanguage = () => {
    return localStorage.getItem('preferredLanguage') || 'en';
  };

  // Format date based on language
  const formatDate = (dateString, lang) => {
    // 1. Check for bad, missing, or null date strings
    if (!dateString || typeof dateString !== 'string') {
      console.error('A post was found with an empty or missing date.');
      return lang === 'fa' ? 'تاریخ نامشخص' : 'Date unavailable';
    }

    // 2. Try to create the date
    const date = new Date(dateString.trim());

    // 3. Check if the date is invalid after we tried to make it
    if (isNaN(date.getTime())) {
      console.error('INVALID DATE DETECTED! The raw value was:', dateString);
      return lang === 'fa' ? 'تاریخ نامعتبر' : 'Invalid Date';
    }

    // 4. If we get here, the date is valid. Proceed as normal.
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

  // ========================================
  // 🎨 3D PARALLAX & MOUSE TRACKING
  // ========================================

  let mouseX = 0;
  let mouseY = 0;
  let targetX = 0;
  let targetY = 0;

  // Smooth mouse tracking (throttled for performance)
  const handleMouseMove = (e) => {
    if (prefersReducedMotion || !isDesktop) return;
    
    // Calculate mouse position relative to viewport center (-1 to 1)
    mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    mouseY = (e.clientY / window.innerHeight) * 2 - 1;
  };

  // Smooth animation loop for parallax
  const animateParallax = () => {
    if (prefersReducedMotion || !isDesktop) return;

    // Smooth interpolation
    targetX += (mouseX - targetX) * 0.1;
    targetY += (mouseY - targetY) * 0.1;

    // Apply transforms to all visible cards
    const cards = document.querySelectorAll('.blog-post-card.visible');
    cards.forEach((card, index) => {
      // Different intensity for each card (creates depth)
      const intensity = 1 + (index * 0.2);
      const rotateY = targetX * 5 * intensity;
      const rotateX = -targetY * 5 * intensity;
      const translateZ = Math.abs(targetX + targetY) * 10 * intensity;

      card.style.transform = `
        perspective(1500px)
        rotateY(${rotateY}deg)
        rotateX(${rotateX}deg)
        translateZ(${translateZ}px)
        scale(1)
      `;
    });

    rafId = requestAnimationFrame(animateParallax);
  };

  // Start parallax on desktop
  if (isDesktop && !prefersReducedMotion) {
    document.addEventListener('mousemove', handleMouseMove);
    animateParallax();
  }

  // ========================================
  // 📱 GYROSCOPE SUPPORT FOR TABLETS
  // ========================================

  const handleOrientation = (e) => {
    if (prefersReducedMotion || !isTablet) return;

    // Get device orientation
    const beta = e.beta || 0;  // Front-to-back tilt (-180 to 180)
    const gamma = e.gamma || 0; // Left-to-right tilt (-90 to 90)

    // Normalize to -1 to 1 range
    const tiltX = Math.max(-1, Math.min(1, gamma / 45));
    const tiltY = Math.max(-1, Math.min(1, beta / 90));

    // Apply to cards
    const cards = document.querySelectorAll('.blog-post-card.visible');
    cards.forEach((card, index) => {
      const intensity = 1 + (index * 0.2);
      const rotateY = tiltX * 8 * intensity;
      const rotateX = -tiltY * 8 * intensity;

      card.style.transform = `
        perspective(1500px)
        rotateY(${rotateY}deg)
        rotateX(${rotateX}deg)
        scale(1)
      `;
    });
  };

  // Request gyroscope permission on iOS 13+
  const enableGyroscope = () => {
    if (isTablet && !prefersReducedMotion && typeof DeviceOrientationEvent !== 'undefined') {
      if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        // iOS 13+ requires permission
        DeviceOrientationEvent.requestPermission()
          .then(response => {
            if (response === 'granted') {
              window.addEventListener('deviceorientation', handleOrientation);
            }
          })
          .catch(console.error);
      } else {
        // Non-iOS devices
        window.addEventListener('deviceorientation', handleOrientation);
      }
    }
  };

  // Enable gyroscope if on tablet
  if (isTablet && !prefersReducedMotion) {
    enableGyroscope();
  }

  // ========================================
  // ✨ SCROLL-TRIGGERED ANIMATIONS
  // ========================================

  const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.1
  };

  const fadeInObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
      if (entry.isIntersecting) {
        // Stagger animation delay
        setTimeout(() => {
          entry.target.classList.add('visible');
        }, index * 100);
        
        // Stop observing once animated
        fadeInObserver.unobserve(entry.target);
      }
    });
  }, observerOptions);

  // Observe all cards when they're created
  const observeCards = () => {
    const cards = document.querySelectorAll('.blog-post-card:not(.visible)');
    cards.forEach(card => {
      fadeInObserver.observe(card);
    });
  };

  // ========================================
  // 🎯 HOVER TILT EFFECT (Desktop only)
  // ========================================

  const addCardHoverEffects = () => {
    if (isMobile || prefersReducedMotion) return;

    const cards = document.querySelectorAll('.blog-post-card');
    
    cards.forEach(card => {
      card.addEventListener('mouseenter', function() {
        this.classList.add('tilted');
      });

      card.addEventListener('mouseleave', function() {
        this.classList.remove('tilted');
        // Reset transform smoothly
        this.style.transform = '';
      });

      card.addEventListener('mousemove', function(e) {
        if (!this.classList.contains('tilted')) return;

        const rect = this.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = (y - centerY) / 10;
        const rotateY = (centerX - x) / 10;

        this.style.transform = `
          perspective(1000px)
          rotateX(${rotateX}deg)
          rotateY(${rotateY}deg)
          scale(1.02)
          translateZ(20px)
        `;
      });
    });
  };

  // ========================================
  // 📡 LOAD AND DISPLAY POSTS
  // ========================================

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

        // Initialize all effects after cards are loaded
        setTimeout(() => {
          observeCards();
          addCardHoverEffects();
        }, 100);

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

  // ========================================
  // 🎬 INITIALIZE
  // ========================================

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

  // ========================================
  // 🧹 CLEANUP
  // ========================================

  // Clean up on page unload
  window.addEventListener('beforeunload', () => {
    if (rafId) {
      cancelAnimationFrame(rafId);
    }
    document.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('deviceorientation', handleOrientation);
  });

  // Pause animations when tab is not visible (performance)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    } else {
      if (isDesktop && !prefersReducedMotion && !rafId) {
        animateParallax();
      }
    }
  });

  // ========================================
  // 🎪 EASTER EGG: Konami Code
  // ========================================

  let konamiCode = [];
  const konamiPattern = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  
  document.addEventListener('keydown', (e) => {
    konamiCode.push(e.key);
    konamiCode = konamiCode.slice(-10);
    
    if (konamiCode.join(',') === konamiPattern.join(',')) {
      // Activate super mode!
      document.body.style.animation = 'rainbow 2s linear infinite';
      
      const style = document.createElement('style');
      style.textContent = `
        @keyframes rainbow {
          0% { filter: hue-rotate(0deg); }
          100% { filter: hue-rotate(360deg); }
        }
      `;
      document.head.appendChild(style);
      
      setTimeout(() => {
        document.body.style.animation = '';
      }, 10000);
      
      console.log('🎉 KONAMI CODE ACTIVATED! 🎉');
    }
  });

  console.log('🚀 Floating Newspaper Blog Initialized!');
  console.log('📱 Device:', isMobile ? 'Mobile' : isTablet ? 'Tablet' : 'Desktop');
  console.log('✨ Effects:', prefersReducedMotion ? 'Reduced Motion' : 'Full Effects');
});
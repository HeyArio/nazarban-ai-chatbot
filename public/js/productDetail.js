/*
  Product Detail Page JavaScript
  - Loads individual product details from API
  - Displays product images, features, and information
  - Handles bilingual content
*/

document.addEventListener('DOMContentLoaded', async () => {
  const loadingState = document.getElementById('loadingState');
  const errorState = document.getElementById('errorState');
  const productContent = document.getElementById('productContent');

  // Get product ID from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id');

  if (!productId) {
    showError();
    return;
  }

  // Get current language
  const getCurrentLanguage = () => {
    return localStorage.getItem('preferredLanguage') || 'fa';
  };

  // Load product details
  const loadProductDetails = async () => {
    try {
      const response = await fetch('/api/products');
      const data = await response.json();

      if (!data.success || !data.products) {
        showError();
        return;
      }

      const product = data.products.find(p => p.id === productId);

      if (!product) {
        showError();
        return;
      }

      displayProduct(product);

    } catch (error) {
      console.error('Error loading product:', error);
      showError();
    }
  };

  // Convert YouTube/Vimeo/Aparat URL to embed URL
  const getEmbedUrl = (url) => {
    if (!url) return null;

    // YouTube
    const youtubeMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (youtubeMatch) {
      return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
    }

    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (vimeoMatch) {
      return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    }

    // Aparat (Iranian video platform)
    const aparatMatch = url.match(/aparat\.com\/v\/([a-zA-Z0-9]+)/);
    if (aparatMatch) {
      return `https://www.aparat.com/video/video/embed/videohash/${aparatMatch[1]}/vt/frame`;
    }

    return null;
  };

  // Display product details
  const displayProduct = (product) => {
    const lang = getCurrentLanguage();

    const name = lang === 'fa' ? product.nameFa : product.nameEn;
    const tagline = lang === 'fa' ? product.taglineFa : product.taglineEn;
    const description = lang === 'fa' ? product.descriptionFa : product.descriptionEn;
    const fullDescription = lang === 'fa' ? product.fullDescriptionFa : product.fullDescriptionEn;
    const features = lang === 'fa' ? product.featuresFa : product.featuresEn;
    const videoEmbedUrl = getEmbedUrl(product.videoUrl);

    // Update page title
    document.getElementById('page-title').textContent = `${name} - Nazarban AI`;

    // Status badge
    let statusBadge = '';
    if (product.status) {
      const statusText = {
        live: lang === 'fa' ? 'فعال' : 'Live',
        beta: lang === 'fa' ? 'بتا' : 'Beta',
        coming_soon: lang === 'fa' ? 'به زودی' : 'Coming Soon'
      };
      const statusClass = product.status === 'live' ? 'status-live' :
                          product.status === 'beta' ? 'status-beta' : 'status-coming';
      statusBadge = `<span class="product-status-badge ${statusClass}">${statusText[product.status]}</span>`;
    }

    // Build product HTML
    const productHTML = `
      <a href="products.html" class="back-link">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        ${lang === 'fa' ? 'بازگشت به محصولات' : 'Back to Products'}
      </a>

      <div class="product-detail-header">
        <h1 class="product-detail-title">${name}</h1>
        <p class="product-detail-tagline">${tagline}</p>
        ${statusBadge}
        ${videoEmbedUrl ? `
          <a href="#product-video" class="watch-video-link" onclick="event.preventDefault(); document.getElementById('product-video').scrollIntoView({ behavior: 'smooth' });">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <polygon points="5,3 19,12 5,21" fill="currentColor"/>
            </svg>
            ${lang === 'fa' ? 'مشاهده ویدیو' : 'Watch Demo Video'}
          </a>
        ` : ''}
      </div>

      <div class="product-detail-content">
        <div class="product-image-section">
          ${product.imageUrl
            ? `<img src="${product.imageUrl}" alt="${name}" class="product-detail-image" onerror="this.parentElement.innerHTML='<div class=&quot;product-image-placeholder&quot;>${lang === 'fa' ? 'تصویر موجود نیست' : 'Image not available'}</div>'">`
            : `<div class="product-image-placeholder">${lang === 'fa' ? 'تصویر موجود نیست' : 'Image not available'}</div>`
          }
        </div>

        <div class="product-info-section">
          <div>
            <p class="product-description">${fullDescription || description}</p>
          </div>

          ${features && features.length > 0 ? `
            <div class="product-features-section">
              <h3>${lang === 'fa' ? 'ویژگی‌های کلیدی:' : 'Key Features:'}</h3>
              <ul>
                ${features.map(feature => `<li>${feature}</li>`).join('')}
              </ul>
            </div>
          ` : ''}

          <div class="product-actions">
            ${product.url ? `
              <a href="${product.url}" target="_blank" rel="noopener noreferrer" class="product-action-btn btn-primary">
                <span>${lang === 'fa' ? 'مشاهده محصول' : 'Visit Product'}</span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </a>
            ` : ''}
            <a href="index.html" class="product-action-btn btn-secondary">
              <span>${lang === 'fa' ? 'تماس با ما' : 'Contact Us'}</span>
            </a>
          </div>
        </div>
      </div>

      ${videoEmbedUrl ? `
        <div id="product-video" class="product-video-section">
          <h3>${lang === 'fa' ? 'ویدیوی معرفی محصول' : 'Product Demo Video'}</h3>
          <div class="video-container">
            <iframe
              src="${videoEmbedUrl}"
              title="${name} video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowfullscreen>
            </iframe>
          </div>
        </div>
      ` : ''}
    `;

    loadingState.style.display = 'none';
    productContent.innerHTML = productHTML;
    productContent.style.display = 'block';
  };

  // Show error state
  const showError = () => {
    loadingState.style.display = 'none';
    errorState.style.display = 'block';
  };

  // Handle language change
  const handleLanguageChange = () => {
    loadProductDetails();
  };

  // Initialize
  await loadProductDetails();

  // Listen for language changes
  document.addEventListener('languageChanged', handleLanguageChange);
  window.addEventListener('storage', (e) => {
    if (e.key === 'preferredLanguage') {
      handleLanguageChange();
    }
  });
});

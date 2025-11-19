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
            ? `<img src="${product.imageUrl}" alt="${name}" class="product-detail-image" loading="lazy" onerror="this.parentElement.innerHTML='<div class=&quot;product-image-placeholder&quot;>${lang === 'fa' ? 'تصویر موجود نیست' : 'Image not available'}</div>'">`
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
            <a href="https://wa.me/989120437502" target="_blank" rel="noopener noreferrer" class="product-action-btn btn-secondary">
              <span>${lang === 'fa' ? 'تماس با ما' : 'Contact Us'}</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" fill="currentColor"/>
                <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18c-1.657 0-3.216-.497-4.505-1.35l-.29-.173-2.867.856.856-2.867-.173-.29A7.964 7.964 0 014 12c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z" fill="currentColor"/>
              </svg>
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

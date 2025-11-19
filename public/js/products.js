/*
  Nazarban Analytics - Products Page JavaScript
  Handles:
  - Loading products from API
  - Loading crypto data for ticker
  - Displaying bilingual SaaS product cards
  - Product detail modal
*/

document.addEventListener('DOMContentLoaded', async () => {
  // --- Get main DOM elements ---
  const productsContainer = document.getElementById('productsContainer');
  const loadingIndicator = document.getElementById('loadingIndicator');
  const errorMessage = document.getElementById('errorMessage');
  const emptyState = document.getElementById('emptyState');
  const cryptoTickerTrack = document.getElementById('cryptoTickerTrack');

  // --- Helper Functions ---
  const getCurrentLanguage = () => {
    return localStorage.getItem('preferredLanguage') || 'fa';
  };

  const createProductCard = (product, lang) => {
    const card = document.createElement('article');
    card.className = 'product-card';
    card.dataset.productId = product.id;
    card.style.cursor = 'pointer';

    const name = lang === 'fa' ? product.nameFa : product.nameEn;
    const tagline = lang === 'fa' ? product.taglineFa : product.taglineEn;
    const description = lang === 'fa' ? product.descriptionFa : product.descriptionEn;
    const features = lang === 'fa' ? product.featuresFa : product.featuresEn;

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
      statusBadge = `<span class="product-status ${statusClass}">${statusText[product.status]}</span>`;
    }

    // Category
    const categoryText = product.category || (lang === 'fa' ? 'محصول هوش مصنوعی' : 'AI Product');

    card.innerHTML = `
      <div class="product-header">
        ${statusBadge}
        ${product.imageUrl ? `
          <div class="product-image" style="width: 100%; aspect-ratio: 16/9; overflow: hidden; border-radius: 12px; margin-bottom: 1rem; background: linear-gradient(135deg, rgba(129, 140, 248, 0.1), rgba(192, 132, 252, 0.1));">
            <img src="${product.imageUrl}" alt="${name}" loading="lazy" style="width: 100%; height: 100%; object-fit: cover; object-position: center; transition: transform 0.3s ease;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'" onerror="this.parentElement.style.display='none'">
          </div>
        ` : ''}
        <h2 class="product-name">${name}</h2>
        <p class="product-tagline">${tagline}</p>
        <div class="product-category">${categoryText}</div>
      </div>
      <div class="product-content">
        <p class="product-description">${description}</p>
        ${features && features.length > 0 ? `
          <ul class="product-features">
            ${features.slice(0, 3).map(feature => `<li>${feature}</li>`).join('')}
          </ul>
        ` : ''}
      </div>
      <div class="product-footer">
        <a href="product-detail.html?id=${product.id}" class="product-link" style="background: linear-gradient(135deg, var(--brand1), var(--brand2)); color: white;">
          ${lang === 'fa' ? 'مشاهده جزئیات' : 'View Details'}
          <svg class="link-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 5l7 7-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </a>
      </div>
    `;

    return card;
  };

  const createModal = () => {
    const modal = document.createElement('div');
    modal.className = 'product-modal';
    modal.id = 'productModal';
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

  const openModal = (product, lang) => {
    let modal = document.getElementById('productModal');
    if (!modal) modal = createModal();

    const name = lang === 'fa' ? product.nameFa : product.nameEn;
    const tagline = lang === 'fa' ? product.taglineFa : product.taglineEn;
    const description = lang === 'fa' ? product.descriptionFa : product.descriptionEn;
    const features = lang === 'fa' ? product.featuresFa : product.featuresEn;

    // Status badge for modal
    let statusBadge = '';
    if (product.status) {
      const statusText = {
        live: lang === 'fa' ? 'فعال' : 'Live',
        beta: lang === 'fa' ? 'بتا' : 'Beta',
        coming_soon: lang === 'fa' ? 'به زودی' : 'Coming Soon'
      };
      const statusClass = product.status === 'live' ? 'status-live' :
                          product.status === 'beta' ? 'status-beta' : 'status-coming';
      statusBadge = `<span class="product-status ${statusClass}">${statusText[product.status]}</span>`;
    }

    modal.querySelector('.modal-title').textContent = name;
    modal.querySelector('.modal-meta').innerHTML = `
      ${statusBadge}
      <p class="product-tagline">${tagline}</p>
      ${product.category ? `<div class="product-category">${product.category}</div>` : ''}
    `;

    let bodyContent = `<p>${description}</p>`;
    if (features && features.length > 0) {
      bodyContent += `
        <h3>${lang === 'fa' ? 'ویژگی‌ها:' : 'Features:'}</h3>
        <ul class="product-features-list">
          ${features.map(feature => `<li>${feature}</li>`).join('')}
        </ul>
      `;
    }
    modal.querySelector('.modal-body').innerHTML = bodyContent;

    if (product.url) {
      modal.querySelector('.modal-footer').innerHTML = `
        <a href="${product.url}" target="_blank" rel="noopener noreferrer" class="modal-link">
          ${lang === 'fa' ? 'مشاهده محصول' : 'Visit Product'}
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
    const modal = document.getElementById('productModal');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  };

  // --- Main Products Loader ---
  const loadProducts = async () => {
    try {
      loadingIndicator.style.display = 'block';
      errorMessage.style.display = 'none';
      emptyState.style.display = 'none';
      productsContainer.innerHTML = '';

      const response = await fetch('/api/products');
      const data = await response.json();

      if (data.success && data.products && data.products.length > 0) {
        const lang = getCurrentLanguage();

        data.products.forEach(product => {
          const card = createProductCard(product, lang);
          productsContainer.appendChild(card);
        });
      } else {
        // No products available
        emptyState.style.display = 'block';
      }

      loadingIndicator.style.display = 'none';

    } catch (error) {
      console.error('Error loading products:', error);
      loadingIndicator.style.display = 'none';
      errorMessage.style.display = 'block';
    }
  };

  // --- Crypto Ticker Functions ---
  const createTickerItem = (coin) => {
    const item = document.createElement('a');
    item.className = 'ticker-item';
    item.href = `https://wallex.ir/buy-and-sell/${coin.symbol.toLowerCase()}`;
    item.target = '_blank';
    item.rel = 'noopener noreferrer';

    const change = parseFloat(coin.change_percent_24h) || 0;
    const priceNum = parseFloat(coin.price) || 0;
    const changeClass = change >= 0 ? 'positive' : 'negative';
    const changeSign = change >= 0 ? '+' : '';

    const price = priceNum.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    });

    item.innerHTML = `
      <span class="ticker-symbol">${coin.symbol}</span>
      <span class="ticker-price">${price}</span>
      <span class="ticker-change ${changeClass}">
        ${changeSign}${change.toFixed(2)}%
      </span>
    `;
    return item;
  };

  const loadCryptoData = async () => {
    if (!cryptoTickerTrack) return;

    try {
      const response = await fetch('/api/crypto/data');
      const data = await response.json();

      if (data.success && data.data && data.data.length > 0) {
        cryptoTickerTrack.innerHTML = '';
        const coins = data.data;

        coins.forEach(item => {
          const coin = item.json || item;
          cryptoTickerTrack.appendChild(createTickerItem(coin));
        });

        // Duplicate items for seamless scroll
        coins.forEach(item => {
          const coin = item.json || item;
          const duplicateItem = createTickerItem(coin);
          duplicateItem.setAttribute('aria-hidden', 'true');
          cryptoTickerTrack.appendChild(duplicateItem);
        });

      } else {
        if (cryptoTickerTrack.parentElement) {
          cryptoTickerTrack.parentElement.style.display = 'none';
        }
      }
    } catch (error) {
      console.error('Error loading crypto data:', error);
      if (cryptoTickerTrack.parentElement) {
        cryptoTickerTrack.parentElement.style.display = 'none';
      }
    }
  };

  // --- Initial Load ---
  const loadPageData = async () => {
    await loadProducts();
    loadCryptoData();
  };

  await loadPageData();

  // --- Event Listeners ---
  const handleLanguageChange = () => {
    loadPageData();
  };

  window.addEventListener('storage', (e) => {
    if (e.key === 'preferredLanguage') {
      handleLanguageChange();
    }
  });

  document.addEventListener('languageChanged', handleLanguageChange);
});

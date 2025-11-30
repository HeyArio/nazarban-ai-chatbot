/*
  Nazarban Analytics - Admin Panel JavaScript
  Handles: Prompts, Products, and FAQs management
*/

// ====================
// LOGIN SYSTEM
// ====================
const loginScreen = document.getElementById('loginScreen');
const adminPanel = document.getElementById('adminPanel');
const loginPassword = document.getElementById('loginPassword');
const loginBtn = document.getElementById('loginBtn');
const loginStatus = document.getElementById('loginStatus');

// SECURITY: Don't trust client-side auth flags
// The server will validate JWT on every admin API request
// We only check sessionStorage to avoid showing login screen unnecessarily
const hasSessionFlag = sessionStorage.getItem('adminAuthenticated');
if (hasSessionFlag === 'true') {
    // Verify with server that we actually have a valid JWT cookie
    verifyAuth();
}

async function verifyAuth() {
    try {
        // Try to access an admin endpoint to verify JWT is valid
        const response = await fetch('/api/prompts', {
            credentials: 'include' // Include cookies
        });

        if (response.ok) {
            // JWT is valid, show admin panel
            showAdminPanel();
        } else {
            // JWT expired or invalid, show login
            sessionStorage.removeItem('adminAuthenticated');
            loginScreen.style.display = 'flex';
        }
    } catch (error) {
        // Network error or server down, show login
        sessionStorage.removeItem('adminAuthenticated');
        loginScreen.style.display = 'flex';
    }
}

// Handle Enter key on login password field
loginPassword.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        login();
    }
});

// Handle login button click
loginBtn.addEventListener('click', login);

async function login() {
    const password = loginPassword.value;
    
    if (!password) {
        showLoginStatus('Please enter a password', true);
        return;
    }

    loginBtn.disabled = true;
    showLoginStatus('Verifying...', false);

    try {
        const response = await fetch('/api/admin/verify-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });

        if (response.ok) {
            sessionStorage.setItem('adminAuthenticated', 'true');
            showLoginStatus('Login successful!', false);
            setTimeout(showAdminPanel, 500);
        } else {
            showLoginStatus('Invalid password', true);
            loginPassword.value = '';
            loginPassword.focus();
        }
    } catch (error) {
        showLoginStatus('Connection error. Please try again.', true);
    } finally {
        loginBtn.disabled = false;
    }
}

function showAdminPanel() {
    loginScreen.style.display = 'none';
    adminPanel.style.display = 'block';
    loadPrompts(); // Load data when admin panel is shown
}

function showLoginStatus(message, isError) {
    loginStatus.textContent = message;
    loginStatus.className = isError ? 'status error' : 'status success';
    setTimeout(() => {
        loginStatus.textContent = '';
        loginStatus.className = 'status';
    }, 3000);
}

// ====================
// TAB SWITCHING
// ====================
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        // Remove active class from all tabs and contents
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

        // Add active class to clicked tab and corresponding content
        tab.classList.add('active');
        const tabName = tab.dataset.tab;
        document.getElementById(`${tabName}-tab`).classList.add('active');

        // Load data when switching to products, FAQs, or articles tab
        if (tabName === 'products') loadProducts();
        if (tabName === 'faqs') loadFaqs();
        if (tabName === 'articles') loadArticles();
    });
});

// ====================
// PROMPTS MANAGEMENT
// ====================
const mainSystemPromptEl = document.getElementById('mainSystemPrompt');
const summaryPromptEl = document.getElementById('summaryPrompt');
const proposalPromptEl = document.getElementById('proposalPrompt');
const promptPasswordEl = document.getElementById('promptPassword');
const savePromptsBtn = document.getElementById('savePromptsBtn');
const promptStatusEl = document.getElementById('promptStatus');

// Load prompts on page load
async function loadPrompts() {
    try {
        const response = await fetch('/api/prompts');
        if (!response.ok) throw new Error('Failed to fetch prompts');
        const prompts = await response.json();
        mainSystemPromptEl.value = prompts.mainSystemPrompt;
        summaryPromptEl.value = prompts.summaryPrompt;
        proposalPromptEl.value = prompts.proposalPrompt;
    } catch (error) {
        showStatus('promptStatus', error.message, true);
    }
}

// Save prompts
savePromptsBtn.addEventListener('click', async () => {
    const password = promptPasswordEl.value;
    if (!password) {
        showStatus('promptStatus', 'Password is required.', true);
        return;
    }

    savePromptsBtn.disabled = true;
    showStatus('promptStatus', 'Saving...', false);

    const updatedPrompts = {
        mainSystemPrompt: mainSystemPromptEl.value,
        summaryPrompt: summaryPromptEl.value,
        proposalPrompt: proposalPromptEl.value,
        password: password,
    };

    try {
        const response = await fetch('/api/prompts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedPrompts)
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        showStatus('promptStatus', result.message, false);
    } catch (error) {
        showStatus('promptStatus', error.message, true);
    } finally {
        savePromptsBtn.disabled = false;
    }
});

// ====================
// PRODUCTS MANAGEMENT
// ====================
let currentProducts = [];

async function loadProducts() {
    try {
        const response = await fetch('/api/products');
        const data = await response.json();
        if (data.success) {
            currentProducts = data.products;
            renderProductsList();
        }
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

function renderProductsList() {
    const container = document.getElementById('productsList');
    if (currentProducts.length === 0) {
        container.innerHTML = '<p style="color: var(--muted); text-align: center;">No products yet. Add your first product above!</p>';
        return;
    }

    container.innerHTML = currentProducts.map(product => `
        <div class="item-card">
            <div class="item-header">
                <div>
                    <div class="item-title">${product.nameEn} | ${product.nameFa}</div>
                    <div class="item-meta">
                        Status: ${product.status || 'live'} | Category: ${product.category || 'N/A'}
                        ${product.url ? ` | <a href="${product.url}" target="_blank" style="color: var(--brand1);">Visit</a>` : ''}
                    </div>
                </div>
                <div class="item-actions">
                    <button class="secondary product-edit-btn" data-product-id="${product.id}">Edit</button>
                    <button class="danger product-delete-btn" data-product-id="${product.id}">Delete</button>
                </div>
            </div>
            <p style="color: var(--muted); font-size: 0.9rem;">${product.descriptionEn.substring(0, 150)}...</p>
        </div>
    `).join('');

    // Add event listeners
    container.querySelectorAll('.product-edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            editProduct(e.target.dataset.productId);
        });
    });

    container.querySelectorAll('.product-delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            deleteProduct(e.target.dataset.productId);
        });
    });
}

function editProduct(id) {
    const product = currentProducts.find(p => p.id === id);
    if (!product) return;

    document.getElementById('productId').value = product.id;
    document.getElementById('productNameEn').value = product.nameEn;
    document.getElementById('productNameFa').value = product.nameFa;
    document.getElementById('productTaglineEn').value = product.taglineEn || '';
    document.getElementById('productTaglineFa').value = product.taglineFa || '';
    document.getElementById('productDescEn').value = product.descriptionEn;
    document.getElementById('productDescFa').value = product.descriptionFa;
    document.getElementById('productFullDescEn').value = product.fullDescriptionEn || '';
    document.getElementById('productFullDescFa').value = product.fullDescriptionFa || '';
    document.getElementById('productUrl').value = product.url || '';
    document.getElementById('productImageUrl').value = product.imageUrl || '';

    // Support both old string format and new multilingual object format for video URL
    if (product.videoUrl) {
        if (typeof product.videoUrl === 'string') {
            document.getElementById('productVideoUrlEn').value = product.videoUrl;
            document.getElementById('productVideoUrlFa').value = product.videoUrl;
        } else if (typeof product.videoUrl === 'object') {
            document.getElementById('productVideoUrlEn').value = product.videoUrl.en || '';
            document.getElementById('productVideoUrlFa').value = product.videoUrl.fa || '';
        }
    } else {
        document.getElementById('productVideoUrlEn').value = '';
        document.getElementById('productVideoUrlFa').value = '';
    }

    document.getElementById('productCategory').value = product.category || '';
    document.getElementById('productStatus').value = product.status || 'live';

    // Show image preview if image URL exists
    if (product.imageUrl) {
        showImagePreview(product.imageUrl);
    } else {
        hideImagePreview();
    }

    // Load features
    const featuresEnBuilder = document.getElementById('featuresEnBuilder');
    const featuresFaBuilder = document.getElementById('featuresFaBuilder');
    featuresEnBuilder.innerHTML = '';
    featuresFaBuilder.innerHTML = '';

    if (product.featuresEn && product.featuresEn.length > 0) {
        product.featuresEn.forEach(feature => {
            addFeatureInput('En', feature);
        });
    }

    if (product.featuresFa && product.featuresFa.length > 0) {
        product.featuresFa.forEach(feature => {
            addFeatureInput('Fa', feature);
        });
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function deleteProduct(id) {
    if (!confirm('Are you sure you want to delete this product?')) return;

    const password = prompt('Enter admin password:');
    if (!password) return;

    try {
        const response = await fetch(`/api/products/${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });

        const result = await response.json();
        if (result.success) {
            showStatus('productStatus', 'Product deleted successfully!', false);
            loadProducts();
        } else {
            showStatus('productStatus', result.message, true);
        }
    } catch (error) {
        showStatus('productStatus', error.message, true);
    }
}

document.getElementById('saveProductBtn').addEventListener('click', async () => {
    const password = document.getElementById('productPassword').value;
    if (!password) {
        showStatus('productStatus', 'Password is required.', true);
        return;
    }

    const id = document.getElementById('productId').value;
    const nameEn = document.getElementById('productNameEn').value;
    const nameFa = document.getElementById('productNameFa').value;
    const descriptionEn = document.getElementById('productDescEn').value;
    const descriptionFa = document.getElementById('productDescFa').value;

    if (!nameEn || !nameFa || !descriptionEn || !descriptionFa) {
        showStatus('productStatus', 'Please fill in all required fields.', true);
        return;
    }

    // Collect features
    const featuresEn = [];
    const featuresFa = [];

    document.querySelectorAll('#featuresEnBuilder input').forEach(input => {
        if (input.value.trim()) featuresEn.push(input.value.trim());
    });

    document.querySelectorAll('#featuresFaBuilder input').forEach(input => {
        if (input.value.trim()) featuresFa.push(input.value.trim());
    });

    const productData = {
        id: id || undefined,
        nameEn,
        nameFa,
        taglineEn: document.getElementById('productTaglineEn').value,
        taglineFa: document.getElementById('productTaglineFa').value,
        descriptionEn,
        descriptionFa,
        fullDescriptionEn: document.getElementById('productFullDescEn').value,
        fullDescriptionFa: document.getElementById('productFullDescFa').value,
        featuresEn,
        featuresFa,
        url: document.getElementById('productUrl').value,
        imageUrl: document.getElementById('productImageUrl').value,
        videoUrl: {
            en: document.getElementById('productVideoUrlEn').value,
            fa: document.getElementById('productVideoUrlFa').value
        },
        category: document.getElementById('productCategory').value,
        status: document.getElementById('productStatus').value,
        password
    };

    try {
        const response = await fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(productData)
        });

        const result = await response.json();
        if (result.success) {
            showStatus('productStatus', result.message, false);
            clearProductForm();
            loadProducts();
        } else {
            showStatus('productStatus', result.message, true);
        }
    } catch (error) {
        showStatus('productStatus', error.message, true);
    }
});

function clearProductForm() {
    document.getElementById('productId').value = '';
    document.getElementById('productNameEn').value = '';
    document.getElementById('productNameFa').value = '';
    document.getElementById('productTaglineEn').value = '';
    document.getElementById('productTaglineFa').value = '';
    document.getElementById('productDescEn').value = '';
    document.getElementById('productDescFa').value = '';
    document.getElementById('productFullDescEn').value = '';
    document.getElementById('productFullDescFa').value = '';
    document.getElementById('productUrl').value = '';
    document.getElementById('productImageUrl').value = '';
    document.getElementById('productVideoUrlEn').value = '';
    document.getElementById('productVideoUrlFa').value = '';
    document.getElementById('productCategory').value = '';
    document.getElementById('productStatus').value = 'live';
    document.getElementById('productPassword').value = '';
    document.getElementById('featuresEnBuilder').innerHTML = '';
    document.getElementById('featuresFaBuilder').innerHTML = '';

    // Clear image preview
    hideImagePreview();
}

// ====================
// IMAGE UPLOAD HANDLING
// ====================
const uploadImageBtn = document.getElementById('uploadImageBtn');
const productImageFile = document.getElementById('productImageFile');
const productImageUrl = document.getElementById('productImageUrl');
const imagePreview = document.getElementById('imagePreview');
const previewImg = document.getElementById('previewImg');
const removeImageBtn = document.getElementById('removeImageBtn');

// Trigger file input when upload button is clicked
uploadImageBtn.addEventListener('click', () => {
    productImageFile.click();
});

// Handle file selection
productImageFile.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
        alert('File too large. Maximum size is 5MB.');
        return;
    }

    // Show loading state
    uploadImageBtn.disabled = true;
    uploadImageBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin">
            <circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="32"/>
        </svg>
        Uploading...
    `;

    try {
        const formData = new FormData();
        formData.append('image', file);

        const response = await fetch('/api/upload/product-image', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            // Set the URL in the input field
            productImageUrl.value = result.imageUrl;
            // Show preview
            showImagePreview(result.imageUrl);
            showStatus('productStatus', 'Image uploaded successfully!', false);
        } else {
            alert(result.message || 'Failed to upload image');
        }
    } catch (error) {
        console.error('Upload error:', error);
        alert('Failed to upload image. Please try again.');
    } finally {
        // Reset button state
        uploadImageBtn.disabled = false;
        uploadImageBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
            </svg>
            Upload Image
        `;
        // Clear file input for re-selection
        productImageFile.value = '';
    }
});

// Handle URL input change - show preview
productImageUrl.addEventListener('input', (e) => {
    const url = e.target.value.trim();
    if (url) {
        showImagePreview(url);
    } else {
        hideImagePreview();
    }
});

// Remove image button
removeImageBtn.addEventListener('click', () => {
    productImageUrl.value = '';
    hideImagePreview();
});

function showImagePreview(url) {
    previewImg.src = url;
    imagePreview.style.display = 'inline-block';

    // Handle image load error
    previewImg.onerror = () => {
        hideImagePreview();
    };
}

function hideImagePreview() {
    imagePreview.style.display = 'none';
    previewImg.src = '';
}

function addFeatureInput(lang, value = '') {
    const builder = document.getElementById(`features${lang}Builder`);
    const featureItem = document.createElement('div');
    featureItem.className = 'feature-item';
    featureItem.innerHTML = `
        <input type="text" placeholder="Feature description" value="${value}">
        <button class="danger feature-remove-btn">Remove</button>
    `;
    builder.appendChild(featureItem);

    // Add event listener to the remove button
    const removeBtn = featureItem.querySelector('.feature-remove-btn');
    removeBtn.addEventListener('click', () => {
        featureItem.remove();
    });
}

// ====================
// FAQ MANAGEMENT
// ====================
let currentFaqs = [];

async function loadFaqs() {
    try {
        const response = await fetch('/api/faqs');
        const data = await response.json();
        if (data.success) {
            currentFaqs = data.faqs;
            renderFaqsList();
        }
    } catch (error) {
        console.error('Error loading FAQs:', error);
    }
}

function renderFaqsList() {
    const container = document.getElementById('faqsList');
    if (currentFaqs.length === 0) {
        container.innerHTML = '<p style="color: var(--muted); text-align: center;">No FAQs yet. Add your first FAQ above!</p>';
        return;
    }

    container.innerHTML = currentFaqs.map(faq => `
        <div class="item-card">
            <div class="item-header">
                <div>
                    <div class="item-title">${faq.questionEn}</div>
                    <div class="item-meta" style="direction: rtl;">${faq.questionFa}</div>
                </div>
                <div class="item-actions">
                    <button class="secondary faq-edit-btn" data-faq-id="${faq.id}">Edit</button>
                    <button class="danger faq-delete-btn" data-faq-id="${faq.id}">Delete</button>
                </div>
            </div>
            <p style="color: var(--muted); font-size: 0.9rem;">${faq.answerEn.substring(0, 150)}...</p>
        </div>
    `).join('');

    // Add event listeners
    container.querySelectorAll('.faq-edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            editFaq(e.target.dataset.faqId);
        });
    });

    container.querySelectorAll('.faq-delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            deleteFaq(e.target.dataset.faqId);
        });
    });
}

function editFaq(id) {
    const faq = currentFaqs.find(f => f.id === id);
    if (!faq) return;

    document.getElementById('faqId').value = faq.id;
    document.getElementById('faqQuestionEn').value = faq.questionEn;
    document.getElementById('faqQuestionFa').value = faq.questionFa;
    document.getElementById('faqAnswerEn').value = faq.answerEn;
    document.getElementById('faqAnswerFa').value = faq.answerFa;

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function deleteFaq(id) {
    if (!confirm('Are you sure you want to delete this FAQ?')) return;

    const password = prompt('Enter admin password:');
    if (!password) return;

    try {
        const response = await fetch(`/api/faqs/${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });

        const result = await response.json();
        if (result.success) {
            showStatus('faqStatus', 'FAQ deleted successfully!', false);
            loadFaqs();
        } else {
            showStatus('faqStatus', result.message, true);
        }
    } catch (error) {
        showStatus('faqStatus', error.message, true);
    }
}

document.getElementById('saveFaqBtn').addEventListener('click', async () => {
    const password = document.getElementById('faqPassword').value;
    if (!password) {
        showStatus('faqStatus', 'Password is required.', true);
        return;
    }

    const id = document.getElementById('faqId').value;
    const questionEn = document.getElementById('faqQuestionEn').value;
    const questionFa = document.getElementById('faqQuestionFa').value;
    const answerEn = document.getElementById('faqAnswerEn').value;
    const answerFa = document.getElementById('faqAnswerFa').value;

    if (!questionEn || !questionFa || !answerEn || !answerFa) {
        showStatus('faqStatus', 'Please fill in all required fields.', true);
        return;
    }

    const faqData = {
        id: id || undefined,
        questionEn,
        questionFa,
        answerEn,
        answerFa,
        password
    };

    try {
        const response = await fetch('/api/faqs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(faqData)
        });

        const result = await response.json();
        if (result.success) {
            showStatus('faqStatus', result.message, false);
            clearFaqForm();
            loadFaqs();
        } else {
            showStatus('faqStatus', result.message, true);
        }
    } catch (error) {
        showStatus('faqStatus', error.message, true);
    }
});

function clearFaqForm() {
    document.getElementById('faqId').value = '';
    document.getElementById('faqQuestionEn').value = '';
    document.getElementById('faqQuestionFa').value = '';
    document.getElementById('faqAnswerEn').value = '';
    document.getElementById('faqAnswerFa').value = '';
    document.getElementById('faqPassword').value = '';
}

// ====================
// ARTICLES MANAGEMENT
// ====================
let articles = [];

// Load articles from server
async function loadArticles() {
    try {
        const response = await fetch('/api/articles/custom');
        const data = await response.json();

        if (data.success) {
            articles = data.articles;
            renderArticlesList();
        }
    } catch (error) {
        console.error('Error loading custom articles:', error);
        showStatus('articleStatus', 'Error loading articles', true);
    }
}

function renderArticlesList() {
    const articlesList = document.getElementById('articlesList');
    articlesList.innerHTML = '';

    if (articles.length === 0) {
        articlesList.innerHTML = '<p style="color: var(--muted); text-align: center; padding: 2rem;">No articles yet. Add your first article above.</p>';
        return;
    }

    articles.forEach((article, index) => {
        const div = document.createElement('div');
        div.className = 'item-card';
        div.innerHTML = `
            <div class="item-header">
                <div>
                    <div class="item-title">${article.title.en} | ${article.title.fa}</div>
                    <div class="item-meta">Date: ${article.date}</div>
                </div>
                <div class="item-actions">
                    <button class="secondary article-edit-btn" data-article-id="${article.id}">Edit</button>
                    <button class="danger article-delete-btn" data-article-id="${article.id}">Delete</button>
                </div>
            </div>
            <p style="color: var(--muted); font-size: 0.9rem;">${article.summary.en.substring(0, 150)}...</p>
            ${article.url ? `<p style="color: var(--brand1); font-size: 0.85rem; margin-top: 0.5rem;"><a href="${article.url}" target="_blank">View Article</a></p>` : ''}
        `;
        articlesList.appendChild(div);
    });

    // Add event listeners using event delegation
    articlesList.querySelectorAll('.article-edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const articleId = e.target.dataset.articleId;
            editArticle(articleId);
        });
    });

    articlesList.querySelectorAll('.article-delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const articleId = e.target.dataset.articleId;
            deleteArticle(articleId);
        });
    });
}

async function addArticle() {
    const titleEn = document.getElementById('articleTitleEn').value.trim();
    const titleFa = document.getElementById('articleTitleFa').value.trim();
    const summaryEn = document.getElementById('articleSummaryEn').value.trim();
    const summaryFa = document.getElementById('articleSummaryFa').value.trim();
    const url = document.getElementById('articleUrl').value.trim();
    const date = document.getElementById('articleDate').value;
    const image = document.getElementById('articleImage').value.trim();
    const articleId = document.getElementById('articleId').value;

    if (!titleEn || !titleFa || !summaryEn || !summaryFa || !date) {
        showStatus('articleStatus', 'Please fill in all required fields (Title, Summary, Date)', true);
        return;
    }

    const article = {
        id: articleId || `article-${Date.now()}`,
        title: { en: titleEn, fa: titleFa },
        summary: { en: summaryEn, fa: summaryFa },
        url: url,
        date: date,
        image: image || 'https://via.placeholder.com/400x200'
    };

    let updatedArticles;
    if (articleId) {
        // Edit existing
        const index = articles.findIndex(a => a.id === articleId);
        if (index !== -1) {
            articles[index] = article;
            updatedArticles = [...articles];
        } else {
            showStatus('articleStatus', 'Article not found', true);
            return;
        }
    } else {
        // Add new
        updatedArticles = [article, ...articles];
    }

    // Save to server (JWT token sent automatically in cookie)
    try {
        const response = await fetch('/api/articles/custom', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin', // Include cookies
            body: JSON.stringify({ articles: updatedArticles })
        });

        const result = await response.json();
        if (result.success) {
            showStatus('articleStatus', articleId ? 'Article updated successfully!' : 'Article added successfully!', false);
            clearArticleForm();
            await loadArticles();
        } else {
            // If unauthorized, redirect to login
            if (response.status === 401) {
                sessionStorage.removeItem('adminAuthenticated');
                location.reload();
                return;
            }
            showStatus('articleStatus', result.message || 'Failed to save article', true);
        }
    } catch (error) {
        showStatus('articleStatus', error.message || 'Failed to save article', true);
    }
}

function editArticle(id) {
    const article = articles.find(a => a.id === id);
    if (!article) {
        showStatus('articleStatus', 'Article not found', true);
        return;
    }
    document.getElementById('articleId').value = article.id;
    document.getElementById('articleTitleEn').value = article.title.en;
    document.getElementById('articleTitleFa').value = article.title.fa;
    document.getElementById('articleSummaryEn').value = article.summary.en;
    document.getElementById('articleSummaryFa').value = article.summary.fa;
    document.getElementById('articleUrl').value = article.url || '';
    document.getElementById('articleDate').value = article.date;
    document.getElementById('articleImage').value = article.image || '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function deleteArticle(id) {
    if (!confirm('Are you sure you want to delete this article?')) return;

    const article = articles.find(a => a.id === id);
    if (!article) {
        showStatus('articleStatus', 'Article not found', true);
        return;
    }
    const updatedArticles = articles.filter(a => a.id !== id);

    try {
        const response = await fetch('/api/articles/custom', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin', // Include cookies
            body: JSON.stringify({ articles: updatedArticles })
        });

        const result = await response.json();
        if (result.success) {
            showStatus('articleStatus', 'Article deleted successfully!', false);
            await loadArticles();
        } else {
            // If unauthorized, redirect to login
            if (response.status === 401) {
                sessionStorage.removeItem('adminAuthenticated');
                location.reload();
                return;
            }
            showStatus('articleStatus', result.message || 'Failed to delete article', true);
        }
    } catch (error) {
        showStatus('articleStatus', error.message || 'Failed to delete article', true);
    }
}

function clearArticleForm() {
    document.getElementById('articleId').value = '';
    document.getElementById('articleTitleEn').value = '';
    document.getElementById('articleTitleFa').value = '';
    document.getElementById('articleSummaryEn').value = '';
    document.getElementById('articleSummaryFa').value = '';
    document.getElementById('articleUrl').value = '';
    document.getElementById('articleDate').value = '';
    document.getElementById('articleImage').value = '';
}

// Event listeners for articles
document.getElementById('addArticleBtn').addEventListener('click', addArticle);

// Set today's date as default
document.getElementById('articleDate').valueAsDate = new Date();

// ====================
// ABOUT PAGE VIDEO
// ====================

// Load current about video URL
async function loadAboutVideo() {
    try {
        const response = await fetch('/api/about/video');
        const data = await response.json();

        if (data.success && data.videoUrl) {
            // Support both old string format and new multilingual object format
            if (typeof data.videoUrl === 'string') {
                document.getElementById('aboutVideoUrlEn').value = data.videoUrl;
                document.getElementById('aboutVideoUrlFa').value = data.videoUrl;
            } else if (data.videoUrl && typeof data.videoUrl === 'object') {
                document.getElementById('aboutVideoUrlEn').value = data.videoUrl.en || '';
                document.getElementById('aboutVideoUrlFa').value = data.videoUrl.fa || '';
            }
        }
    } catch (error) {
        console.error('Error loading about video:', error);
    }
}

// Save about video URL
document.getElementById('saveAboutVideoBtn').addEventListener('click', async () => {
    const videoUrlEn = document.getElementById('aboutVideoUrlEn').value.trim();
    const videoUrlFa = document.getElementById('aboutVideoUrlFa').value.trim();
    const password = document.getElementById('aboutPassword').value;

    if (!password) {
        showStatus('aboutStatus', 'Password required', true);
        return;
    }

    try {
        const response = await fetch('/api/about/video', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                videoUrl: {
                    en: videoUrlEn,
                    fa: videoUrlFa
                },
                password
            })
        });

        const data = await response.json();

        if (data.success) {
            showStatus('aboutStatus', 'Video URLs saved successfully', false);
            document.getElementById('aboutPassword').value = '';
        } else {
            showStatus('aboutStatus', data.error || 'Failed to save', true);
        }
    } catch (error) {
        showStatus('aboutStatus', error.message, true);
    }
});

// Preview about video
document.getElementById('previewAboutVideoBtn').addEventListener('click', () => {
    const videoUrl = document.getElementById('aboutVideoUrlEn').value.trim() || document.getElementById('aboutVideoUrlFa').value.trim();

    if (!videoUrl) {
        showStatus('aboutStatus', 'Please enter a video URL first', true);
        return;
    }

    const embedUrl = getEmbedUrl(videoUrl);

    if (!embedUrl) {
        showStatus('aboutStatus', 'Invalid video URL format', true);
        return;
    }

    const previewContainer = document.getElementById('aboutVideoPreviewContainer');
    const previewSection = document.getElementById('aboutVideoPreview');

    if (isDirectVideo(embedUrl)) {
        previewContainer.innerHTML = `
            <video controls controlsList="nodownload" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border-radius: 8px;">
                <source src="${embedUrl}" type="${embedUrl.endsWith('.m3u8') ? 'application/x-mpegURL' : 'video/mp4'}">
                Your browser does not support the video tag.
            </video>
        `;
    } else {
        previewContainer.innerHTML = `
            <iframe
                src="${embedUrl}"
                style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; border-radius: 8px;"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowfullscreen>
            </iframe>
        `;
    }

    previewSection.style.display = 'block';
    showStatus('aboutStatus', 'Preview loaded', false);
});

// Helper function: Convert video URL to embed URL
function getEmbedUrl(url) {
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

    // Aparat
    const aparatMatch = url.match(/aparat\.com\/v\/([a-zA-Z0-9]+)/);
    if (aparatMatch) {
        return `https://www.aparat.com/video/video/embed/videohash/${aparatMatch[1]}/vt/frame`;
    }

    // Arvan Cloud VOD or direct video
    const arvanMatch = url.match(/https?:\/\/([^\/]+\.arvanvod\.ir\/[^\/]+\/[^\/]+)/);
    if (arvanMatch || url.match(/\.(mp4|webm|ogg|m3u8)$/i)) {
        return url;
    }

    // If already an embed URL
    if (url.includes('embed')) {
        return url;
    }

    return null;
}

// Helper function: Check if URL is a direct video file
function isDirectVideo(url) {
    return url && (url.includes('arvanvod.ir') || url.match(/\.(mp4|webm|ogg|m3u8)$/i));
}

// Load about video on page load
loadAboutVideo();

// ====================
// SERVICES VIDEOS MANAGEMENT
// ====================

// Load current services videos
async function loadServicesVideos() {
    try {
        const response = await fetch('/api/services/videos');
        const data = await response.json();

        if (data.success && data.videos) {
            // Support both old string format and new multilingual object format
            const setVideoInputs = (service, inputEnId, inputFaId) => {
                const videoData = data.videos[service];
                if (typeof videoData === 'string') {
                    document.getElementById(inputEnId).value = videoData;
                    document.getElementById(inputFaId).value = videoData;
                } else if (videoData && typeof videoData === 'object') {
                    document.getElementById(inputEnId).value = videoData.en || '';
                    document.getElementById(inputFaId).value = videoData.fa || '';
                } else {
                    document.getElementById(inputEnId).value = '';
                    document.getElementById(inputFaId).value = '';
                }
            };

            setVideoInputs('strategy', 'strategyVideoUrlEn', 'strategyVideoUrlFa');
            setVideoInputs('development', 'developmentVideoUrlEn', 'developmentVideoUrlFa');
            setVideoInputs('automation', 'automationVideoUrlEn', 'automationVideoUrlFa');
        }
    } catch (error) {
        console.error('Error loading services videos:', error);
    }
}

// Save services videos
document.getElementById('saveServicesVideosBtn').addEventListener('click', async () => {
    const strategyUrlEn = document.getElementById('strategyVideoUrlEn').value.trim();
    const strategyUrlFa = document.getElementById('strategyVideoUrlFa').value.trim();
    const developmentUrlEn = document.getElementById('developmentVideoUrlEn').value.trim();
    const developmentUrlFa = document.getElementById('developmentVideoUrlFa').value.trim();
    const automationUrlEn = document.getElementById('automationVideoUrlEn').value.trim();
    const automationUrlFa = document.getElementById('automationVideoUrlFa').value.trim();
    const password = document.getElementById('servicesPassword').value;

    if (!password) {
        showStatus('servicesStatus', 'Password required', true);
        return;
    }

    try {
        const response = await fetch('/api/services/videos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                videos: {
                    strategy: { en: strategyUrlEn, fa: strategyUrlFa },
                    development: { en: developmentUrlEn, fa: developmentUrlFa },
                    automation: { en: automationUrlEn, fa: automationUrlFa }
                },
                password
            })
        });

        const data = await response.json();

        if (data.success) {
            showStatus('servicesStatus', 'Services videos saved successfully', false);
            document.getElementById('servicesPassword').value = '';
        } else {
            showStatus('servicesStatus', data.error || 'Failed to save', true);
        }
    } catch (error) {
        showStatus('servicesStatus', error.message, true);
    }
});

// Load services videos on page load
loadServicesVideos();

// ====================
// PAGE CONTENT MANAGEMENT
// ====================

// SERVICES CONTENT
async function loadServicesContent() {
    try {
        const response = await fetch('/api/content/services');
        const data = await response.json();

        if (data.success && data.content) {
            const c = data.content;
            document.getElementById('servicesTitle_en').value = c.en?.title || '';
            document.getElementById('servicesTitle_fa').value = c.fa?.title || '';
            document.getElementById('servicesIntro_en').value = c.en?.intro || '';
            document.getElementById('servicesIntro_fa').value = c.fa?.intro || '';

            // Service 1
            document.getElementById('service1Title_en').value = c.en?.service1?.title || '';
            document.getElementById('service1Title_fa').value = c.fa?.service1?.title || '';
            document.getElementById('service1Desc_en').value = c.en?.service1?.desc || '';
            document.getElementById('service1Desc_fa').value = c.fa?.service1?.desc || '';
            document.getElementById('service1Li1_en').value = c.en?.service1?.li1 || '';
            document.getElementById('service1Li1_fa').value = c.fa?.service1?.li1 || '';
            document.getElementById('service1Li2_en').value = c.en?.service1?.li2 || '';
            document.getElementById('service1Li2_fa').value = c.fa?.service1?.li2 || '';
            document.getElementById('service1Li3_en').value = c.en?.service1?.li3 || '';
            document.getElementById('service1Li3_fa').value = c.fa?.service1?.li3 || '';

            // Service 2
            document.getElementById('service2Title_en').value = c.en?.service2?.title || '';
            document.getElementById('service2Title_fa').value = c.fa?.service2?.title || '';
            document.getElementById('service2Desc_en').value = c.en?.service2?.desc || '';
            document.getElementById('service2Desc_fa').value = c.fa?.service2?.desc || '';
            document.getElementById('service2Li1_en').value = c.en?.service2?.li1 || '';
            document.getElementById('service2Li1_fa').value = c.fa?.service2?.li1 || '';
            document.getElementById('service2Li2_en').value = c.en?.service2?.li2 || '';
            document.getElementById('service2Li2_fa').value = c.fa?.service2?.li2 || '';
            document.getElementById('service2Li3_en').value = c.en?.service2?.li3 || '';
            document.getElementById('service2Li3_fa').value = c.fa?.service2?.li3 || '';

            // Service 3
            document.getElementById('service3Title_en').value = c.en?.service3?.title || '';
            document.getElementById('service3Title_fa').value = c.fa?.service3?.title || '';
            document.getElementById('service3Desc_en').value = c.en?.service3?.desc || '';
            document.getElementById('service3Desc_fa').value = c.fa?.service3?.desc || '';
            document.getElementById('service3Li1_en').value = c.en?.service3?.li1 || '';
            document.getElementById('service3Li1_fa').value = c.fa?.service3?.li1 || '';
            document.getElementById('service3Li2_en').value = c.en?.service3?.li2 || '';
            document.getElementById('service3Li2_fa').value = c.fa?.service3?.li2 || '';
            document.getElementById('service3Li3_en').value = c.en?.service3?.li3 || '';
            document.getElementById('service3Li3_fa').value = c.fa?.service3?.li3 || '';

            document.getElementById('servicesContact_en').value = c.en?.contact || '';
            document.getElementById('servicesContact_fa').value = c.fa?.contact || '';
        }
    } catch (error) {
        console.error('Error loading services content:', error);
    }
}

document.getElementById('saveServicesContentBtn').addEventListener('click', async () => {
    const password = document.getElementById('servicesContentPassword').value;

    if (!password) {
        showStatus('servicesContentStatus', 'Password required', true);
        return;
    }

    const content = {
        en: {
            title: document.getElementById('servicesTitle_en').value.trim(),
            intro: document.getElementById('servicesIntro_en').value.trim(),
            service1: {
                title: document.getElementById('service1Title_en').value.trim(),
                desc: document.getElementById('service1Desc_en').value.trim(),
                li1: document.getElementById('service1Li1_en').value.trim(),
                li2: document.getElementById('service1Li2_en').value.trim(),
                li3: document.getElementById('service1Li3_en').value.trim()
            },
            service2: {
                title: document.getElementById('service2Title_en').value.trim(),
                desc: document.getElementById('service2Desc_en').value.trim(),
                li1: document.getElementById('service2Li1_en').value.trim(),
                li2: document.getElementById('service2Li2_en').value.trim(),
                li3: document.getElementById('service2Li3_en').value.trim()
            },
            service3: {
                title: document.getElementById('service3Title_en').value.trim(),
                desc: document.getElementById('service3Desc_en').value.trim(),
                li1: document.getElementById('service3Li1_en').value.trim(),
                li2: document.getElementById('service3Li2_en').value.trim(),
                li3: document.getElementById('service3Li3_en').value.trim()
            },
            contact: document.getElementById('servicesContact_en').value.trim()
        },
        fa: {
            title: document.getElementById('servicesTitle_fa').value.trim(),
            intro: document.getElementById('servicesIntro_fa').value.trim(),
            service1: {
                title: document.getElementById('service1Title_fa').value.trim(),
                desc: document.getElementById('service1Desc_fa').value.trim(),
                li1: document.getElementById('service1Li1_fa').value.trim(),
                li2: document.getElementById('service1Li2_fa').value.trim(),
                li3: document.getElementById('service1Li3_fa').value.trim()
            },
            service2: {
                title: document.getElementById('service2Title_fa').value.trim(),
                desc: document.getElementById('service2Desc_fa').value.trim(),
                li1: document.getElementById('service2Li1_fa').value.trim(),
                li2: document.getElementById('service2Li2_fa').value.trim(),
                li3: document.getElementById('service2Li3_fa').value.trim()
            },
            service3: {
                title: document.getElementById('service3Title_fa').value.trim(),
                desc: document.getElementById('service3Desc_fa').value.trim(),
                li1: document.getElementById('service3Li1_fa').value.trim(),
                li2: document.getElementById('service3Li2_fa').value.trim(),
                li3: document.getElementById('service3Li3_fa').value.trim()
            },
            contact: document.getElementById('servicesContact_fa').value.trim()
        }
    };

    try {
        const response = await fetch('/api/content/services', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content, password })
        });

        const data = await response.json();

        if (data.success) {
            showStatus('servicesContentStatus', 'Services content saved successfully', false);
            document.getElementById('servicesContentPassword').value = '';
        } else {
            showStatus('servicesContentStatus', data.message || 'Failed to save', true);
        }
    } catch (error) {
        showStatus('servicesContentStatus', error.message, true);
    }
});

// ABOUT CONTENT
async function loadAboutContent() {
    try {
        const response = await fetch('/api/content/about');
        const data = await response.json();

        if (data.success && data.content) {
            const c = data.content;
            document.getElementById('aboutTitle_en').value = c.en?.title || '';
            document.getElementById('aboutTitle_fa').value = c.fa?.title || '';
            document.getElementById('aboutIntro_en').value = c.en?.intro || '';
            document.getElementById('aboutIntro_fa').value = c.fa?.intro || '';
            document.getElementById('aboutMissionTitle_en').value = c.en?.missionTitle || '';
            document.getElementById('aboutMissionTitle_fa').value = c.fa?.missionTitle || '';
            document.getElementById('aboutMissionText_en').value = c.en?.missionText || '';
            document.getElementById('aboutMissionText_fa').value = c.fa?.missionText || '';
        }
    } catch (error) {
        console.error('Error loading about content:', error);
    }
}

document.getElementById('saveAboutContentBtn').addEventListener('click', async () => {
    const password = document.getElementById('aboutContentPassword').value;

    if (!password) {
        showStatus('aboutContentStatus', 'Password required', true);
        return;
    }

    const content = {
        en: {
            title: document.getElementById('aboutTitle_en').value.trim(),
            intro: document.getElementById('aboutIntro_en').value.trim(),
            missionTitle: document.getElementById('aboutMissionTitle_en').value.trim(),
            missionText: document.getElementById('aboutMissionText_en').value.trim()
        },
        fa: {
            title: document.getElementById('aboutTitle_fa').value.trim(),
            intro: document.getElementById('aboutIntro_fa').value.trim(),
            missionTitle: document.getElementById('aboutMissionTitle_fa').value.trim(),
            missionText: document.getElementById('aboutMissionText_fa').value.trim()
        }
    };

    try {
        const response = await fetch('/api/content/about', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content, password })
        });

        const data = await response.json();

        if (data.success) {
            showStatus('aboutContentStatus', 'About content saved successfully', false);
            document.getElementById('aboutContentPassword').value = '';
        } else {
            showStatus('aboutContentStatus', data.message || 'Failed to save', true);
        }
    } catch (error) {
        showStatus('aboutContentStatus', error.message, true);
    }
});

// WHITEPAPER CONTENT
async function loadWhitepaperContent() {
    try {
        const response = await fetch('/api/content/whitepaper');
        const data = await response.json();

        if (data.success && data.content) {
            const c = data.content;
            document.getElementById('wpMainTitle_en').value = c.en?.mainTitle || '';
            document.getElementById('wpMainTitle_fa').value = c.fa?.mainTitle || '';
            document.getElementById('wpVisionTitle_en').value = c.en?.visionTitle || '';
            document.getElementById('wpVisionTitle_fa').value = c.fa?.visionTitle || '';
            document.getElementById('wpVisionText_en').value = c.en?.visionText || '';
            document.getElementById('wpVisionText_fa').value = c.fa?.visionText || '';
            document.getElementById('wpWhynowTitle_en').value = c.en?.whynowTitle || '';
            document.getElementById('wpWhynowTitle_fa').value = c.fa?.whynowTitle || '';
            document.getElementById('wpWhynowText_en').value = c.en?.whynowText || '';
            document.getElementById('wpWhynowText_fa').value = c.fa?.whynowText || '';
            document.getElementById('wpCtaTitle_en').value = c.en?.ctaTitle || '';
            document.getElementById('wpCtaTitle_fa').value = c.fa?.ctaTitle || '';
            document.getElementById('wpCtaText_en').value = c.en?.ctaText || '';
            document.getElementById('wpCtaText_fa').value = c.fa?.ctaText || '';
        }
    } catch (error) {
        console.error('Error loading whitepaper content:', error);
    }
}

document.getElementById('saveWhitepaperContentBtn').addEventListener('click', async () => {
    const password = document.getElementById('whitepaperContentPassword').value;

    if (!password) {
        showStatus('whitepaperContentStatus', 'Password required', true);
        return;
    }

    const content = {
        en: {
            mainTitle: document.getElementById('wpMainTitle_en').value.trim(),
            visionTitle: document.getElementById('wpVisionTitle_en').value.trim(),
            visionText: document.getElementById('wpVisionText_en').value.trim(),
            whynowTitle: document.getElementById('wpWhynowTitle_en').value.trim(),
            whynowText: document.getElementById('wpWhynowText_en').value.trim(),
            ctaTitle: document.getElementById('wpCtaTitle_en').value.trim(),
            ctaText: document.getElementById('wpCtaText_en').value.trim()
        },
        fa: {
            mainTitle: document.getElementById('wpMainTitle_fa').value.trim(),
            visionTitle: document.getElementById('wpVisionTitle_fa').value.trim(),
            visionText: document.getElementById('wpVisionText_fa').value.trim(),
            whynowTitle: document.getElementById('wpWhynowTitle_fa').value.trim(),
            whynowText: document.getElementById('wpWhynowText_fa').value.trim(),
            ctaTitle: document.getElementById('wpCtaTitle_fa').value.trim(),
            ctaText: document.getElementById('wpCtaText_fa').value.trim()
        }
    };

    try {
        const response = await fetch('/api/content/whitepaper', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content, password })
        });

        const data = await response.json();

        if (data.success) {
            showStatus('whitepaperContentStatus', 'Whitepaper content saved successfully', false);
            document.getElementById('whitepaperContentPassword').value = '';
        } else {
            showStatus('whitepaperContentStatus', data.message || 'Failed to save', true);
        }
    } catch (error) {
        showStatus('whitepaperContentStatus', error.message, true);
    }
});

// Load all page content on page load
loadServicesContent();
loadAboutContent();
loadWhitepaperContent();

// ====================
// UTILITY FUNCTIONS
// ====================
function showStatus(elementId, message, isError) {
    const statusEl = document.getElementById(elementId);
    statusEl.textContent = message;
    statusEl.className = `status ${isError ? 'error' : 'success'}`;
    setTimeout(() => statusEl.textContent = '', 4000);
}

// Prompts are now loaded after successful login via showAdminPanel()

// ====================
// EVENT LISTENERS FOR CLEAR BUTTONS AND ADD FEATURE BUTTONS
// ====================
document.getElementById('clearProductBtn').addEventListener('click', clearProductForm);
document.getElementById('clearFaqBtn').addEventListener('click', clearFaqForm);
document.getElementById('clearArticleBtn').addEventListener('click', clearArticleForm);
document.getElementById('addFeatureEnBtn').addEventListener('click', () => addFeatureInput('En'));
document.getElementById('addFeatureFaBtn').addEventListener('click', () => addFeatureInput('Fa'));
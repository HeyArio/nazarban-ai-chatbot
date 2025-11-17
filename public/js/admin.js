/*
  Nazarban Analytics - Admin Panel JavaScript
  Handles: Prompts, Products, and FAQs management
*/

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

        // Load data when switching to products or FAQs tab
        if (tabName === 'products') loadProducts();
        if (tabName === 'faqs') loadFaqs();
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
                    <button class="secondary" onclick="editProduct('${product.id}')">Edit</button>
                    <button class="danger" onclick="deleteProduct('${product.id}')">Delete</button>
                </div>
            </div>
            <p style="color: var(--muted); font-size: 0.9rem;">${product.descriptionEn.substring(0, 150)}...</p>
        </div>
    `).join('');
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
    document.getElementById('productUrl').value = product.url || '';
    document.getElementById('productCategory').value = product.category || '';
    document.getElementById('productStatus').value = product.status || 'live';

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
        featuresEn,
        featuresFa,
        url: document.getElementById('productUrl').value,
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
    document.getElementById('productUrl').value = '';
    document.getElementById('productCategory').value = '';
    document.getElementById('productStatus').value = 'live';
    document.getElementById('productPassword').value = '';
    document.getElementById('featuresEnBuilder').innerHTML = '';
    document.getElementById('featuresFaBuilder').innerHTML = '';
}

function addFeatureInput(lang, value = '') {
    const builder = document.getElementById(`features${lang}Builder`);
    const featureItem = document.createElement('div');
    featureItem.className = 'feature-item';
    featureItem.innerHTML = `
        <input type="text" placeholder="Feature description" value="${value}">
        <button class="danger" onclick="this.parentElement.remove()">Remove</button>
    `;
    builder.appendChild(featureItem);
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
                    <button class="secondary" onclick="editFaq('${faq.id}')">Edit</button>
                    <button class="danger" onclick="deleteFaq('${faq.id}')">Delete</button>
                </div>
            </div>
            <p style="color: var(--muted); font-size: 0.9rem;">${faq.answerEn.substring(0, 150)}...</p>
        </div>
    `).join('');
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
// UTILITY FUNCTIONS
// ====================
function showStatus(elementId, message, isError) {
    const statusEl = document.getElementById(elementId);
    statusEl.textContent = message;
    statusEl.className = `status ${isError ? 'error' : 'success'}`;
    setTimeout(() => statusEl.textContent = '', 4000);
}

// Load prompts on page load
document.addEventListener('DOMContentLoaded', loadPrompts);

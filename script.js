// Store Configuration
const WA_NUMBER = "9779761806448";
let products = [];
let cart = JSON.parse(localStorage.getItem("cart") || "[]");
let activeCategory = "";

// Order Rate-Limiting & Duplicate Prevention State
let isOrderProcessing = false;
let lastOrderTime = 0;
const ORDER_COOLDOWN_MS = 2500;
const addToCartTimestamps = {};

// Helpers
const escapeHTML = (str) => String(str || "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/\"/g, "&quot;")
  .replace(/'/g, "&#39;");

const escapeJS = (str) => String(str || "")
  .replace(/\\/g, "\\\\")
  .replace(/'/g, "\\'");

const formatPrice = (v) => `रु ${Number(v || 0).toLocaleString('ne-NP')}`;

const findProductByCode = (code) => products.find(p => p.code === code);

// Initial Load
fetch("products.json")
  .then(res => res.json())
  .then(data => {
    products = data;
    renderCategories(products);
    renderProducts(products);
    updateCartUI();
  })
  .catch(err => {
    console.error("Failed to load products:", err);
    const container = document.getElementById("products");
    if (container) {
      container.innerHTML = "<p class='state-msg'>Unable to load catalog. Please check your internet connection and refresh.</p>";
    }
  });

function saveCart() {
  try {
    localStorage.setItem("cart", JSON.stringify(cart));
  } catch (e) {
    console.warn("Storage quota full", e);
  }
}

function renderCategories(data) {
  const categories = [...new Set(data.map(p => p.category).filter(Boolean))];
  const nav = document.getElementById("categories");
  if (!nav) return;

  nav.innerHTML = `<button class="cat-pill active" data-category="">All Items</button>` +
    categories.map(cat =>
      `<button class="cat-pill" data-category="${escapeHTML(cat)}">${escapeHTML(cat)}</button>`
    ).join('');
}

function setCategory(cat) {
  activeCategory = cat || "";
  document.querySelectorAll(".cat-pill").forEach(btn => {
    const isTarget = (btn.dataset.category || "") === activeCategory;
    btn.classList.toggle("active", isTarget);
  });
  filterAndRender();
}

function filterAndRender() {
  const searchInput = document.getElementById("search");
  const keyword = (searchInput ? searchInput.value : "").trim().toLowerCase();

  let filtered = products;

  if (activeCategory) {
    filtered = filtered.filter(p => (p.category || "").toLowerCase() === activeCategory.toLowerCase());
  }

  if (keyword) {
    filtered = filtered.filter(p =>
      (p.name || "").toLowerCase().includes(keyword) ||
      (p.code || "").toLowerCase().includes(keyword) ||
      (p.description || "").toLowerCase().includes(keyword)
    );
  }

  renderProducts(filtered);
}

function renderProducts(list) {
  const container = document.getElementById("products");
  if (!container) return;

  if (list.length === 0) {
    container.innerHTML = `<div class="empty-state"><p>No accessories found matching your criteria.</p></div>`;
    return;
  }

  const html = list.map((p, idx) => {
    const safeName = escapeHTML(p.name);
    const safeAvail = escapeHTML(p.availability || "In Stock");
    const discount = p.originalPrice > 0
      ? Math.round((1 - (p.discountedPrice / p.originalPrice)) * 100)
      : 0;
    const isOut = (p.availability || '').toLowerCase().includes("out of stock");
    const codeArg = `'${escapeJS(p.code)}'`;
    const loadingAttr = idx < 4 ? 'eager' : 'lazy';

    return `
      <article class="product-card ${isOut ? 'out-of-stock' : ''}">
        <div class="card-img-wrap" data-code=${codeArg}>
          <img class="product-image" data-code=${codeArg} src="images/${encodeURI(p.mainImage)}" loading="${loadingAttr}" decoding="async" alt="${safeName}" onerror="this.src='images/logo.png'" />
          ${discount > 0 ? `<span class="badge-discount">${discount}% OFF</span>` : ''}
        </div>
        <div class="card-body">
          <div class="card-meta">
            <span class="badge-stock ${isOut ? 'out' : 'in'}">${safeAvail}</span>
            <span class="card-code">${escapeHTML(p.code)}</span>
          </div>
          <h3 class="product-title" data-code=${codeArg} title="${safeName}">${safeName}</h3>
          <div class="price-stack">
            <span class="price-discounted">${formatPrice(p.discountedPrice)}</span>
            ${p.originalPrice > p.discountedPrice ? `<span class="price-original">${formatPrice(p.originalPrice)}</span>` : ''}
          </div>
          <div class="card-actions">
            <button class="btn-card-add" data-code=${codeArg} ${isOut ? 'disabled' : ''}>
              ${isOut ? 'Out of Stock' : 'Add to Cart'}
            </button>
            <button class="btn-card-buy" data-code=${codeArg} ${isOut ? 'disabled' : ''} aria-label="Direct order ${safeName} on WhatsApp">
              Buy Now
            </button>
          </div>
        </div>
      </article>
    `;
  }).join('');

  container.innerHTML = html;
}

// Add to Cart with Rate Limiting / Debounce
function addToCart(code, sourceBtn) {
  const now = Date.now();
  if (addToCartTimestamps[code] && (now - addToCartTimestamps[code] < 450)) {
    return; // Ignore rapid accidental double-taps
  }
  addToCartTimestamps[code] = now;

  const p = findProductByCode(code);
  if (!p) return;

  const found = cart.find(item => item.code === p.code);
  if (found) {
    found.qty++;
  } else {
    cart.push({ ...p, qty: 1 });
  }

  updateCartUI();
  saveCart();
  showToast(`Added ${p.name} to cart`);

  // Visual button feedback
  if (sourceBtn && !sourceBtn.disabled) {
    const originalText = sourceBtn.textContent;
    sourceBtn.textContent = "Added ✓";
    sourceBtn.classList.add("added-feedback");
    setTimeout(() => {
      sourceBtn.textContent = originalText;
      sourceBtn.classList.remove("added-feedback");
    }, 800);
  }
}

function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.remove("hidden");
  toast.classList.add("show");
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.classList.add("hidden"), 300);
  }, 2200);
}

// Rate Limiter Guard for WhatsApp Actions
function checkOrderRateLimit(btnElement) {
  const now = Date.now();
  if (isOrderProcessing || (now - lastOrderTime < ORDER_COOLDOWN_MS)) {
    showToast("Please wait a moment before sending another order request.");
    return false;
  }

  isOrderProcessing = true;
  lastOrderTime = now;

  // Visual button lock state
  if (btnElement) {
    const originalHtml = btnElement.innerHTML;
    btnElement.classList.add("btn-loading");
    btnElement.disabled = true;

    setTimeout(() => {
      btnElement.innerHTML = originalHtml;
      btnElement.classList.remove("btn-loading");
      btnElement.disabled = false;
      isOrderProcessing = false;
    }, ORDER_COOLDOWN_MS);
  } else {
    setTimeout(() => {
      isOrderProcessing = false;
    }, ORDER_COOLDOWN_MS);
  }

  return true;
}

function openModal(code) {
  const p = findProductByCode(code);
  if (!p) return;

  const discount = p.originalPrice > 0 ? Math.round((1 - p.discountedPrice / p.originalPrice) * 100) : 0;
  const modal = document.getElementById("modal-body");
  const safeName = escapeHTML(p.name);
  const safeDesc = escapeHTML(p.description || "High quality accessory from The Accessory Dock. Fully inspected for performance and durability.");
  const safeAvail = escapeHTML(p.availability || "In Stock");
  const isOut = (p.availability || '').toLowerCase().includes("out of stock");
  const safeCode = escapeHTML(p.code);

  const allImages = [p.mainImage, ...(p.images || [])].filter((img, idx, arr) => img && arr.indexOf(img) === idx);

  modal.innerHTML = `
    <div class="modal-product-layout">
      <div class="modal-gallery">
        <div class="modal-main-display">
          <img id="modal-main-img" class="modal-main-img" src="images/${encodeURI(p.mainImage)}" alt="${safeName}" onerror="this.src='images/logo.png'" />
          ${discount > 0 ? `<span class="badge-discount">${discount}% OFF</span>` : ''}
        </div>
        ${allImages.length > 1 ? `
          <div class="thumbs-row">
            ${allImages.map((img, i) => 
              `<button class="thumb-cell ${i === 0 ? 'selected' : ''}" data-img-src="images/${encodeURI(img)}" aria-label="View photo ${i + 1}">
                <img src="images/${encodeURI(img)}" alt="Thumbnail ${i + 1}" onerror="this.parentElement.style.display='none'" />
              </button>`
            ).join('')}
          </div>
        ` : ''}
      </div>

      <div class="modal-details">
        <div class="modal-meta-row">
          <span class="badge-stock ${isOut ? 'out' : 'in'}">${safeAvail}</span>
          <span class="modal-code">Code: <strong>${safeCode}</strong></span>
        </div>
        <h2 id="modal-title" class="modal-title">${safeName}</h2>
        <div class="modal-price-stack">
          <span class="price-discounted">${formatPrice(p.discountedPrice)}</span>
          ${p.originalPrice > p.discountedPrice ? `<span class="price-original">${formatPrice(p.originalPrice)}</span>` : ''}
        </div>
        <p class="modal-desc">${safeDesc}</p>

        <div class="modal-action-stack">
          <button class="btn-primary-whatsapp btn-modal-buy" data-buy-code='${escapeJS(p.code)}' ${isOut ? 'disabled' : ''}>
            <span class="btn-text">Order via WhatsApp</span>
          </button>
          <button class="btn-secondary-cart btn-modal-add" data-add-code='${escapeJS(p.code)}' ${isOut ? 'disabled' : ''}>
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  `;

  document.getElementById("product-modal").classList.remove("hidden");
  document.body.classList.add("modal-open");
}

function closeModal() {
  const modal = document.getElementById("product-modal");
  if (modal) modal.classList.add("hidden");
  document.body.classList.remove("modal-open");
}

function changeModalImage(imgSrc) {
  const mainImg = document.getElementById("modal-main-img");
  if (mainImg) mainImg.src = imgSrc;
}

function updateCartUI() {
  const drawer = document.getElementById("cart-items");
  if (!drawer) return;
  drawer.innerHTML = '';
  let total = 0;

  if (cart.length === 0) {
    drawer.innerHTML = `
      <div class="empty-cart-view">
        <span class="material-symbols-outlined empty-cart-icon">shopping_bag</span>
        <p class="empty-cart-text">Your cart is currently empty.</p>
      </div>
    `;
  } else {
    const itemsHtml = cart.map((item, i) => {
      const itemSubtotal = item.qty * item.discountedPrice;
      total += itemSubtotal;
      return `
        <div class="cart-item">
          <img class="cart-item-thumb" src="images/${encodeURI(item.mainImage)}" alt="${escapeHTML(item.name)}" onerror="this.src='images/logo.png'" />
          <div class="cart-item-info">
            <h4 class="cart-item-name">${escapeHTML(item.name)}</h4>
            <div class="cart-item-pricing">${formatPrice(item.discountedPrice)}</div>
            <div class="cart-item-controls">
              <div class="qty-stepper">
                <button class="qty-btn" data-action="dec" data-index="${i}" aria-label="Decrease quantity">−</button>
                <span class="qty-value">${item.qty}</span>
                <button class="qty-btn" data-action="inc" data-index="${i}" aria-label="Increase quantity">+</button>
              </div>
              <button class="cart-remove-btn" data-action="remove" data-index="${i}" aria-label="Remove item">
                <span class="material-symbols-outlined">delete_outline</span>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
    drawer.innerHTML = itemsHtml;
  }

  const totalQty = cart.reduce((sum, it) => sum + it.qty, 0);

  const badge = document.getElementById("cart-badge");
  if (badge) {
    badge.textContent = totalQty;
    badge.style.display = totalQty > 0 ? "inline-flex" : "none";
  }

  const summary = document.getElementById("cart-summary");
  if (summary) summary.textContent = `${totalQty} item${totalQty === 1 ? '' : 's'} | ${formatPrice(total)}`;

  const totalEl = document.getElementById("cart-total");
  if (totalEl) totalEl.textContent = formatPrice(total);

  const checkoutBtn = document.getElementById("checkout-btn");
  if (checkoutBtn) {
    checkoutBtn.disabled = cart.length === 0;
  }
}

function changeQty(i, delta) {
  if (!cart[i]) return;
  cart[i].qty += delta;
  if (cart[i].qty < 1) cart.splice(i, 1);
  updateCartUI();
  saveCart();
}

function removeItem(i) {
  if (!cart[i]) return;
  cart.splice(i, 1);
  updateCartUI();
  saveCart();
}

function toggleCart() {
  const drawer = document.getElementById("cart-drawer");
  const overlay = document.getElementById("cart-overlay");
  const isOpen = drawer.classList.toggle("open");
  overlay.classList.toggle("hidden", !isOpen);
  document.body.classList.toggle("cart-open", isOpen);
}

// Single-product direct purchase with Rate Limiting
function buyNow(code, sourceBtn) {
  const p = findProductByCode(code);
  if (!p) return;

  if (!checkOrderRateLimit(sourceBtn)) return;

  const msg = `Hi The Accessory Dock, I want to order this item:\n\n` +
    `• Product: ${p.name}\n` +
    `• Code: ${p.code}\n` +
    `• Price: ${formatPrice(p.discountedPrice)}\n` +
    `• Availability: ${p.availability}\n\n` +
    `Please confirm stock and delivery details.`;

  const url = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;
  window.open(url, "_blank");
}

// Full Cart checkout with Rate Limiting
function checkoutWhatsApp(sourceBtn) {
  if (cart.length === 0) {
    alert("Your cart is empty.");
    return;
  }

  if (!checkOrderRateLimit(sourceBtn)) return;

  let msg = `Hi The Accessory Dock, I would like to order the following accessories:\n\n`;

  cart.forEach((item, index) => {
    msg += `${index + 1}. ${item.name} (${item.code})\n` +
           `   Quantity: ${item.qty} × ${formatPrice(item.discountedPrice)} = ${formatPrice(item.qty * item.discountedPrice)}\n`;
  });

  const total = cart.reduce((sum, item) => sum + item.qty * item.discountedPrice, 0);
  msg += `\nTotal Amount: ${formatPrice(total)}\n\n` +
         `Please provide the payment and delivery instructions.`;

  const url = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;
  window.open(url, "_blank");

  cart = [];
  saveCart();
  updateCartUI();
  toggleCart();
}

// Search Filter Input
document.getElementById("search").addEventListener("input", () => {
  filterAndRender();
});

// Navigation & Actions Event Listeners
document.getElementById('cart-toggle-btn').addEventListener('click', toggleCart);
document.getElementById('cart-close-btn').addEventListener('click', toggleCart);
document.getElementById('cart-overlay').addEventListener('click', toggleCart);
document.getElementById('modal-close-btn').addEventListener('click', closeModal);
document.getElementById('checkout-btn').addEventListener('click', (e) => {
  checkoutWhatsApp(e.currentTarget);
});

// Category Navigation Delegation
document.getElementById('categories').addEventListener('click', (e) => {
  const btn = e.target.closest('.cat-pill');
  if (!btn) return;
  setCategory(btn.dataset.category || "");
});

// Products Grid Delegation (Card clicks & buttons)
document.getElementById('products').addEventListener('click', (e) => {
  const addBtn = e.target.closest('.btn-card-add');
  if (addBtn && addBtn.dataset.code) {
    addToCart(addBtn.dataset.code, addBtn);
    return;
  }

  const buyBtn = e.target.closest('.btn-card-buy');
  if (buyBtn && buyBtn.dataset.code) {
    buyNow(buyBtn.dataset.code, buyBtn);
    return;
  }

  const imgWrap = e.target.closest('.card-img-wrap');
  if (imgWrap && imgWrap.dataset.code) {
    openModal(imgWrap.dataset.code);
    return;
  }

  const title = e.target.closest('.product-title');
  if (title && title.dataset.code) {
    openModal(title.dataset.code);
    return;
  }
});

// Modal Delegation
document.getElementById('product-modal').addEventListener('click', (e) => {
  if (!e.target.closest('.modal-content')) {
    closeModal();
    return;
  }

  const buy = e.target.closest('.btn-modal-buy');
  if (buy && buy.dataset.buyCode) {
    buyNow(buy.dataset.buyCode, buy);
    return;
  }

  const add = e.target.closest('.btn-modal-add');
  if (add && add.dataset.addCode) {
    addToCart(add.dataset.addCode, add);
    closeModal();
    return;
  }

  const thumb = e.target.closest('.thumb-cell');
  if (thumb && thumb.dataset.imgSrc) {
    changeModalImage(thumb.dataset.imgSrc);
    document.querySelectorAll('#product-modal .thumb-cell').forEach(t => t.classList.remove('selected'));
    thumb.classList.add('selected');
  }
});

// Keyboard controls
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const modal = document.getElementById('product-modal');
    if (modal && !modal.classList.contains('hidden')) closeModal();
    const cartDrawer = document.getElementById('cart-drawer');
    if (cartDrawer && cartDrawer.classList.contains('open')) toggleCart();
  }
});

// Cart Drawer delegation
document.getElementById('cart-items').addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const idx = Number(btn.dataset.index);
  const action = btn.dataset.action;
  if (Number.isNaN(idx) || action == null) return;
  if (action === 'dec') changeQty(idx, -1);
  else if (action === 'inc') changeQty(idx, 1);
  else if (action === 'remove') removeItem(idx);
});

// Floating Theme Toggle
const themeToggleBtn = document.getElementById('theme-toggle');
if (themeToggleBtn) {
  themeToggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    themeToggleBtn.querySelector('.material-symbols-outlined').textContent = isDark ? 'light_mode' : 'dark_mode';
  });
}

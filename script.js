const WA_NUMBER = "9779761806448";
let products = [];
let cart = JSON.parse(localStorage.getItem("cart") || "[]");
let activeCategory = "";

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
    if (container) container.innerHTML = "<p class='error-msg'>Unable to load products. Please check connection and refresh.</p>";
  });

function saveCart() {
  try {
    localStorage.setItem("cart", JSON.stringify(cart));
  } catch (e) {
    console.warn("Storage full", e);
  }
}

function renderCategories(data) {
  const categories = [...new Set(data.map(p => p.category).filter(Boolean))];
  const nav = document.getElementById("categories");
  if (!nav) return;

  nav.innerHTML = `<button class="cat-btn active" data-category="">All Items</button>` +
    categories.map(cat =>
      `<button class="cat-btn" data-category="${escapeHTML(cat)}">${escapeHTML(cat)}</button>`
    ).join('');
}

function setCategory(cat) {
  activeCategory = cat || "";
  document.querySelectorAll(".cat-btn").forEach(btn => {
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
    container.innerHTML = `<div class="empty-state">No products found matching your search.</div>`;
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
        <div class="card-img-wrap">
          <img class="product-image" data-code=${codeArg} src="images/${encodeURI(p.mainImage)}" loading="${loadingAttr}" decoding="async" alt="${safeName}" onerror="this.src='images/logo.png'" />
          ${discount > 0 ? `<span class="discount-badge">${discount}% OFF</span>` : ''}
        </div>
        <div class="card-body">
          <div class="badge-row">
            <span class="badge ${isOut ? 'badge-out' : 'badge-in'}">${safeAvail}</span>
            <span class="product-code">${escapeHTML(p.code)}</span>
          </div>
          <h3 class="product-title" data-code=${codeArg} title="${safeName}">${safeName}</h3>
          <div class="price-row">
            <span class="price-discounted">${formatPrice(p.discountedPrice)}</span>
            ${p.originalPrice > p.discountedPrice ? `<span class="price-original">${formatPrice(p.originalPrice)}</span>` : ''}
          </div>
          <div class="card-actions">
            <button class="btn-add" data-code=${codeArg} ${isOut ? 'disabled' : ''}>
              ${isOut ? 'Out of Stock' : 'Add to Cart'}
            </button>
            <button class="btn-whatsapp" data-code=${codeArg} ${isOut ? 'disabled' : ''} aria-label="Buy ${safeName} on WhatsApp">
              Buy Now
            </button>
          </div>
        </div>
      </article>
    `;
  }).join('');

  container.innerHTML = html;
}

function addToCart(code) {
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
  showToast("Added to cart! 🛒");
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

function openModal(code) {
  const p = findProductByCode(code);
  if (!p) return;

  const discount = p.originalPrice > 0 ? Math.round((1 - p.discountedPrice / p.originalPrice) * 100) : 0;
  const modal = document.getElementById("modal-body");
  const safeName = escapeHTML(p.name);
  const safeDesc = escapeHTML(p.description || "High quality mobile gear from The Accessory Dock. Fully inspected and tested.");
  const safeAvail = escapeHTML(p.availability || "In Stock");
  const isOut = (p.availability || '').toLowerCase().includes("out of stock");
  const safeCode = escapeHTML(p.code);

  // Deduplicate gallery images and include main image
  const allImages = [p.mainImage, ...(p.images || [])].filter((img, idx, arr) => img && arr.indexOf(img) === idx);

  modal.innerHTML = `
    <div class="modal-product">
      <div class="modal-media">
        <div class="modal-img-container">
          <img id="modal-main-img" class="modal-main-img" src="images/${encodeURI(p.mainImage)}" alt="${safeName}" onerror="this.src='images/logo.png'" />
          ${discount > 0 ? `<span class="discount-badge">${discount}% OFF</span>` : ''}
        </div>
        ${allImages.length > 1 ? `
          <div class="thumbs">
            ${allImages.map((img, i) => 
              `<img class="thumb ${i === 0 ? 'selected' : ''}" src="images/${encodeURI(img)}" alt="Thumbnail ${i + 1}" data-img-src="images/${encodeURI(img)}" onerror="this.style.display='none'" />`
            ).join('')}
          </div>
        ` : ''}
      </div>

      <div class="modal-info">
        <div class="modal-badge-row">
          <span class="badge ${isOut ? 'badge-out' : 'badge-in'}">${safeAvail}</span>
          <span class="product-code">Code: <strong>${safeCode}</strong></span>
        </div>
        <h2 id="modal-title" class="modal-title">${safeName}</h2>
        <div class="modal-price-row">
          <span class="price-discounted">${formatPrice(p.discountedPrice)}</span>
          ${p.originalPrice > p.discountedPrice ? `<span class="price-original">${formatPrice(p.originalPrice)}</span>` : ''}
        </div>
        <p class="modal-desc">${safeDesc}</p>

        <div class="modal-action-bar">
          <button class="btn-whatsapp btn-modal-order" data-buy-code='${escapeJS(p.code)}' ${isOut ? 'disabled' : ''}>
            <span>Order via WhatsApp</span>
          </button>
          <button class="btn-add btn-modal-add" data-add-code='${escapeJS(p.code)}' ${isOut ? 'disabled' : ''}>
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
      <div class="empty-cart-state">
        <span style="font-size:2.5rem;">🛍️</span>
        <p>Your shopping cart is empty.</p>
      </div>
    `;
  } else {
    const itemsHtml = cart.map((item, i) => {
      const itemSubtotal = item.qty * item.discountedPrice;
      total += itemSubtotal;
      return `
        <div class="cart-item">
          <img class="cart-item-img" src="images/${encodeURI(item.mainImage)}" alt="${escapeHTML(item.name)}" onerror="this.src='images/logo.png'" />
          <div class="cart-item-details">
            <div class="cart-item-title">${escapeHTML(item.name)}</div>
            <div class="cart-item-price">${formatPrice(item.discountedPrice)}</div>
            <div class="cart-qty-bar">
              <button class="qty-btn" data-action="dec" data-index="${i}" aria-label="Decrease quantity">−</button>
              <span class="qty-num">${item.qty}</span>
              <button class="qty-btn" data-action="inc" data-index="${i}" aria-label="Increase quantity">+</button>
              <button class="remove-btn" data-action="remove" data-index="${i}" aria-label="Remove item">🗑️</button>
            </div>
          </div>
        </div>
      `;
    }).join('');
    drawer.innerHTML = itemsHtml;
  }

  const totalQty = cart.reduce((sum, it) => sum + it.qty, 0);

  // Cart Badge in Header
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

function checkoutWhatsApp() {
  if (cart.length === 0) return alert("Your cart is empty.");

  let msg = `Hi The Accessory Dock, I would like to order the following items:\n\n`;

  cart.forEach((item, index) => {
    msg += `${index + 1}. ${item.name} (${item.code})\n   Qty: ${item.qty} × ${formatPrice(item.discountedPrice)} = ${formatPrice(item.qty * item.discountedPrice)}\n`;
  });

  const total = cart.reduce((sum, item) => sum + item.qty * item.discountedPrice, 0);
  msg += `\nTotal Amount: ${formatPrice(total)}`;
  msg += `\n\nPlease let me know the payment and delivery details!`;

  const url = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;
  window.open(url, "_blank");

  cart = [];
  saveCart();
  updateCartUI();
  toggleCart();
}

function buyNow(code) {
  const p = findProductByCode(code);
  if (!p) return;

  const msg = `Hi The Accessory Dock, I want to order this item:\n\n• ${p.name}\nCode: ${p.code}\nPrice: ${formatPrice(p.discountedPrice)}\nAvailability: ${p.availability}\n\nPlease confirm availability and delivery!`;
  const url = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;
  window.open(url, "_blank");
}

// Search Handler
document.getElementById("search").addEventListener("input", () => {
  filterAndRender();
});

// UI Event Listeners
document.getElementById('cart-toggle-btn').addEventListener('click', toggleCart);
document.getElementById('cart-close-btn').addEventListener('click', toggleCart);
document.getElementById('cart-overlay').addEventListener('click', toggleCart);
document.getElementById('modal-close-btn').addEventListener('click', closeModal);
document.getElementById('checkout-btn').addEventListener('click', checkoutWhatsApp);

// Category Navigation
document.getElementById('categories').addEventListener('click', (e) => {
  const btn = e.target.closest('.cat-btn');
  if (!btn) return;
  setCategory(btn.dataset.category || "");
});

// Products Delegation
document.getElementById('products').addEventListener('click', (e) => {
  const addBtn = e.target.closest('.btn-add');
  if (addBtn && addBtn.dataset.code) {
    addToCart(addBtn.dataset.code);
    return;
  }
  const buyBtn = e.target.closest('.btn-whatsapp');
  if (buyBtn && buyBtn.dataset.code) {
    buyNow(buyBtn.dataset.code);
    return;
  }
  const img = e.target.closest('img.product-image');
  if (img && img.dataset.code) {
    openModal(img.dataset.code);
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
  const buy = e.target.closest('[data-buy-code]');
  if (buy) {
    buyNow(buy.getAttribute('data-buy-code'));
    return;
  }
  const add = e.target.closest('[data-add-code]');
  if (add) {
    addToCart(add.getAttribute('data-add-code'));
    closeModal();
    return;
  }
  const thumb = e.target.closest('.thumb');
  if (thumb && thumb.dataset.imgSrc) {
    changeModalImage(thumb.dataset.imgSrc);
    document.querySelectorAll('#product-modal .thumb').forEach(t => t.classList.remove('selected'));
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

// Floating dark mode toggle
const darkBtn = document.createElement('button');
darkBtn.textContent = '🌙';
darkBtn.className = 'floating-dark-toggle';
darkBtn.setAttribute('aria-label', 'Toggle dark mode');
darkBtn.setAttribute('title', 'Toggle dark mode');
document.body.appendChild(darkBtn);
darkBtn.addEventListener('click', () => {
  document.body.classList.toggle('dark-mode');
});

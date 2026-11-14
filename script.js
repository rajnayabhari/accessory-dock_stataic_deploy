const WA_NUMBER = "9779761806448";
let products = [];
let cart = JSON.parse(localStorage.getItem("cart") || "[]");
let appliedCoupon = null;

// Helpers
const escapeHTML = (str) => String(str)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/\"/g, "&quot;")
  .replace(/'/g, "&#39;");

const escapeJS = (str) => String(str)
  .replace(/\\/g, "\\\\")
  .replace(/'/g, "\\'");

const formatPrice = (v) => `रु ${Number(v || 0).toLocaleString('ne-NP')}`;

const findProductByCode = (code) => products.find(p => p.code === code);

const COUPONS = {
  "TAKEMORE": { type: "percent", value: 10 },
  "SAVE50": { type: "flat", value: 50 }
};

fetch("products.json")
  .then(res => res.json())
  .then(data => {
    products = data;
    // Merge locally added items (preview only)
    try {
      const custom = JSON.parse(localStorage.getItem('custom_products') || '[]');
      if (Array.isArray(custom) && custom.length) {
        products = products.concat(custom);
      }
    } catch {}
    renderCategories(products);
    renderProducts(products, 3);
    updateCartUI();
  })
  .catch(err => {
    console.error("Failed to load products:", err);
    const container = document.getElementById("products");
    if (container) container.innerHTML = "<p>Unable to load products. Please try again later.</p>";
  });

function saveCart() {
  localStorage.setItem("cart", JSON.stringify(cart));
}

function renderCategories(data) {
  const categories = [...new Set(data.map(p => p.category))];
  const nav = document.getElementById("categories");
  nav.innerHTML = `<button class="cat-btn active" data-category="">All</button>` +
    categories.map(cat =>
      `<button class="cat-btn" data-category="${escapeHTML(cat)}">${escapeHTML(cat)}</button>`
    ).join('');
}

function setCategory(cat) {
  const buttons = document.querySelectorAll(".cat-btn");
  buttons.forEach(btn => btn.classList.remove("active"));
  const value = cat || "";
  const match = Array.from(buttons).find(b => (b.dataset.category || "") === value);
  if (match) match.classList.add("active");
  renderProducts(cat ? products.filter(p => p.category === cat) : products);
}

function renderProducts(list, eagerCount = 2) {
  const container = document.getElementById("products");
  if (!container) return;
  const html = list.map((p, idx) => {
    const safeName = escapeHTML(p.name);
    const safeAvail = escapeHTML(p.availability || "");
    const discount = p.originalPrice > 0
      ? Math.round((1 - (p.discountedPrice / p.originalPrice)) * 100)
      : 0;
    const isOut = (p.availability || '').toLowerCase().includes("out of stock");
    const codeArg = `'${escapeJS(p.code)}'`;
    const eager = idx < eagerCount;
    const loadingAttr = eager ? 'eager' : 'lazy';
    const fetchPrio = eager ? 'high' : 'auto';
    return `
      <div class="product-card ${isOut ? 'out-of-stock' : ''}">
        <img class="product-image" data-code=${codeArg} src="images/${p.mainImage}" loading="${loadingAttr}" decoding="async" fetchpriority="${fetchPrio}" alt="${safeName}" />
        <h3>${safeName}</h3>
        <div class="price">
          <span class="original">${formatPrice(p.originalPrice)}</span>
          <span class="discounted">${formatPrice(p.discountedPrice)}</span>
        </div>
        <div class="badge ${isOut ? 'badge-out' : ''}">${safeAvail}</div>
        <div class="badge discount-badge">${discount}% OFF</div>
        <button class="btn-add" data-code=${codeArg} ${isOut ? 'disabled' : ''}>Add to Cart</button>
        <button class="btn-whatsapp" data-code=${codeArg} ${isOut ? 'disabled' : ''}>Buy Now</button>
      </div>
    `;
  }).join('');
  container.innerHTML = html || '<p>No products found.</p>';
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
  showToast("Added to cart");
}

function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.remove("hidden");
  toast.classList.add("show");
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.classList.add("hidden"), 300);
  }, 2000);
}

function openModal(code) {
  const p = findProductByCode(code);
  if (!p) return;
  const discount = p.originalPrice > 0 ? Math.round((1 - p.discountedPrice / p.originalPrice) * 100) : 0;
  const modal = document.getElementById("modal-body");
  const safeName = escapeHTML(p.name);
  const safeDesc = escapeHTML(p.description || "No description available.");
  const safeAvail = escapeHTML(p.availability || "");
  const safeCode = escapeHTML(p.code);

  // Include mainImage and any additional gallery images without duplicates
  const allImages = [p.mainImage, ...(p.images || [])].filter((img, idx, arr) => img && arr.indexOf(img) === idx);

  modal.innerHTML = `
    <h2 id="modal-title">${safeName}</h2>
    <img id="modal-main-img" class="modal-main-img" src="images/${p.mainImage}" loading="lazy" alt="${safeName}" />
    <div class="price">
      <span class="original">${formatPrice(p.originalPrice)}</span>
      <span class="discounted">${formatPrice(p.discountedPrice)}</span>
    </div>
    <p class="modal-desc">${safeDesc}</p>
    <div class="badge">${safeAvail}</div>
    <div class="badge discount-badge">${discount}% OFF</div>
    <p>Product Code: <strong>${safeCode}</strong></p>
    <input type="text" id="modal-refer-input" placeholder="Enter Refer Code" />
    <button class="btn-whatsapp btn-block" data-buy-code='${escapeJS(p.code)}'>Order via WhatsApp</button>
    ${allImages.length > 1 ? `
      <div class="thumbs">
        ${allImages.map((img, i) => 
          `<img class="thumb ${i === 0 ? 'selected' : ''}" src="images/${img}" loading="lazy" alt="Thumbnail ${i + 1} of ${safeName}" data-img-src="images/${img}" />`
        ).join('')}
      </div>
    ` : ''}
  `;
  document.getElementById("product-modal").classList.remove("hidden");
}

function closeModal() {
  document.getElementById("product-modal").classList.add("hidden");
}

function changeModalImage(imgSrc) {
  const mainImg = document.getElementById("modal-main-img");
  if (mainImg) mainImg.src = imgSrc;
}

function updateCartUI() {
  const drawer = document.getElementById("cart-items");
  drawer.innerHTML = '';
  let total = 0;

  const itemsHtml = cart.map((item, i) => {
    total += item.qty * item.discountedPrice;
    return `
      <div class="cart-item">
        <div class="cart-item-title">${escapeHTML(item.name)} (${formatPrice(item.discountedPrice)})</div>
        <div class="cart-qty">
          <button class="qty-btn" data-action="dec" data-index="${i}">−</button>
          ${item.qty}
          <button class="qty-btn" data-action="inc" data-index="${i}">+</button>
          <button class="remove-btn" data-action="remove" data-index="${i}">🗑️</button>
        </div>
      </div>
    `;
  }).join('');
  drawer.innerHTML = itemsHtml;

  const summary = document.getElementById("cart-summary");
  const feedback = document.getElementById("coupon-feedback");
  const breakdown = document.getElementById("coupon-breakdown");

  let originalTotal = total;
  if (appliedCoupon) {
    if (appliedCoupon.type === "percent") {
      total = Math.round(total * (1 - appliedCoupon.value / 100));
      breakdown.textContent = `Applied ${appliedCoupon.value}% OFF`;
    } else {
      total = Math.max(0, total - appliedCoupon.value);
      breakdown.textContent = `Applied रु ${appliedCoupon.value} OFF`;
    }
  } else {
    breakdown.textContent = '';
  }

  const totalQty = cart.reduce((sum, it) => sum + it.qty, 0);
  summary.textContent = `${totalQty} items | ${formatPrice(total)}`;
  document.getElementById("cart-total").textContent = `Total: ${formatPrice(total)}`;
}

function changeQty(i, delta) {
  cart[i].qty += delta;
  if (cart[i].qty < 1) cart.splice(i, 1);
  updateCartUI();
  saveCart();
}

function removeItem(i) {
  cart.splice(i, 1);
  updateCartUI();
  saveCart();
}

function toggleCart() {
  document.getElementById("cart-drawer").classList.toggle("open");
  document.getElementById("cart-overlay").classList.toggle("hidden");
}

function applyCoupon() {
  const code = document.getElementById("coupon-input").value.trim().toUpperCase();
  const feedback = document.getElementById("coupon-feedback");

  if (COUPONS[code]) {
    appliedCoupon = COUPONS[code];
    feedback.textContent = `Coupon applied: ${code}`;
  } else {
    appliedCoupon = null;
    feedback.textContent = `Invalid coupon`;
  }
  updateCartUI();
}

function checkoutWhatsApp() {
  const refer = document.getElementById('cart-refer-input')?.value || '';
  if (cart.length === 0) return alert("Cart is empty.");
  let msg = `Hi, I want to order the following items:\n`;

  cart.forEach(item => {
    msg += `• ${item.name} (Code: ${item.code}) x${item.qty} = ${formatPrice(item.qty * item.discountedPrice)}\n`;
  });

  let total = cart.reduce((sum, item) => sum + item.qty * item.discountedPrice, 0);

  if (appliedCoupon) {
    msg += `\nCoupon applied: ${appliedCoupon.type === 'flat' ? `रु ${appliedCoupon.value}` : `${appliedCoupon.value}% OFF`}`;
    total = appliedCoupon.type === "percent"
      ? Math.round(total * (1 - appliedCoupon.value / 100))
      : Math.max(0, total - appliedCoupon.value);
  }

  msg += `\nTotal: ${formatPrice(total)}`;
  msg += `\nRefer Code: ${refer || "N/A"}`;

  const url = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;
  window.open(url, "_blank");

  cart = [];
  appliedCoupon = null;
  saveCart();
  updateCartUI();
  toggleCart();
}

function buyNow(code) {
  const p = findProductByCode(code);
  if (!p) return;
  const refer = document.getElementById('modal-refer-input')?.value || '';
  let msg = `Hi, I want to order:\n\n${p.name}\nCode: ${p.code}\nPrice: ${formatPrice(p.discountedPrice)}\nAvailability: ${p.availability}\n\nRefer Code: ${refer || "N/A"}`;
  const url = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;
  window.open(url, "_blank");
}

document.getElementById("search").addEventListener("input", e => {
  const keyword = e.target.value.toLowerCase();
  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(keyword) ||
    p.code.toLowerCase().includes(keyword)
  );
  renderProducts(filtered);
});

// Global UI event listeners (no inline handlers)
document.getElementById('cart-toggle-btn').addEventListener('click', toggleCart);
document.getElementById('cart-overlay').addEventListener('click', toggleCart);
document.getElementById('modal-close-btn').addEventListener('click', closeModal);
document.getElementById('coupon-apply-btn').addEventListener('click', applyCoupon);
document.getElementById('checkout-btn').addEventListener('click', checkoutWhatsApp);

// Category buttons delegation
document.getElementById('categories').addEventListener('click', (e) => {
  const btn = e.target.closest('.cat-btn');
  if (!btn) return;
  const cat = btn.dataset.category || null;
  setCategory(cat);
});

// Product list delegation
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
  }
});

// Modal delegation
document.getElementById('product-modal').addEventListener('click', (e) => {
  // Close when clicking outside the modal content (on backdrop)
  if (!e.target.closest('.modal-content')) {
    closeModal();
    return;
  }
  const buy = e.target.closest('[data-buy-code]');
  if (buy) {
    buyNow(buy.getAttribute('data-buy-code'));
    return;
  }
  const thumb = e.target.closest('.thumb');
  if (thumb && thumb.dataset.imgSrc) {
    changeModalImage(thumb.dataset.imgSrc);
    document.querySelectorAll('#product-modal .thumb').forEach(t => t.classList.remove('selected'));
    thumb.classList.add('selected');
  }
});

// Close modal with Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const modal = document.getElementById('product-modal');
    if (modal && !modal.classList.contains('hidden')) closeModal();
  }
});

// Cart items delegation
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

// Admin features removed from public page. If an admin page exists,
// the following block will auto-enable only when its elements are present.
(function enableAdminIfPresent() {
  const adminModal = document.getElementById('admin-modal');
  const manageBtn = document.getElementById('manage-products-btn');
  const adminForm = document.getElementById('admin-form');
  if (!adminModal || !manageBtn || !adminForm) return; // not present on public page

  document.getElementById('manage-products-btn').addEventListener('click', () => {
    adminModal.classList.remove('hidden');
  });
  document.getElementById('admin-close-btn').addEventListener('click', () => {
    adminModal.classList.add('hidden');
  });

  adminForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const newItem = {
      name: document.getElementById('admin-name').value.trim(),
      code: document.getElementById('admin-code').value.trim(),
      originalPrice: Number(document.getElementById('admin-original').value),
      discountedPrice: Number(document.getElementById('admin-discounted').value),
      availability: document.getElementById('admin-availability').value.trim(),
      category: document.getElementById('admin-category').value.trim(),
      mainImage: document.getElementById('admin-mainimage').value.trim(),
      images: document.getElementById('admin-images').value.trim()
        ? document.getElementById('admin-images').value.split(',').map(s => s.trim()).filter(Boolean)
        : [],
      description: document.getElementById('admin-description').value.trim()
    };
    if (!newItem.name || !newItem.code) return alert('Name and Code are required');
    if (products.some(p => p.code === newItem.code)) {
      return alert('A product with this code already exists. Use a unique code.');
    }
    products.push(newItem);
    try {
      const custom = JSON.parse(localStorage.getItem('custom_products') || '[]');
      custom.push(newItem);
      localStorage.setItem('custom_products', JSON.stringify(custom));
    } catch {}
    renderCategories(products);
    renderProducts(products, 3);
    showToast('Product added (not saved to server)');
    e.target.reset();
  });

  const exportBtn = document.getElementById('export-products-btn');
  if (exportBtn) exportBtn.addEventListener('click', () => {
    const data = JSON.stringify(products, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'products.json'; document.body.appendChild(a); a.click();
    URL.revokeObjectURL(url); a.remove();
  });

  const importFile = document.getElementById('import-products-file');
  if (importFile) importFile.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) throw new Error('Invalid JSON format');
      products = parsed;
      try {
        const custom = JSON.parse(localStorage.getItem('custom_products') || '[]');
        if (Array.isArray(custom) && custom.length) products = products.concat(custom);
      } catch {}
      renderCategories(products);
      renderProducts(products, 3);
      updateCartUI();
      showToast('Imported products.json for preview');
    } catch (err) {
      alert('Failed to import: ' + err.message);
    } finally { e.target.value = ''; }
  });

  const clearBtn = document.getElementById('clear-custom-btn');
  if (clearBtn) clearBtn.addEventListener('click', () => {
    localStorage.removeItem('custom_products');
    location.reload();
  });
})();

// Dark mode toggle floating button without inline styles
const darkBtn = document.createElement('button');
darkBtn.textContent = '🌙 Toggle Dark Mode';
darkBtn.className = 'floating-dark-toggle';
document.body.appendChild(darkBtn);
darkBtn.addEventListener('click', () => {
  document.body.classList.toggle('dark-mode');
});

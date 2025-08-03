// --- Config ---
const WA_NUMBER = "9779808467134";
const COUPON_API = "https://script.google.com/macros/s/AKfycbzUBut_TJeDW744eL6BaMhRwcWjzcL5aGyolRe3iAzCoNMTaxA2lHaJ6w87_Q8bPAuciQ/exec";
const REVIEW_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTsi2u5dqotT4RdHBf1Ftc7iRSiQoOL4V2JyHxtulGiWrAd3m8JlTn5XuQ2WoISdGKqPdzCtMLMmWT-/pub?output=csv";
const REVIEW_FORM_BASE = "https://docs.google.com/forms/d/e/1FAIpQLSfJu0EwLHe42cz3qPRZjL0rc-SlNG2ajDuBEvTdCIwPiUsTBA/viewform?usp=pp_url&entry.296520128=";

let products = [];
let cart = JSON.parse(localStorage.getItem("cart") || "[]");
let appliedCoupon = null;
let validCoupons = [];

// --- Initialization ---
fetch("products.json").then(r => r.json()).then(data => {
  products = data;
  renderCategories(data);
  renderProducts(data);
  updateCartUI();
});
fetchCoupons();

function fetchCoupons() {
  fetch(COUPON_API)
    .then(res => res.json())
    .then(data => { validCoupons = data; });
}

// --- Cart Persistence ---
function saveCart() {
  localStorage.setItem("cart", JSON.stringify(cart));
}

function renderCategories(data) {
  const categories = [...new Set(data.map(p => p.category))];
  const nav = document.getElementById("categories");
  nav.innerHTML = '<button onclick="renderProducts(products)">All</button>' +
    categories.map(cat => `<button onclick="filterByCategory('${cat}')">${cat}</button>`).join('');
}



function filterByCategory(cat) {
  const filtered = products.filter(p => p.category === cat);
  renderProducts(filtered);
}

function renderProducts(list) {
  const container = document.getElementById("products");
  container.innerHTML = '';
  list.forEach((p, i) => {
    const discount = Math.round((1 - p.discountedPrice / p.originalPrice) * 100);
    container.innerHTML += `
      <div class="product-card">
        <img src="images/${p.mainImage}" onclick="openModal(${i})" />
        <h3>${p.name}</h3>
        <div class="price">
          <span class="original">रु ${p.originalPrice}</span>
          <span class="discounted">रु ${p.discountedPrice}</span>
        </div>
        <div class="badge">${p.availability}</div>
        <div class="badge discount-badge">${discount}% OFF</div>
        <button onclick="addToCart(${i})">Add to Cart</button>
        <button onclick="buyNow(${i})" style="background:#f57c00;color:white;margin-top:5px;">Buy Now</button>
      </div>
    `;
  });
}

function openModal(index) {
  const p = products[index];
  const modal = document.getElementById("modal-body");
  const discount = Math.round((1 - p.discountedPrice / p.originalPrice) * 100);
  modal.innerHTML = `
    <h2>${p.name}</h2>
    <img id="modal-main-img" src="images/${p.mainImage}" style="width:100%;border-radius:8px;" />
    <div class="price">
      <span class="original">रु ${p.originalPrice}</span>
      <span class="discounted">रु ${p.discountedPrice}</span>
    </div>
    <p style="margin:10px 0;color:#555;">${p.description || "No description available."}</p>
    <div class="badge">${p.availability}</div>
    <div class="badge discount-badge">${discount}% OFF</div>
    <p>Product Code: <strong>${p.code}</strong></p>
    <input type="text" id="refer-single" placeholder="Enter Refer Code" style="width:100%;padding:0.5rem;margin:0.5rem 0;" />
    <button onclick="buyNow(${index}, true)"
            style="width:100%;padding:0.75rem;background:#25D366;color:white;font-weight:bold;border:none;border-radius:5px;">
      Order via WhatsApp
    </button>
    <div class="thumbs" style="display:flex;gap:8px;overflow-x:auto;margin-top:1rem;">
      ${p.images.map(img => 
        `<img src="images/${img}" onclick="changeModalImage('images/${img}')" 
         style="width:60px;height:60px;border-radius:5px;cursor:pointer;border:2px solid #ccc;" />`
      ).join('')}
    </div>
    <div id="review-list" style="margin-top:1rem;"></div>
    <a target="_blank" class="review-btn" href="${REVIEW_FORM_BASE + encodeURIComponent(p.code)}" 
       style="display:inline-block;margin-top:1rem;text-align:center;background:#007bff;padding:0.5rem;color:white;border-radius:4px;">
       Write a Review
    </a>
  `;
  document.getElementById("product-modal").classList.remove("hidden");
  loadReviewsFor(p.code);
}

function closeModal() {
  document.getElementById("product-modal").classList.add("hidden");
}

function changeModalImage(imgSrc) {
  const mainImg = document.getElementById("modal-main-img");
  if (mainImg) mainImg.src = imgSrc;
}

function loadReviewsFor(code) {
  fetch(REVIEW_CSV)
    .then(res => res.text())
    .then(csv => {
      const results = Papa.parse(csv, { header: true }).data;
      const filtered = results.filter(r => r.product_code === code);
      const container = document.getElementById("review-list");
      if (!container) return;

      if (filtered.length === 0) {
        container.innerHTML = "<p>No reviews yet.</p>";
        return;
      }

      container.innerHTML = filtered.map(r => {
        const stars = "★".repeat(Number(r.rating)) + "☆".repeat(5 - Number(r.rating));
        return `
          <div class="review-item">
            <strong>${r.name}</strong> <span class="review-stars">${stars}</span><br/>
            <small>${r.comment}</small>
          </div>
        `;
      }).join("");
    });
}
function toggleCart() {
  document.getElementById("cart-drawer").classList.toggle("open");
}

function addToCart(index) {
  const p = products[index];
  const found = cart.find(item => item.code === p.code);
  if (found) {
    found.qty++;
  } else {
    cart.push({ ...p, qty: 1 });
  }
  saveCart();
  updateCartUI();
}

function changeQty(i, delta) {
  cart[i].qty += delta;
  if (cart[i].qty < 1) cart.splice(i, 1);
  saveCart();
  updateCartUI();
}

function removeItem(i) {
  cart.splice(i, 1);
  saveCart();
  updateCartUI();
}

function updateCartUI() {
  const cartBar = document.getElementById("cart-summary");
  const drawer = document.getElementById("cart-items");
  drawer.innerHTML = '';
  let total = 0;

  cart.forEach((item, i) => {
    total += item.qty * item.discountedPrice;
    drawer.innerHTML += `
      <div class="cart-item">
        <div class="cart-item-title">${item.name} (रु ${item.discountedPrice})</div>
        <div class="cart-qty">
          <button onclick="changeQty(${i}, -1)">−</button>
          ${item.qty}
          <button onclick="changeQty(${i}, 1)">+</button>
          <button onclick="removeItem(${i})">🗑️</button>
        </div>
      </div>
    `;
  });

  const breakdown = document.getElementById("coupon-breakdown");
  if (appliedCoupon && breakdown) {
    const before = total;
    if (appliedCoupon.type === "percent") {
      total = Math.round(total * (1 - appliedCoupon.value / 100));
    } else {
      total = Math.max(0, total - appliedCoupon.value);
    }
    breakdown.innerText = `Before: रु ${before} → After applying "${appliedCoupon.code}": रु ${total}`;
  } else if (breakdown) {
    breakdown.innerText = "";
  }

  cartBar.textContent = `${cart.length} items | रु ${total}`;
  document.getElementById("cart-total").textContent = `Total: रु ${total}`;
}

function applyCoupon() {
  const code = document.getElementById("coupon-input").value.trim().toUpperCase();
  const msg = document.getElementById("coupon-feedback");
  appliedCoupon = null;

  const coupon = validCoupons.find(c => c.code === code);
  if (!coupon) return msg.innerText = "❌ Invalid coupon";
  if (new Date(coupon.expires) < new Date()) return msg.innerText = "⏰ Coupon expired";
  if (Number(coupon.used) >= Number(coupon.maxUses)) return msg.innerText = "⚠️ Usage limit reached";

  appliedCoupon = coupon;
  msg.innerText = `✅ ${coupon.code} applied`;
  updateCartUI();
}

function checkoutWhatsApp() {
  const refer = prompt("Enter your Refer Code:");
  if (cart.length === 0) return alert("Cart is empty.");
  let msg = `Hi, I want to order the following items:\n`;
  cart.forEach(item => {
    msg += `• ${item.name} (Code: ${item.code}) x${item.qty} = रु ${item.qty * item.discountedPrice}\n`;
  });
  let total = cart.reduce((sum, item) => sum + item.qty * item.discountedPrice, 0);
  if (appliedCoupon) {
    msg += `\nCoupon: ${appliedCoupon.code}`;
    if (appliedCoupon.type === "percent") {
      total = Math.round(total * (1 - appliedCoupon.value / 100));
    } else {
      total = Math.max(0, total - appliedCoupon.value);
    }
    // auto-decrement usage via script
    fetch(COUPON_API + "?used=" + appliedCoupon.code);
  }
  msg += `\nTotal: रु ${total}`;
  msg += `\nRefer Code: ${refer || "N/A"}`;
  const url = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;
  window.open(url, "_blank");

  // Clear cart
  cart = [];
  appliedCoupon = null;
  saveCart();
  updateCartUI();
  document.getElementById("cart-drawer").classList.remove("open");
}

// Dark mode toggle
const darkBtn = document.createElement("button");
darkBtn.textContent = "🌙 Toggle Dark Mode";
darkBtn.style.cssText = "position:fixed;bottom:10px;right:10px;padding:0.5rem;background:#222;color:#fff;border:none;border-radius:5px;z-index:9999;cursor:pointer;";
document.body.appendChild(darkBtn);
darkBtn.addEventListener("click", () => {
  document.body.classList.toggle("dark-mode");
});

// Live search
document.getElementById("search").addEventListener("input", e => {
  const keyword = e.target.value.toLowerCase();
  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(keyword) ||
    p.code.toLowerCase().includes(keyword)
  );
  renderProducts(filtered);
});

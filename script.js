console.log("Script is running");

const WA_NUMBER = "9779808467134";
let products = [];
let cart = [];
let appliedCoupon = null;

const COUPONS = {
  "TAKEMORE": { type: "percent", value: 10 },
  "SAVE50":   { type: "flat", value: 50 }
};

const REVIEW_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTsi2u5dqotT4RdHBf1Ftc7iRSiQoOL4V2JyHxtulGiWrAd3m8JlTn5XuQ2WoISdGKqPdzCtMLMmWT-/pub?output=csv";
const REVIEW_FORM_BASE = "https://docs.google.com/forms/d/e/1FAIpQLSfJu0EwLHe42cz3qPRZjL0rc-SlNG2ajDuBEvTdCIwPiUsTBA/viewform?usp=pp_url&entry.296520128=";

fetch("products.json")
  .then(res => res.json())
  .then(data => {
    products = data;
    renderCategories(data);
    renderProducts(data);
  });

function renderCategories(data) {
  const categories = [...new Set(data.map(p => p.category))];
  const nav = document.getElementById("categories");
  nav.innerHTML = `<button onclick="renderProducts(products)">All</button>` +
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
  `;
  document.getElementById("product-modal").classList.remove("hidden");

  loadReviewsFor(p.code);
}

function loadReviewsFor(code) {
  const reviewBtn = document.querySelector(".review-btn");
  if (reviewBtn) reviewBtn.href = REVIEW_FORM_BASE + encodeURIComponent(code);

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

function closeModal() {
  document.getElementById("product-modal").classList.add("hidden");
}

window.addEventListener("click", function (e) {
  const modal = document.getElementById("product-modal");
  if (e.target === modal) closeModal();
});

function changeModalImage(imgSrc) {
  const mainImg = document.getElementById("modal-main-img");
  if (mainImg) mainImg.src = imgSrc;
}

document.getElementById("search").addEventListener("input", e => {
  const keyword = e.target.value.toLowerCase();
  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(keyword) ||
    p.code.toLowerCase().includes(keyword)
  );
  renderProducts(filtered);
});

function addToCart(index) {
  const p = products[index];
  const found = cart.find(item => item.code === p.code);
  if (found) {
    found.qty++;
  } else {
    cart.push({ ...p, qty: 1 });
  }
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

  if (appliedCoupon) {
    if (appliedCoupon.type === "percent") {
      total = Math.round(total * (1 - appliedCoupon.value / 100));
    } else {
      total = Math.max(0, total - appliedCoupon.value);
    }
  }

  cartBar.textContent = `${cart.length} items | रु ${total}`;
  document.getElementById("cart-total").textContent = `Total: रु ${total}`;
}

function changeQty(i, delta) {
  cart[i].qty += delta;
  if (cart[i].qty < 1) cart.splice(i, 1);
  updateCartUI();
}

function removeItem(i) {
  cart.splice(i, 1);
  updateCartUI();
}

function toggleCart() {
  document.getElementById("cart-drawer").classList.toggle("open");
}

function applyCoupon() {
  const code = document.getElementById("coupon-input").value.trim().toUpperCase();
  if (COUPONS[code]) {
    appliedCoupon = COUPONS[code];
    document.getElementById("coupon-feedback").textContent = `Coupon applied: ${code}`;
  } else {
    appliedCoupon = null;
    document.getElementById("coupon-feedback").textContent = `Invalid coupon`;
  }
  updateCartUI();
}

function buyNow(index, fromModal = false) {
  const p = products[index];
  const refer = fromModal
    ? document.getElementById("refer-single").value.trim()
    : prompt("Enter Refer Code:");
  const msg = `Hi, I'm interested in:\nProduct: ${p.name}\nCode: ${p.code}\nPrice: रु ${p.discountedPrice}\nRefer Code: ${refer}`;
  const url = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;
  window.open(url, "_blank");
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
    msg += `\nCoupon applied: ${appliedCoupon.type === 'flat' ? `रु ${appliedCoupon.value}` : `${appliedCoupon.value}% OFF`}`;
    if (appliedCoupon.type === "percent") {
      total = Math.round(total * (1 - appliedCoupon.value / 100));
    } else {
      total = Math.max(0, total - appliedCoupon.value);
    }
  }

  msg += `\nTotal: रु ${total}`;
  msg += `\nRefer Code: ${refer || "N/A"}`;
  const url = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;
  window.open(url, "_blank");
}

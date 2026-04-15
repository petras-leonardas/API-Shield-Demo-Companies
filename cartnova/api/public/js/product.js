// CartNova Product Detail Page
// Loads product info, reviews, and variants. Handles add-to-cart.

(async function () {
  const params = new URLSearchParams(window.location.search);
  const productId = params.get("id");

  if (!productId) {
    window.location.href = "/";
    return;
  }

  const COLORS = [
    "bg-indigo-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500",
    "bg-cyan-500", "bg-violet-500", "bg-orange-500", "bg-teal-500",
  ];

  // Load all data in parallel
  const [productRes, reviewsRes, variantsRes] = await Promise.all([
    API.get(`/products/${productId}`),
    API.get(`/products/${productId}/reviews`),
    API.get(`/products/${productId}/variants`),
  ]);

  if (!productRes.ok) {
    document.getElementById("product-detail").innerHTML = `
      <div class="text-center py-12">
        <p class="text-red-500 text-lg">Product not found</p>
        <a href="/" class="text-indigo-600 hover:underline mt-2 inline-block">Back to catalog</a>
      </div>`;
    return;
  }

  const product = productRes.data;
  const reviews = reviewsRes.data?.reviews || [];
  const variants = variantsRes.data?.variants || [];

  // Update page title and breadcrumb
  document.title = `CartNova — ${product.name}`;
  document.getElementById("breadcrumb-product").textContent = product.name;

  // Render product detail
  const colorIdx = Math.abs(hashCode(productId)) % COLORS.length;
  const variantOptions = variants.length > 0
    ? `<div class="mt-4">
        <label class="text-sm font-medium text-gray-700">Variant</label>
        <select id="variant-select" class="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500">
          <option value="">Select...</option>
          ${variants.map((v) => `<option value="${v.id}">${v.name}${v.stock > 0 ? "" : " (Out of Stock)"}</option>`).join("")}
        </select>
      </div>`
    : "";

  // Build image gallery HTML
  const mainImage = product.images?.[0] || null;
  const allImages = product.images || [];
  const galleryHTML = mainImage
    ? `<div>
        <div class="product-gallery h-80">
          <img id="main-product-image" src="${mainImage}" alt="${product.name}" class="rounded-lg"
            onerror="this.parentElement.innerHTML='<div class=\\'product-image-placeholder ${COLORS[colorIdx]} rounded-lg h-80 text-xl\\'>${product.name}</div>'">
        </div>
        ${allImages.length > 1 ? `
          <div class="product-thumbnails">
            ${allImages.map((img, idx) => `
              <img src="${img}" alt="${product.name} view ${idx + 1}" class="product-thumbnail ${idx === 0 ? 'active' : ''}"
                onclick="document.getElementById('main-product-image').src='${img}'; document.querySelectorAll('.product-thumbnail').forEach(t=>t.classList.remove('active')); this.classList.add('active');"
                onerror="this.style.display='none'">
            `).join("")}
          </div>` : ""}
      </div>`
    : `<div class="product-image-placeholder ${COLORS[colorIdx]} rounded-lg h-80 text-xl">${product.name}</div>`;

  document.getElementById("product-detail").innerHTML = `
    <div class="grid md:grid-cols-2 gap-8 w-full">
      <!-- Image -->
      ${galleryHTML}

      <!-- Info -->
      <div>
        <h1 class="text-2xl font-bold text-gray-900">${product.name}</h1>

        <div class="flex items-center gap-2 mt-2">
          <span class="stars text-lg">${renderStars(product.rating)}</span>
          <span class="text-sm text-gray-500">${product.rating} out of 5</span>
          <span class="text-sm text-gray-400">(${product.review_count} reviews)</span>
        </div>

        <div class="mt-4">
          <span class="text-3xl font-bold text-gray-900">&euro;${product.price.toFixed(2)}</span>
          <span class="text-sm text-gray-500 ml-1">${product.currency}</span>
        </div>

        <p class="mt-4 text-gray-600 leading-relaxed">${product.description}</p>

        ${variantOptions}

        <div class="mt-4">
          <label class="text-sm font-medium text-gray-700">Quantity</label>
          <input type="number" id="quantity" value="1" min="1" max="10"
            class="mt-1 block w-20 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500">
        </div>

        <button id="add-to-cart-btn" onclick="addToCart('${product.id}')"
          class="mt-6 w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed">
          Add to Cart
        </button>

        ${product.in_stock
          ? '<p class="text-sm text-emerald-600 mt-2 font-medium">In Stock — Ships within 1-2 business days</p>'
          : '<p class="text-sm text-red-500 mt-2 font-medium">Currently Out of Stock</p>'}
      </div>
    </div>`;

  // Render reviews
  if (reviews.length > 0) {
    const section = document.getElementById("reviews-section");
    section.classList.remove("hidden");

    document.getElementById("reviews-list").innerHTML = reviews.map((r) => `
      <div class="bg-white rounded-lg p-4 shadow-sm">
        <div class="flex items-center justify-between">
          <div>
            <span class="stars text-sm">${renderStars(r.rating)}</span>
          </div>
          <span class="text-xs text-gray-400">${r.author_name || "Anonymous"}</span>
        </div>
        <p class="text-sm text-gray-600 mt-2">${r.text || ""}</p>
      </div>
    `).join("");
  }

  // ── Add to Cart ─────────────────────────────────────────────

  window.addToCart = async function (pid) {
    if (!Auth.isLoggedIn()) {
      window.location.href = `/login.html?redirect=${encodeURIComponent(window.location.href)}`;
      return;
    }

    const btn = document.getElementById("add-to-cart-btn");
    btn.disabled = true;
    btn.textContent = "Adding...";

    const quantity = parseInt(document.getElementById("quantity").value) || 1;
    const variantSelect = document.getElementById("variant-select");
    const body = { product_id: pid, quantity };
    if (variantSelect?.value) {
      body.variant_id = variantSelect.value;
    }

    const { ok } = await API.post("/cart/items", body);

    if (ok) {
      btn.textContent = "Added to Cart!";
      btn.classList.remove("bg-indigo-600", "hover:bg-indigo-700");
      btn.classList.add("bg-emerald-600");
      showToast("Item added to cart", "success");
      // Update cart badge
      const badge = document.getElementById("cart-badge");
      if (badge) {
        const current = parseInt(badge.textContent) || 0;
        badge.textContent = current + 1;
        badge.classList.remove("hidden");
      }
      setTimeout(() => {
        btn.textContent = "Add to Cart";
        btn.classList.remove("bg-emerald-600");
        btn.classList.add("bg-indigo-600", "hover:bg-indigo-700");
        btn.disabled = false;
      }, 2000);
    } else {
      btn.textContent = "Add to Cart";
      btn.disabled = false;
      showToast("Failed to add item", "error");
    }
  };

  // ── Helpers ─────────────────────────────────────────────────

  function renderStars(rating) {
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5 ? 1 : 0;
    const empty = 5 - full - half;
    return "★".repeat(full) + (half ? "½" : "") + "☆".repeat(empty);
  }

  function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }

  function showToast(message, type) {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }
})();

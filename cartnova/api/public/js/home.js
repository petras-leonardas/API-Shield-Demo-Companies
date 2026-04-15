// CartNova Home Page
// Handles product catalog display, search, categories, and pagination.

(async function () {
  const params = new URLSearchParams(window.location.search);
  const searchQuery = params.get("q");
  let currentPage = parseInt(params.get("page")) || 1;
  const LIMIT = 12;

  // Color palette for product image placeholders
  const COLORS = [
    "bg-indigo-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500",
    "bg-cyan-500", "bg-violet-500", "bg-orange-500", "bg-teal-500",
  ];

  // Load categories for filter chips
  loadCategories();

  // Load products (search or browse)
  if (searchQuery) {
    document.getElementById("page-heading").innerHTML = `
      <h1 class="text-2xl font-bold text-gray-900">Search: "${searchQuery}"</h1>
      <p class="text-gray-500 text-sm mt-1"><a href="/" class="text-indigo-600 hover:underline">Clear search</a></p>
    `;
    await loadSearchResults(searchQuery);
  } else {
    await loadProducts(currentPage);
  }

  // ── Load Categories ───────────────────────────────────────────

  async function loadCategories() {
    const { ok, data } = await API.get("/categories");
    if (!ok || !data?.categories) return;

    const container = document.getElementById("category-chips");
    const activeCategory = params.get("category");

    container.innerHTML = data.categories.map((cat) => {
      const active = activeCategory === cat.id;
      const cls = active
        ? "bg-indigo-600 text-white"
        : "bg-white text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 border border-gray-200";
      return `<a href="/category.html?id=${cat.id}" class="${cls} px-3 py-1.5 rounded-full text-sm font-medium transition-colors">${cat.name}</a>`;
    }).join("");
  }

  // ── Load Product Catalog ──────────────────────────────────────

  async function loadProducts(page) {
    const { ok, data } = await API.get(`/products?page=${page}&limit=${LIMIT}`);
    if (!ok) {
      showError("Failed to load products");
      return;
    }
    renderProducts(data.products || []);
    setupPagination(data.pagination?.total || 0, page);
  }

  // ── Search Results ────────────────────────────────────────────

  async function loadSearchResults(query) {
    const { ok, data } = await API.get(`/products/search?q=${encodeURIComponent(query)}`);
    if (!ok) {
      showError("Search failed");
      return;
    }
    renderProducts(data.results || []);
    // No pagination for search results
  }

  // ── Render Product Grid ───────────────────────────────────────

  function renderProducts(products) {
    const grid = document.getElementById("product-grid");

    if (products.length === 0) {
      grid.innerHTML = `
        <div class="col-span-full text-center py-12">
          <p class="text-gray-500 text-lg">No products found</p>
          <a href="/" class="text-indigo-600 hover:underline text-sm mt-2 inline-block">Browse all products</a>
        </div>`;
      return;
    }

    grid.innerHTML = products.map((product, i) => `
      <a href="/product.html?id=${product.id}" class="product-card bg-white rounded-lg shadow-sm overflow-hidden block">
        <div class="product-image-placeholder ${COLORS[i % COLORS.length]} h-40">
          ${product.name}
        </div>
        <div class="p-3">
          <h3 class="text-sm font-semibold text-gray-900 line-clamp-2">${product.name}</h3>
          <div class="flex items-center gap-1 mt-1">
            <span class="stars text-sm">${renderStars(product.rating)}</span>
            ${product.review_count != null ? `<span class="text-xs text-gray-400">(${product.review_count})</span>` : ""}
          </div>
          <div class="flex items-center justify-between mt-2">
            <span class="text-lg font-bold text-gray-900">&euro;${product.price.toFixed(2)}</span>
            ${product.in_stock
              ? '<span class="text-xs text-emerald-600 font-medium">In Stock</span>'
              : '<span class="text-xs text-red-500 font-medium">Out of Stock</span>'}
          </div>
        </div>
      </a>
    `).join("");
  }

  // ── Pagination ────────────────────────────────────────────────

  function setupPagination(total, page) {
    if (total <= LIMIT) return;

    const totalPages = Math.ceil(total / LIMIT);
    const paginationEl = document.getElementById("pagination");
    const prevBtn = document.getElementById("prev-btn");
    const nextBtn = document.getElementById("next-btn");
    const pageInfo = document.getElementById("page-info");

    paginationEl.classList.remove("hidden");
    pageInfo.textContent = `Page ${page} of ${totalPages}`;
    prevBtn.disabled = page <= 1;
    nextBtn.disabled = page >= totalPages;

    prevBtn.onclick = () => navigatePage(page - 1);
    nextBtn.onclick = () => navigatePage(page + 1);
  }

  function navigatePage(page) {
    const url = new URL(window.location);
    url.searchParams.set("page", page);
    window.location.href = url.toString();
  }

  // ── Helpers ───────────────────────────────────────────────────

  function renderStars(rating) {
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5 ? 1 : 0;
    const empty = 5 - full - half;
    return "★".repeat(full) + (half ? "½" : "") + "☆".repeat(empty);
  }

  function showError(message) {
    document.getElementById("product-grid").innerHTML = `
      <div class="col-span-full text-center py-12">
        <p class="text-red-500">${message}</p>
      </div>`;
  }
})();

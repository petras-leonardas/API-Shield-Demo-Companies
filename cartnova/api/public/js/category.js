// CartNova Category Page
// Displays products filtered by category.

(async function () {
  const params = new URLSearchParams(window.location.search);
  const categoryId = params.get("id");

  if (!categoryId) {
    window.location.href = "/";
    return;
  }

  const COLORS = [
    "bg-indigo-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500",
    "bg-cyan-500", "bg-violet-500", "bg-orange-500", "bg-teal-500",
  ];

  const CATEGORY_NAMES = {
    cat_elec: "Electronics",
    cat_clth: "Clothing & Fashion",
    cat_home: "Home & Kitchen",
    cat_sprt: "Sports & Outdoors",
    cat_book: "Books & Media",
  };

  const categoryName = CATEGORY_NAMES[categoryId] || categoryId;
  document.title = `CartNova — ${categoryName}`;
  document.getElementById("category-title").textContent = categoryName;
  document.getElementById("breadcrumb-category").textContent = categoryName;

  const { ok, data } = await API.get(`/categories/${categoryId}/products`);

  // Render category header image if available
  if (data?.category?.image) {
    const headerEl = document.getElementById("category-title");
    headerEl.insertAdjacentHTML("beforebegin",
      `<img src="${data.category.image}" alt="${categoryName}" class="category-header-image mb-4"
        onerror="this.style.display='none'">`);
  }

  const grid = document.getElementById("product-grid");

  if (!ok || !data?.products?.length) {
    grid.innerHTML = `
      <div class="col-span-full text-center py-12">
        <p class="text-gray-500 text-lg">No products in this category</p>
        <a href="/" class="text-indigo-600 hover:underline text-sm mt-2 inline-block">Browse all products</a>
      </div>`;
    return;
  }

  grid.innerHTML = data.products.map((product, i) => `
    <a href="/product.html?id=${product.id}" class="product-card bg-white rounded-lg shadow-sm overflow-hidden block">
      <div class="product-image-container h-40">
        ${product.image
          ? `<img src="${product.image}" alt="${product.name}" class="product-image" loading="lazy"
              onerror="this.parentElement.innerHTML='<div class=\\'product-image-placeholder ${COLORS[i % COLORS.length]} h-40\\'>${product.name}</div>'">`
          : `<div class="product-image-placeholder ${COLORS[i % COLORS.length]} h-40">${product.name}</div>`}
      </div>
      <div class="p-3">
        <h3 class="text-sm font-semibold text-gray-900 line-clamp-2">${product.name}</h3>
        <div class="flex items-center gap-1 mt-1">
          <span class="stars text-sm">${renderStars(product.rating)}</span>
          <span class="text-xs text-gray-400">(${product.review_count})</span>
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

  function renderStars(rating) {
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5 ? 1 : 0;
    const empty = 5 - full - half;
    return "★".repeat(full) + (half ? "½" : "") + "☆".repeat(empty);
  }
})();

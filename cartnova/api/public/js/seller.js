// CartNova Seller Dashboard

const SELLER_NAMES = {
  "sk_tv_live_a1b2c3d4e5f6": "TechVault",
  "sk_nw_live_g7h8i9j0k1l2": "NordicWear",
  "sk_he_live_m3n4o5p6q7r8": "HomeEssence",
};

// Auto-connect if key is stored
const savedKey = Auth.getSellerKey();
if (savedKey) {
  document.getElementById("api-key-select").value = savedKey;
  connectSeller();
}

async function connectSeller() {
  const key = document.getElementById("api-key-select").value;
  if (!key) return;

  Auth.setSellerKey(key);
  document.getElementById("seller-name").textContent = SELLER_NAMES[key] || "Unknown Seller";
  document.getElementById("connect-bar").classList.add("hidden");
  document.getElementById("dashboard").classList.remove("hidden");

  // Load all data
  await Promise.all([loadAnalytics(), loadProducts(), loadOrders()]);
}

function disconnectSeller() {
  Auth.clearSellerKey();
  document.getElementById("connect-bar").classList.remove("hidden");
  document.getElementById("dashboard").classList.add("hidden");
}

async function loadAnalytics() {
  const { ok, data } = await API.seller.get("/sellers/me/analytics");
  const container = document.getElementById("analytics-content");

  if (!ok) {
    container.innerHTML = '<p class="text-red-500 col-span-3">Failed to load analytics</p>';
    return;
  }

  container.innerHTML = `
    <div class="bg-emerald-50 rounded-lg p-4 text-center">
      <p class="text-2xl font-bold text-emerald-700">&euro;${(data.revenue || 0).toLocaleString()}</p>
      <p class="text-sm text-emerald-600">Revenue</p>
      <p class="text-xs text-gray-400 mt-1">${data.period || "Current"}</p>
    </div>
    <div class="bg-blue-50 rounded-lg p-4 text-center">
      <p class="text-2xl font-bold text-blue-700">${data.order_count || 0}</p>
      <p class="text-sm text-blue-600">Orders</p>
    </div>
    <div class="bg-amber-50 rounded-lg p-4 text-center">
      <p class="text-2xl font-bold text-amber-700">${data.top_products?.length || 0}</p>
      <p class="text-sm text-amber-600">Active Products</p>
    </div>
    ${data.top_products?.length ? `
      <div class="col-span-3 mt-2">
        <h3 class="text-sm font-semibold text-gray-700 mb-2">Top Products</h3>
        <div class="space-y-1">
          ${data.top_products.map((p) => `
            <div class="flex justify-between text-sm">
              <span class="text-gray-600">${p.name}</span>
              <span class="font-medium text-gray-900">${p.units_sold} sold</span>
            </div>
          `).join("")}
        </div>
      </div>` : ""}`;
}

async function loadProducts() {
  const { ok, data } = await API.seller.get("/sellers/me/products");
  const container = document.getElementById("products-list");

  if (!ok || !data?.products?.length) {
    container.innerHTML = '<p class="text-gray-400 text-sm">No products listed</p>';
    return;
  }

  container.innerHTML = data.products.map((p) => `
    <div class="flex items-center justify-between border border-gray-200 rounded-lg p-3">
      <div>
        <p class="font-medium text-gray-900 text-sm">${p.name}</p>
        <p class="text-xs text-gray-500">${p.id} — ${p.in_stock ? "In Stock" : "Out of Stock"}</p>
      </div>
      <div class="flex items-center gap-3">
        <span class="font-semibold text-gray-900">&euro;${p.price.toFixed(2)}</span>
        <button onclick="updateProduct('${p.id}', ${p.price})"
          class="text-xs text-indigo-600 hover:underline">Edit Price</button>
      </div>
    </div>
  `).join("");
}

async function loadOrders() {
  const { ok, data } = await API.seller.get("/sellers/me/orders");
  const container = document.getElementById("seller-orders");

  if (!ok || !data?.orders?.length) {
    container.innerHTML = '<p class="text-gray-400 text-sm">No orders yet</p>';
    return;
  }

  container.innerHTML = `
    <table class="w-full text-sm">
      <thead>
        <tr class="text-left text-gray-500 border-b border-gray-200">
          <th class="pb-2 font-medium">Order</th>
          <th class="pb-2 font-medium">Status</th>
          <th class="pb-2 font-medium">Items</th>
          <th class="pb-2 font-medium text-right">Total</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-100">
        ${data.orders.map((o) => `
          <tr>
            <td class="py-2 font-mono text-xs">${o.id}</td>
            <td class="py-2"><span class="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100">${o.status}</span></td>
            <td class="py-2">${o.items?.length || 0}</td>
            <td class="py-2 text-right font-medium">&euro;${o.total.toFixed(2)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>`;
}

function toggleAddForm() {
  document.getElementById("add-form").classList.toggle("hidden");
}

async function addProduct(e) {
  e.preventDefault();
  const { ok } = await API.seller.post("/sellers/me/products", {
    name: document.getElementById("new-name").value,
    price: parseFloat(document.getElementById("new-price").value),
    category_id: document.getElementById("new-category").value,
  });

  if (ok) {
    document.getElementById("add-form").classList.add("hidden");
    document.getElementById("new-name").value = "";
    document.getElementById("new-price").value = "";
    await loadProducts();
    showToast("Product listed", "success");
  } else {
    showToast("Failed to create listing", "error");
  }
}

async function updateProduct(productId, currentPrice) {
  const newPrice = prompt("New price (EUR):", currentPrice);
  if (!newPrice || isNaN(parseFloat(newPrice))) return;

  const { ok } = await API.seller.put(`/sellers/me/products/${productId}`, {
    price: parseFloat(newPrice),
  });

  if (ok) {
    await loadProducts();
    showToast("Price updated", "success");
  } else {
    showToast("Failed to update price", "error");
  }
}

function showToast(message, type) {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

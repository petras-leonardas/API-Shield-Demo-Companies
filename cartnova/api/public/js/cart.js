// CartNova Cart Page

(async function () {
  if (!Auth.requireAuth()) return;

  await loadCart();

  async function loadCart() {
    const { ok, data } = await API.get("/cart");
    const container = document.getElementById("cart-content");

    if (!ok || !data?.items?.length) {
      container.innerHTML = `
        <div class="text-center py-12 w-full">
          <svg class="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z"/>
          </svg>
          <p class="text-gray-500 text-lg mb-2">Your cart is empty</p>
          <a href="/" class="text-indigo-600 hover:underline">Browse products</a>
        </div>`;
      return;
    }

    container.innerHTML = `
      <div class="w-full space-y-4">
        <!-- Cart items -->
        <div class="bg-white rounded-lg shadow-sm divide-y divide-gray-100">
          ${data.items.map((item) => `
            <div class="p-4 flex items-center gap-4" id="item-${item.id}">
              ${item.image
                ? `<img src="${item.image}" alt="${item.product_name}" class="w-16 h-16 rounded-lg object-cover shrink-0" onerror="this.style.display='none'">`
                : `<div class="w-16 h-16 rounded-lg bg-gray-200 shrink-0 flex items-center justify-center"><span class="text-gray-400 text-xs text-center px-1">${item.product_name.substring(0, 10)}</span></div>`}
              <div class="flex-1 min-w-0">
                <h3 class="font-semibold text-gray-900 truncate">${item.product_name}</h3>
                <p class="text-sm text-gray-500">&euro;${item.price.toFixed(2)} each</p>
              </div>
              <div class="flex items-center gap-2">
                <button onclick="updateQty('${item.id}', ${item.quantity - 1})"
                  class="w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-100 text-gray-600 ${item.quantity <= 1 ? 'opacity-40 cursor-not-allowed' : ''}"
                  ${item.quantity <= 1 ? "disabled" : ""}>-</button>
                <span class="w-8 text-center font-semibold text-gray-900">${item.quantity}</span>
                <button onclick="updateQty('${item.id}', ${item.quantity + 1})"
                  class="w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-100 text-gray-600">+</button>
              </div>
              <div class="text-right w-24">
                <p class="font-semibold text-gray-900">&euro;${(item.price * item.quantity).toFixed(2)}</p>
              </div>
              <button onclick="removeItem('${item.id}')"
                class="text-gray-400 hover:text-red-500 transition-colors" title="Remove">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
              </button>
            </div>
          `).join("")}
        </div>

        <!-- Summary -->
        <div class="bg-white rounded-lg shadow-sm p-4">
          <div class="flex justify-between items-center mb-4">
            <span class="text-gray-600">Subtotal (${data.item_count} item${data.item_count > 1 ? "s" : ""})</span>
            <span class="text-xl font-bold text-gray-900">&euro;${data.subtotal.toFixed(2)}</span>
          </div>
          <button onclick="startCheckout()" id="checkout-btn"
            class="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:bg-gray-300">
            Proceed to Checkout
          </button>
        </div>

        <div class="text-center">
          <a href="/" class="text-sm text-indigo-600 hover:underline">Continue shopping</a>
        </div>
      </div>`;
  }

  window.updateQty = async function (itemId, newQty) {
    if (newQty < 1) return;
    const { ok } = await API.put(`/cart/items/${itemId}`, { quantity: newQty });
    if (ok) await loadCart();
  };

  window.removeItem = async function (itemId) {
    const { ok } = await API.del(`/cart/items/${itemId}`);
    if (ok) await loadCart();
  };

  window.startCheckout = async function () {
    const btn = document.getElementById("checkout-btn");
    btn.disabled = true;
    btn.textContent = "Starting checkout...";

    const { ok, data } = await API.post("/checkout/start", {});

    if (ok && data?.id) {
      window.location.href = `/checkout.html?id=${data.id}`;
    } else {
      btn.disabled = false;
      btn.textContent = "Proceed to Checkout";
      showToast("Failed to start checkout", "error");
    }
  };

  function showToast(message, type) {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }
})();

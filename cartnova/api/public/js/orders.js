// CartNova Orders Page

(async function () {
  if (!Auth.requireAuth()) return;

  const STATUS_COLORS = {
    processing: "bg-yellow-100 text-yellow-800",
    shipped: "bg-blue-100 text-blue-800",
    delivered: "bg-emerald-100 text-emerald-800",
    confirmed: "bg-indigo-100 text-indigo-800",
    return_initiated: "bg-orange-100 text-orange-800",
  };

  // Load order list
  const { ok, data } = await API.get("/orders");
  const container = document.getElementById("orders-list");

  if (!ok || !data?.orders?.length) {
    container.innerHTML = `
      <div class="text-center py-12">
        <p class="text-gray-500 text-lg mb-2">No orders yet</p>
        <a href="/" class="text-indigo-600 hover:underline">Start shopping</a>
      </div>`;
    return;
  }

  container.innerHTML = data.orders.map((order) => `
    <div class="bg-white rounded-lg shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow" onclick="viewOrder('${order.id}')">
      <div class="flex items-center justify-between">
        <div>
          <p class="font-semibold text-gray-900">${order.id}</p>
          <p class="text-sm text-gray-500">${new Date(order.created_at).toLocaleDateString()} — ${order.item_count} item${order.item_count > 1 ? "s" : ""}</p>
        </div>
        <div class="text-right">
          <span class="inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[order.status] || "bg-gray-100 text-gray-600"}">${order.status}</span>
          <p class="font-semibold text-gray-900 mt-1">&euro;${order.total.toFixed(2)}</p>
        </div>
      </div>
    </div>
  `).join("");

  // ── View Order Detail ─────────────────────────────────────

  window.viewOrder = async function (orderId) {
    const detailPanel = document.getElementById("order-detail");
    const detailContent = document.getElementById("detail-content");

    detailContent.innerHTML = '<div class="flex justify-center py-8"><div class="spinner"></div></div>';
    detailPanel.classList.remove("hidden");

    // Load detail and tracking in parallel
    const [detailRes, trackingRes] = await Promise.all([
      API.get(`/orders/${orderId}`),
      API.get(`/orders/${orderId}/tracking`),
    ]);

    if (!detailRes.ok) {
      detailContent.innerHTML = '<p class="text-red-500">Failed to load order detail</p>';
      return;
    }

    const order = detailRes.data;
    const tracking = trackingRes.data;
    const canReturn = order.status === "delivered";

    detailContent.innerHTML = `
      <div class="space-y-4">
        <!-- Items -->
        <div>
          <h3 class="font-semibold text-gray-900 text-sm mb-2">Items</h3>
          <div class="space-y-2">
            ${(order.items || []).map((item) => `
              <div class="flex justify-between text-sm">
                <span class="text-gray-700">${item.name} x${item.quantity}</span>
                <span class="font-medium text-gray-900">&euro;${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            `).join("")}
          </div>
        </div>

        <!-- Shipping -->
        ${order.shipping ? `
        <div class="border-t border-gray-100 pt-3">
          <h3 class="font-semibold text-gray-900 text-sm mb-1">Shipping</h3>
          <p class="text-sm text-gray-600">${order.shipping.name || ""}</p>
          <p class="text-sm text-gray-600">${order.shipping.address || ""}</p>
          ${order.shipping.phone ? `<p class="text-sm text-gray-400">${order.shipping.phone}</p>` : ""}
        </div>` : ""}

        <!-- Payment -->
        ${order.payment ? `
        <div class="border-t border-gray-100 pt-3">
          <h3 class="font-semibold text-gray-900 text-sm mb-1">Payment</h3>
          <p class="text-sm text-gray-600">${order.payment.method || "Card"} ending in ${order.payment.last_four}</p>
          <p class="text-sm font-semibold text-gray-900">&euro;${order.payment.amount.toFixed(2)} ${order.payment.currency}</p>
        </div>` : ""}

        <!-- Tracking -->
        ${tracking ? `
        <div class="border-t border-gray-100 pt-3">
          <h3 class="font-semibold text-gray-900 text-sm mb-2">Tracking</h3>
          ${tracking.carrier ? `
            <p class="text-sm text-gray-600 mb-2">${tracking.carrier} — <span class="font-mono text-xs">${tracking.tracking_number || ""}</span></p>
            ${tracking.updates?.length ? `
              <div class="border-l-2 border-indigo-200 pl-4 space-y-3">
                ${tracking.updates.map((u) => `
                  <div>
                    <p class="text-sm font-medium text-gray-900">${u.status}</p>
                    <p class="text-xs text-gray-400">${u.location} — ${new Date(u.timestamp).toLocaleString()}</p>
                  </div>
                `).join("")}
              </div>` : ""}
          ` : `<p class="text-sm text-gray-400">${tracking.message || "Tracking not available yet"}</p>`}
        </div>` : ""}

        <!-- Return button -->
        ${canReturn ? `
        <div class="border-t border-gray-100 pt-3">
          <button onclick="requestReturn('${orderId}')" id="return-btn-${orderId}"
            class="text-sm border border-red-300 text-red-600 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors">
            Request Return
          </button>
        </div>` : ""}
      </div>`;

    // Scroll to detail
    detailPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  window.closeDetail = function () {
    document.getElementById("order-detail").classList.add("hidden");
  };

  window.requestReturn = async function (orderId) {
    const btn = document.getElementById(`return-btn-${orderId}`);
    btn.disabled = true;
    btn.textContent = "Requesting...";

    const { ok, data } = await API.post(`/orders/${orderId}/return`, {
      reason: "Changed my mind",
    });

    if (ok) {
      btn.textContent = "Return Requested";
      btn.classList.remove("border-red-300", "text-red-600", "hover:bg-red-50");
      btn.classList.add("bg-orange-100", "text-orange-700", "border-orange-200");
      showToast(`Return initiated: ${data?.return_id || ""}`, "success");
    } else {
      btn.disabled = false;
      btn.textContent = "Request Return";
      showToast(data?.error?.message || "Cannot return this order", "error");
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

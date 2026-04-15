// CartNova Checkout Page
// Multi-step checkout flow: Shipping -> Payment -> Confirm -> Done

(function () {
  if (!Auth.requireAuth()) return;

  const params = new URLSearchParams(window.location.search);
  const checkoutId = params.get("id");

  if (!checkoutId) {
    window.location.href = "/cart.html";
    return;
  }

  // Display checkout ID
  document.getElementById("checkout-id-badge").textContent = checkoutId;

  // State tracking
  let shippingData = null;
  let paymentData = null;

  // Start at step 1
  showStep("shipping");

  // ── Step Navigation ─────────────────────────────────────────

  function showStep(step) {
    // Hide all panels
    document.querySelectorAll("#checkout-panels > div").forEach((el) => el.classList.add("hidden"));

    // Show the target panel
    const panel = document.getElementById(`panel-${step}`);
    if (panel) panel.classList.remove("hidden");

    // Update progress dots
    const steps = ["shipping", "payment", "confirm", "done"];
    const currentIdx = steps.indexOf(step);

    steps.forEach((s, i) => {
      const dot = document.getElementById(`step-${i + 1}-dot`);
      if (i < currentIdx) {
        // Completed
        dot.className = "w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-semibold text-white transition-all";
        dot.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>`;
      } else if (i === currentIdx) {
        // Active
        dot.className = "w-10 h-10 rounded-full border-2 border-indigo-600 bg-indigo-50 flex items-center justify-center text-sm font-semibold text-indigo-600 transition-all";
        dot.textContent = i + 1;
      } else {
        // Upcoming
        dot.className = "w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center text-sm font-semibold text-gray-400 transition-all";
        dot.textContent = i + 1;
      }

      // Update connector lines
      if (i < 3) {
        const line = document.getElementById(`line-${i + 1}-${i + 2}`);
        if (line) {
          line.className = i < currentIdx
            ? "flex-1 h-0.5 bg-indigo-600 mx-2 transition-colors"
            : "flex-1 h-0.5 bg-gray-200 mx-2 transition-colors";
        }
      }
    });
  }

  // ── Step 1: Shipping ────────────────────────────────────────

  window.submitShipping = async function (e) {
    e.preventDefault();
    const btn = document.getElementById("shipping-btn");
    btn.disabled = true;
    btn.textContent = "Saving...";

    shippingData = {
      name: document.getElementById("ship-name").value,
      address_line_1: document.getElementById("ship-address").value,
      city: document.getElementById("ship-city").value,
      postal_code: document.getElementById("ship-postal").value,
      country: document.getElementById("ship-country").value,
      phone: document.getElementById("ship-phone").value,
    };

    const { ok } = await API.put(`/checkout/${checkoutId}/shipping`, shippingData);

    if (ok) {
      showStep("payment");
    } else {
      btn.disabled = false;
      btn.textContent = "Continue to Payment";
      showToast("Failed to save shipping address", "error");
    }
  };

  // ── Step 2: Payment ─────────────────────────────────────────

  window.submitPayment = async function (e) {
    e.preventDefault();
    const btn = document.getElementById("payment-btn");
    btn.disabled = true;
    btn.textContent = "Saving...";

    paymentData = {
      payment_method: document.getElementById("pay-method").value,
      card_token: document.getElementById("pay-token").value,
    };

    const { ok } = await API.put(`/checkout/${checkoutId}/payment`, paymentData);

    if (ok) {
      // Build order summary for review step
      const summary = document.getElementById("order-summary");
      summary.innerHTML = `
        <div class="border border-gray-200 rounded-lg p-3">
          <h3 class="font-semibold text-gray-900 mb-1">Shipping To</h3>
          <p>${shippingData.name}</p>
          <p>${shippingData.address_line_1}</p>
          <p>${shippingData.city}, ${shippingData.postal_code}, ${shippingData.country}</p>
          ${shippingData.phone ? `<p>${shippingData.phone}</p>` : ""}
        </div>
        <div class="border border-gray-200 rounded-lg p-3">
          <h3 class="font-semibold text-gray-900 mb-1">Payment</h3>
          <p>${paymentData.payment_method === "card" ? "Credit/Debit Card" : "iDEAL"}</p>
          <p class="text-gray-400">Token: ${paymentData.card_token}</p>
        </div>`;
      showStep("confirm");
    } else {
      btn.disabled = false;
      btn.textContent = "Review Order";
      showToast("Failed to save payment method", "error");
    }
  };

  // ── Step 3: Confirm ─────────────────────────────────────────

  window.confirmOrder = async function () {
    const btn = document.getElementById("confirm-btn");
    btn.disabled = true;
    btn.textContent = "Placing order...";

    const { ok, data } = await API.post(`/checkout/${checkoutId}/confirm`, {});

    if (ok) {
      // Now check status
      const statusRes = await API.get(`/checkout/${checkoutId}/status`);

      document.getElementById("done-message").textContent = data?.message || "Order placed successfully!";
      document.getElementById("done-order-id").textContent = data?.order_id ? `Order ID: ${data.order_id}` : "";
      document.getElementById("done-status").textContent = `Status: ${statusRes.data?.status || data?.status || "confirmed"}`;

      showStep("done");
    } else {
      btn.disabled = false;
      btn.textContent = "Place Order";
      showToast("Failed to place order", "error");
    }
  };

  // ── Helpers ─────────────────────────────────────────────────

  function showToast(message, type) {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }
})();

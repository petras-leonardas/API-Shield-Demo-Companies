// CartNova Navigation
// Injects the shared header into every page.

(function () {
  const user = Auth.getUser();
  const loggedIn = Auth.isLoggedIn();
  const currentPath = window.location.pathname;

  function isActive(path) {
    if (path === "/" && currentPath === "/") return true;
    if (path !== "/" && currentPath.startsWith(path)) return true;
    return false;
  }

  function navLink(href, label) {
    const active = isActive(href);
    const cls = active
      ? "text-indigo-600 font-semibold border-b-2 border-indigo-600 pb-1"
      : "text-gray-600 hover:text-indigo-600";
    return `<a href="${href}" class="${cls} text-sm transition-colors">${label}</a>`;
  }

  const nav = document.createElement("header");
  nav.innerHTML = `
    <div class="bg-white border-b border-gray-200 sticky top-0 z-50">
      <!-- Top bar -->
      <div class="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <!-- Logo -->
        <a href="/" class="flex items-center gap-2 shrink-0">
          <img src="/images/logo.svg" alt="CartNova" class="w-8 h-8" onerror="this.outerHTML='<div class=\\'w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center\\'><span class=\\'text-white font-bold text-sm\\'>CN</span></div>'">
          <span class="text-xl font-bold text-gray-900">CartNova</span>
        </a>

        <!-- Search -->
        <form action="/" method="GET" class="flex-1 max-w-xl">
          <div class="relative">
            <input type="text" name="q" placeholder="Search products..."
              class="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              value="${new URLSearchParams(window.location.search).get("q") || ""}">
            <button type="submit" class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-600">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
            </button>
          </div>
        </form>

        <!-- Right actions -->
        <div class="flex items-center gap-4 shrink-0">
          ${loggedIn ? `
            <a href="/cart.html" class="relative text-gray-600 hover:text-indigo-600 transition-colors" title="Cart">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z"/>
              </svg>
              <span id="cart-badge" class="hidden absolute -top-1 -right-2 bg-amber-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center"></span>
            </a>
            <a href="/account.html" class="text-sm text-gray-600 hover:text-indigo-600 transition-colors">${user?.name?.split(" ")[0] || "Account"}</a>
            <button onclick="Auth.logout()" class="text-sm text-gray-500 hover:text-red-600 transition-colors">Logout</button>
          ` : `
            <a href="/login.html" class="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">Login</a>
          `}
        </div>
      </div>

      <!-- Nav links -->
      <nav class="max-w-7xl mx-auto px-4 pb-2 flex items-center gap-6">
        ${navLink("/", "Home")}
        ${navLink("/category.html?id=cat_elec", "Electronics")}
        ${navLink("/category.html?id=cat_clth", "Clothing")}
        ${navLink("/category.html?id=cat_home", "Home & Kitchen")}
        ${navLink("/category.html?id=cat_sprt", "Sports")}
        ${navLink("/category.html?id=cat_book", "Books")}
        <span class="flex-1"></span>
        ${loggedIn ? navLink("/orders.html", "My Orders") : ""}
        ${navLink("/seller.html", "Seller Portal")}
      </nav>
    </div>
  `;

  document.body.prepend(nav);

  // Update cart badge if logged in
  if (loggedIn) {
    API.get("/cart").then(({ ok, data }) => {
      if (ok && data?.item_count > 0) {
        const badge = document.getElementById("cart-badge");
        if (badge) {
          badge.textContent = data.item_count;
          badge.classList.remove("hidden");
        }
      }
    });
  }
})();

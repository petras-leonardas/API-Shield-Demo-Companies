// CartNova Auth Module
// Manages JWT tokens (localStorage) and seller API keys (sessionStorage).

const Auth = {
  // ── JWT Token Management ────────────────────────────────────────

  getToken() {
    return localStorage.getItem("cartnova_token");
  },

  setToken(token) {
    localStorage.setItem("cartnova_token", token);
  },

  clear() {
    localStorage.removeItem("cartnova_token");
    localStorage.removeItem("cartnova_user");
  },

  isLoggedIn() {
    const token = this.getToken();
    if (!token) return false;
    // Check if token is expired
    try {
      const payload = this._decodePayload(token);
      return payload.exp > Date.now() / 1000;
    } catch {
      return false;
    }
  },

  /** Store user info from login response. */
  setUser(user) {
    localStorage.setItem("cartnova_user", JSON.stringify(user));
  },

  /** Get stored user info. */
  getUser() {
    try {
      return JSON.parse(localStorage.getItem("cartnova_user"));
    } catch {
      return null;
    }
  },

  /** Decode JWT payload (no verification -- just for display). */
  _decodePayload(token) {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64));
  },

  /** Redirect to login if not authenticated. Returns false if redirecting. */
  requireAuth() {
    if (!this.isLoggedIn()) {
      window.location.href = `/login.html?redirect=${encodeURIComponent(window.location.href)}`;
      return false;
    }
    return true;
  },

  /** Logout and redirect to home. */
  logout() {
    this.clear();
    window.location.href = "/";
  },

  // ── Seller API Key Management ──────────────────────────────────

  getSellerKey() {
    return sessionStorage.getItem("cartnova_seller_key");
  },

  setSellerKey(key) {
    sessionStorage.setItem("cartnova_seller_key", key);
  },

  clearSellerKey() {
    sessionStorage.removeItem("cartnova_seller_key");
  },
};

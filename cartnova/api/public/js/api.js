// CartNova API Client
// All frontend API calls go through this module.
// Automatically attaches JWT or API key headers as appropriate.

const API = {
  /** GET request with optional JWT auth. */
  async get(path) {
    return this._request("GET", path);
  },

  /** POST request with JSON body. */
  async post(path, body) {
    return this._request("POST", path, body);
  },

  /** PUT request with JSON body. */
  async put(path, body) {
    return this._request("PUT", path, body);
  },

  /** DELETE request. */
  async del(path) {
    return this._request("DELETE", path);
  },

  /** Seller-authenticated requests (X-Seller-Key header). */
  seller: {
    async get(path) {
      return API._request("GET", path, null, { "X-Seller-Key": Auth.getSellerKey() });
    },
    async post(path, body) {
      return API._request("POST", path, body, { "X-Seller-Key": Auth.getSellerKey() });
    },
    async put(path, body) {
      return API._request("PUT", path, body, { "X-Seller-Key": Auth.getSellerKey() });
    },
  },

  /**
   * Core request method.
   * @returns {{ ok: boolean, status: number, data: any }}
   */
  async _request(method, path, body, extraHeaders) {
    const headers = { Accept: "application/json" };

    // Auto-attach JWT if available
    const token = Auth.getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    if (body) {
      headers["Content-Type"] = "application/json";
    }

    if (extraHeaders) {
      Object.assign(headers, extraHeaders);
    }

    try {
      const resp = await fetch(`/api/v2${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      let data = null;
      const contentType = resp.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        data = await resp.json();
      }

      // Handle 401 -- redirect to login
      if (resp.status === 401) {
        Auth.clear();
        if (!window.location.pathname.includes("login.html")) {
          window.location.href = `/login.html?redirect=${encodeURIComponent(window.location.href)}`;
        }
        return { ok: false, status: 401, data };
      }

      return { ok: resp.ok, status: resp.status, data };
    } catch (err) {
      console.error(`API ${method} ${path} failed:`, err);
      return { ok: false, status: 0, data: null, error: err.message };
    }
  },
};

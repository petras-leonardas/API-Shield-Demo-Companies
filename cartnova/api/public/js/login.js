// CartNova Login Page

// If already logged in, redirect
if (Auth.isLoggedIn()) {
  const redirect = new URLSearchParams(window.location.search).get("redirect") || "/";
  window.location.href = redirect;
}

function switchTab(tab) {
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");
  const loginTab = document.getElementById("login-tab");
  const registerTab = document.getElementById("register-tab");

  if (tab === "login") {
    loginForm.classList.remove("hidden");
    registerForm.classList.add("hidden");
    loginTab.classList.add("bg-white", "text-gray-900", "shadow-sm");
    loginTab.classList.remove("text-gray-500");
    registerTab.classList.remove("bg-white", "text-gray-900", "shadow-sm");
    registerTab.classList.add("text-gray-500");
  } else {
    registerForm.classList.remove("hidden");
    loginForm.classList.add("hidden");
    registerTab.classList.add("bg-white", "text-gray-900", "shadow-sm");
    registerTab.classList.remove("text-gray-500");
    loginTab.classList.remove("bg-white", "text-gray-900", "shadow-sm");
    loginTab.classList.add("text-gray-500");
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const btn = document.getElementById("login-btn");
  const errorEl = document.getElementById("login-error");
  errorEl.classList.add("hidden");
  btn.disabled = true;
  btn.textContent = "Signing in...";

  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;

  const { ok, data } = await API.post("/auth/login", { email, password });

  if (ok && data?.access_token) {
    Auth.setToken(data.access_token);
    Auth.setUser(data.user);
    const redirect = new URLSearchParams(window.location.search).get("redirect") || "/";
    window.location.href = redirect;
  } else {
    errorEl.textContent = data?.error?.message || "Login failed. Please try again.";
    errorEl.classList.remove("hidden");
    btn.disabled = false;
    btn.textContent = "Sign In";
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const btn = document.getElementById("register-btn");
  const errorEl = document.getElementById("register-error");
  errorEl.classList.add("hidden");
  btn.disabled = true;
  btn.textContent = "Creating account...";

  const name = document.getElementById("register-name").value;
  const email = document.getElementById("register-email").value;
  const password = document.getElementById("register-password").value;

  const { ok, data } = await API.post("/auth/register", { name, email, password });

  if (ok && data?.access_token) {
    Auth.setToken(data.access_token);
    Auth.setUser(data.user);
    const redirect = new URLSearchParams(window.location.search).get("redirect") || "/";
    window.location.href = redirect;
  } else {
    errorEl.textContent = data?.error?.message || "Registration failed. Please try again.";
    errorEl.classList.remove("hidden");
    btn.disabled = false;
    btn.textContent = "Create Account";
  }
}

function fillLogin(email) {
  document.getElementById("login-email").value = email;
  document.getElementById("login-password").value = "password123";
  switchTab("login");
}

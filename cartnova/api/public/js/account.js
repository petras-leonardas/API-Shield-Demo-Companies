// CartNova Account Page

(async function () {
  if (!Auth.requireAuth()) return;

  let profileData = null;

  // Load profile and addresses in parallel
  const [profileRes, addressRes] = await Promise.all([
    API.get("/users/me"),
    API.get("/users/me/addresses"),
  ]);

  // Render profile
  if (profileRes.ok) {
    profileData = profileRes.data;
    renderProfile(profileData);
  }

  // Render addresses
  if (addressRes.ok) {
    renderAddresses(addressRes.data?.addresses || []);
  }

  function renderProfile(p) {
    document.getElementById("profile-view").innerHTML = `
      <div class="flex items-center gap-3 mb-3">
        <div class="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
          <span class="text-indigo-600 font-bold text-lg">${p.name?.charAt(0) || "?"}</span>
        </div>
        <div>
          <p class="font-semibold text-gray-900">${p.name}</p>
          <p class="text-gray-500">${p.email}</p>
        </div>
      </div>
      <div class="border-t border-gray-100 pt-3 space-y-1.5">
        <p><span class="text-gray-400 w-16 inline-block">Phone:</span> ${p.phone || "Not set"}</p>
        <p><span class="text-gray-400 w-16 inline-block">Since:</span> ${new Date(p.created_at).toLocaleDateString()}</p>
      </div>`;

    // Pre-fill edit form
    document.getElementById("edit-name").value = p.name || "";
    document.getElementById("edit-phone").value = p.phone || "";
  }

  function renderAddresses(addresses) {
    const container = document.getElementById("addresses-list");
    if (addresses.length === 0) {
      container.innerHTML = '<p class="text-gray-400">No saved addresses</p>';
      return;
    }
    container.innerHTML = addresses.map((addr) => `
      <div class="border border-gray-200 rounded-lg p-3">
        <p class="font-medium text-gray-900">${addr.name}</p>
        <p class="text-gray-600">${addr.address_line_1}</p>
        ${addr.address_line_2 ? `<p class="text-gray-600">${addr.address_line_2}</p>` : ""}
        <p class="text-gray-600">${addr.city}, ${addr.postal_code}, ${addr.country}</p>
        ${addr.phone ? `<p class="text-gray-400">${addr.phone}</p>` : ""}
      </div>
    `).join("");
  }

  window.toggleEdit = function () {
    document.getElementById("profile-view").classList.toggle("hidden");
    document.getElementById("profile-form").classList.toggle("hidden");
    document.getElementById("edit-toggle").classList.toggle("hidden");
  };

  window.saveProfile = async function (e) {
    e.preventDefault();
    const { ok, data } = await API.put("/users/me", {
      name: document.getElementById("edit-name").value,
      phone: document.getElementById("edit-phone").value,
    });
    if (ok) {
      profileData = data;
      renderProfile(data);
      toggleEdit();
      showToast("Profile updated", "success");
    } else {
      showToast("Failed to update profile", "error");
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

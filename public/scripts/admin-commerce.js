function getCommerceNodes() {
  return {
    statusNode: document.querySelector("[data-commerce-status]"),
    formNode: document.querySelector("[data-commerce-form]"),
    submitNode: document.querySelector("[data-commerce-submit]"),
  };
}

function setStatus(message, tone = "neutral") {
  const { statusNode } = getCommerceNodes();
  if (!statusNode) return;
  statusNode.textContent = message;
  statusNode.dataset.tone = tone;
}

function showToast(message, tone = "good") {
  const existing = document.querySelector("[data-toast]");
  existing?.remove();
  document.body.insertAdjacentHTML(
    "beforeend",
    `<p class="action-toast" data-toast data-tone="${tone}">${escapeHtml(message)}</p>`,
  );
  window.setTimeout(() => document.querySelector("[data-toast]")?.remove(), 3600);
}

async function api(path, options = {}) {
  const adminKey = localStorage.getItem("shkeeno-admin-key") || "";
  const response = await fetch(path, {
    ...options,
    headers: {
      "content-type": "application/json",
      "x-admin-key": adminKey,
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed.");
  return data;
}

function setValue(formNode, name, value) {
  const field = formNode?.elements.namedItem(name);
  if (!field) return;
  if (field.type === "checkbox") {
    field.checked = Boolean(value);
  } else {
    field.value = value ?? "";
  }
}

function fillForm(formNode, settings = {}) {
  if (!formNode) return;
  setValue(formNode, "shop_name", settings.shop_name || "Shkeeno");
  setValue(formNode, "support_email", settings.support_email || "");
  setValue(formNode, "allowed_countries", Array.isArray(settings.allowed_countries) ? settings.allowed_countries.join(", ") : "");
  setValue(formNode, "allow_promotion_codes", settings.allow_promotion_codes !== false);
  setValue(formNode, "require_phone", settings.require_phone !== false);
  setValue(formNode, "collect_billing_address", settings.collect_billing_address !== false);
  setValue(formNode, "standard_rate_name", settings.standard_rate_name || "United Kingdom");
  setValue(formNode, "standard_rate_amount", settings.standard_rate_amount ?? 495);
  setValue(formNode, "standard_min_business_days", settings.standard_min_business_days ?? 2);
  setValue(formNode, "standard_max_business_days", settings.standard_max_business_days ?? 10);
  setValue(formNode, "shipping_rate_standard_id", settings.shipping_rate_standard_id || "");
  setValue(formNode, "express_enabled", settings.express_enabled === true);
  setValue(formNode, "express_rate_name", settings.express_rate_name || "International (Non-UK)");
  setValue(formNode, "express_rate_amount", settings.express_rate_amount ?? 995);
  setValue(formNode, "express_min_business_days", settings.express_min_business_days ?? 1);
  setValue(formNode, "express_max_business_days", settings.express_max_business_days ?? 3);
  setValue(formNode, "shipping_rate_express_id", settings.shipping_rate_express_id || "");
}

async function loadSettings() {
  const { formNode } = getCommerceNodes();
  if (!formNode) return;

  try {
    if (!localStorage.getItem("shkeeno-admin-key")) {
      setStatus("Open Access in admin and save the key first.", "bad");
      return;
    }
    setStatus("Loading commerce settings...");
    const data = await api("/api/commerce/settings");
    fillForm(formNode, data.settings || {});
    setStatus("Commerce settings loaded.", "good");
  } catch (error) {
    setStatus(error.message, "bad");
  }
}

document.addEventListener("submit", async (event) => {
  const formNode = event.target.closest("[data-commerce-form]");
  if (!formNode) return;

  event.preventDefault();
  const { submitNode } = getCommerceNodes();

  try {
    setStatus("Saving commerce settings...");
    if (submitNode) submitNode.disabled = true;
    const formData = new FormData(formNode);
    const body = Object.fromEntries(formData.entries());
    body.allow_promotion_codes = formNode.elements.namedItem("allow_promotion_codes").checked;
    body.require_phone = formNode.elements.namedItem("require_phone").checked;
    body.collect_billing_address = formNode.elements.namedItem("collect_billing_address").checked;
    body.express_enabled = formNode.elements.namedItem("express_enabled").checked;

    const data = await api("/api/commerce/settings", {
      method: "PUT",
      body: JSON.stringify(body),
    });

    fillForm(formNode, data.settings || body);
    setStatus("Commerce settings saved.", "good");
    showToast("Commerce settings saved.");
  } catch (error) {
    setStatus(error.message, "bad");
    showToast(error.message, "bad");
  } finally {
    if (submitNode) submitNode.disabled = false;
  }
});

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
  });
}

document.addEventListener("astro:page-load", loadSettings);

loadSettings();

const CART_KEY = "shkeeno-cart";
const SHIPPING_COUNTRY_KEY = "shkeeno-shipping-country";
let commerceSettings = null;
let shippingCountryBound = false;

const COUNTRY_LABELS = {
  AT: "Austria",
  AU: "Australia",
  BE: "Belgium",
  BG: "Bulgaria",
  CA: "Canada",
  CH: "Switzerland",
  CY: "Cyprus",
  CZ: "Czech Republic",
  DE: "Germany",
  DK: "Denmark",
  EE: "Estonia",
  ES: "Spain",
  FI: "Finland",
  FR: "France",
  GB: "United Kingdom",
  GR: "Greece",
  HK: "Hong Kong",
  HR: "Croatia",
  HU: "Hungary",
  IE: "Ireland",
  IT: "Italy",
  JP: "Japan",
  KR: "South Korea",
  LT: "Lithuania",
  LU: "Luxembourg",
  LV: "Latvia",
  MT: "Malta",
  NL: "Netherlands",
  NO: "Norway",
  NZ: "New Zealand",
  PL: "Poland",
  PT: "Portugal",
  RO: "Romania",
  SE: "Sweden",
  SG: "Singapore",
  SI: "Slovenia",
  SK: "Slovakia",
  US: "United States",
  AE: "United Arab Emirates",
};

function readCart() {
  try {
    const cart = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
    if (!Array.isArray(cart)) return [];
    return cart
      .map((item) => ({
        id: String(item.id || "").trim(),
        quantity: Math.max(1, Math.min(10, Number(item.quantity || 1))),
      }))
      .filter((item) => item.id);
  } catch {
    return [];
  }
}

function writeCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  renderCartCount();
}

function readShippingCountry() {
  return localStorage.getItem(SHIPPING_COUNTRY_KEY) || "";
}

function writeShippingCountry(country) {
  if (!country) {
    localStorage.removeItem(SHIPPING_COUNTRY_KEY);
    return;
  }
  localStorage.setItem(SHIPPING_COUNTRY_KEY, country);
}

function formatPrice(value) {
  return `£${Number(value || 0).toFixed(2)}`;
}

function toTitleCase(value) {
  const smallWords = new Set(["a", "an", "and", "as", "at", "but", "by", "for", "in", "of", "on", "or", "the", "to", "with"]);
  return String(value || "")
    .toLowerCase()
    .split(/(\s+|[-/])/)
    .map((part, index) => {
      if (!part.trim() || part === "-" || part === "/") return part;
      if (index > 0 && smallWords.has(part)) return part;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join("");
}

function renderCartCount() {
  const count = readCart().reduce((total, item) => total + item.quantity, 0);
  document.querySelectorAll("[data-cart-count]").forEach((node) => {
    node.textContent = count > 0 ? String(count) : "0";
    node.dataset.empty = count === 0 ? "true" : "false";
  });
}

function getCartElements() {
  return {
    cartDrawer: document.querySelector("[data-cart-drawer]"),
    cartDrawerItems: document.querySelector("[data-cart-drawer-items]"),
    cartStatus: document.querySelector("[data-cart-status]"),
    cartSubtotalNodes: document.querySelectorAll("[data-cart-subtotal]"),
    cartPage: document.querySelector("[data-cart-page]"),
    cartPageItems: document.querySelector("[data-cart-page-items]"),
    cartPageStatus: document.querySelector("[data-cart-page-status]"),
    cartPageSummary: document.querySelector("[data-cart-page-summary]"),
    shippingCountrySelect: document.querySelector("[data-shipping-country]"),
    shippingCountryHint: document.querySelector("[data-shipping-country-hint]"),
    newsletterOptIn: document.querySelector("[data-cart-newsletter-optin]"),
  };
}

function setCartStatus(message, tone = "neutral", target = getCartElements().cartStatus) {
  if (!target) return;
  target.hidden = false;
  target.textContent = message;
  target.dataset.tone = tone;
}

function clearCartStatus(target = getCartElements().cartStatus) {
  if (!target) return;
  target.hidden = true;
  target.textContent = "";
}

function openCartDrawer() {
  const { cartDrawer } = getCartElements();
  if (!cartDrawer) return;
  cartDrawer.hidden = false;
  document.body.classList.add("cart-open");
}

function closeCartDrawer() {
  const { cartDrawer } = getCartElements();
  if (!cartDrawer) return;
  cartDrawer.hidden = true;
  document.body.classList.remove("cart-open");
  clearCartStatus();
}

async function fetchCartProducts(cart) {
  if (cart.length === 0) return [];
  const ids = cart.map((item) => item.id).join(",");
  const response = await fetch(`/api/cart/products?ids=${encodeURIComponent(ids)}`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Could not load cart.");
  return data.products || [];
}

async function fetchCommerceSettings() {
  const response = await fetch("/api/commerce/public-settings");
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Could not load commerce settings.");
  return data.settings || null;
}

function renderShippingCountryOptions() {
  const { shippingCountrySelect } = getCartElements();
  if (!shippingCountrySelect) return;
  const allowedCountries = [...(commerceSettings?.allowed_countries || [])]
    .sort((left, right) => countryLabel(left).localeCompare(countryLabel(right), "en"));
  const selected = readShippingCountry();
  shippingCountrySelect.innerHTML = [
    '<option value="">Choose country</option>',
    ...allowedCountries.map((country) => `<option value="${escapeAttribute(country)}"${country === selected ? " selected" : ""}>${escapeHtml(countryLabel(country))}</option>`),
  ].join("");
  updateShippingCountryHint();
}

function updateShippingCountryHint() {
  const { shippingCountryHint } = getCartElements();
  if (!shippingCountryHint) return;
  const selected = readShippingCountry();
  if (!selected) {
    shippingCountryHint.textContent = "Choose where we should ship this before checkout.";
    return;
  }
  shippingCountryHint.textContent = selected === "GB"
    ? `${commerceSettings?.standard_rate_name || "United Kingdom"} rate will be used at checkout.`
    : `${commerceSettings?.express_rate_name || "International (Non-UK)"} rate will be used at checkout.`;
}

function openShippingCountryDialog() {
  document.querySelector("[data-shipping-dialog]")?.remove();

  document.body.insertAdjacentHTML(
    "beforeend",
    `
      <div class="confirm-backdrop" data-shipping-dialog>
        <section class="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="shipping-country-title">
          <p class="eyebrow">Delivery country</p>
          <h2 id="shipping-country-title">Choose where we should ship this.</h2>
          <p>We use this to apply the correct United Kingdom or international shipping rate before opening checkout.</p>
          <div class="confirm-actions confirm-actions-wide">
            <button type="button" data-shipping-dialog-close>Keep browsing</button>
            <button type="button" data-shipping-dialog-focus>Choose country</button>
          </div>
        </section>
      </div>
    `,
  );
}

function makeCartRows(products, cart) {
  const quantities = new Map(cart.map((item) => [item.id, item.quantity]));
  return products
    .map((product) => ({
      ...product,
      quantity: quantities.get(product.id) || 1,
      heroImage: [...(product.product_images || [])].sort((a, b) => a.sort_order - b.sort_order)[0]?.url || "",
    }))
    .filter((product) => product.quantity > 0);
}

function renderCartMarkup(products, cart, target) {
  if (!target) return 0;

  if (products.length === 0) {
    target.innerHTML = '<p class="empty-copy">Your cart is empty.</p>';
    return 0;
  }

  const rows = makeCartRows(products, cart);
  const subtotal = rows.reduce((sum, product) => sum + Number(product.price_gbp || 0) * product.quantity, 0);

  target.innerHTML = rows.map((product) => `
    <article class="cart-item">
      <a href="/shop/${product.slug}" class="cart-item-image ${product.heroImage ? "has-image" : ""}" ${product.heroImage ? `style="--product-image: url('${escapeAttribute(product.heroImage)}')"` : ""} aria-label="View ${escapeHtml(toTitleCase(product.name))}"></a>
      <div class="cart-item-copy">
        <div class="cart-item-head">
          <div>
            <p>${escapeHtml(product.brand || product.category || "Shkeeno")}</p>
            <h3><a href="/shop/${product.slug}">${escapeHtml(toTitleCase(product.name))}</a></h3>
          </div>
          <strong>${formatPrice(product.price_gbp)}</strong>
        </div>
        <p>${escapeHtml(product.short_description || "")}</p>
        <div class="cart-item-actions">
          <div class="cart-quantity" aria-label="Quantity controls">
            <button type="button" data-cart-decrease="${product.id}" aria-label="Decrease quantity for ${escapeAttribute(toTitleCase(product.name))}">−</button>
            <span>${product.quantity}</span>
            <button type="button" data-cart-increase="${product.id}" aria-label="Increase quantity for ${escapeAttribute(toTitleCase(product.name))}">+</button>
          </div>
          <button type="button" class="cart-remove" data-cart-remove="${product.id}">Remove</button>
        </div>
      </div>
    </article>
  `).join("");

  return subtotal;
}

async function refreshCartUI() {
  const {
    cartDrawerItems,
    cartPageItems,
    cartPageSummary,
    cartPageStatus,
    cartSubtotalNodes,
  } = getCartElements();
  const cart = readCart();
  renderCartCount();

  if (cart.length === 0) {
    renderCartMarkup([], [], cartDrawerItems);
    renderCartMarkup([], [], cartPageItems);
    cartSubtotalNodes.forEach((node) => { node.textContent = "£0.00"; });
    if (cartPageSummary) cartPageSummary.hidden = true;
    updateShippingCountryHint();
    return;
  }

  try {
    const products = await fetchCartProducts(cart);
    const subtotal = renderCartMarkup(products, cart, cartDrawerItems);
    renderCartMarkup(products, cart, cartPageItems);
    cartSubtotalNodes.forEach((node) => { node.textContent = formatPrice(subtotal); });
    if (cartPageSummary) cartPageSummary.hidden = false;
    clearCartStatus();
    clearCartStatus(cartPageStatus);
    updateShippingCountryHint();
  } catch (error) {
    setCartStatus(error.message, "bad");
    setCartStatus(error.message, "bad", cartPageStatus);
  }
}

function updateQuantity(productId, delta) {
  const cart = readCart();
  const next = cart
    .map((item) => item.id === productId ? { ...item, quantity: item.quantity + delta } : item)
    .filter((item) => item.quantity > 0)
    .slice(0, 24);
  writeCart(next);
  refreshCartUI();
}

function removeItem(productId) {
  const next = readCart().filter((item) => item.id !== productId);
  writeCart(next);
  refreshCartUI();
}

function addToCart(product) {
  const cart = readCart();
  const existing = cart.find((item) => item.id === product.id);

  if (existing) {
    existing.quantity = Math.min(10, existing.quantity + 1);
  } else {
    cart.push({ id: product.id, quantity: 1 });
  }

  writeCart(cart);
  refreshCartUI();
  openCartDrawer();
  setCartStatus(`${toTitleCase(product.name)} added to cart.`, "good");
}

async function startCheckout() {
  const { cartPageStatus, newsletterOptIn } = getCartElements();
  const cart = readCart();
  const shippingCountry = readShippingCountry();
  const newsletterOptInEnabled = Boolean(newsletterOptIn?.checked);
  if (cart.length === 0) {
    setCartStatus("Your cart is empty.", "bad");
    setCartStatus("Your cart is empty.", "bad", cartPageStatus);
    return;
  }

  if (!shippingCountry) {
    const message = "Choose a delivery country before checkout.";
    setCartStatus(message, "bad");
    setCartStatus(message, "bad", cartPageStatus);
    openShippingCountryDialog();
    return;
  }

  setCartStatus("Starting checkout...");
  if (cartPageStatus) setCartStatus("Starting checkout...", "neutral", cartPageStatus);

  try {
    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        items: cart,
        shipping_country: shippingCountry,
        newsletter_opt_in: newsletterOptInEnabled,
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || "Checkout could not start.");
    }

    window.location.href = data.url;
  } catch (error) {
    setCartStatus(error.message, "bad");
    setCartStatus(error.message, "bad", cartPageStatus);
  }
}

document.addEventListener("click", (event) => {
  const addButton = event.target.closest("[data-add-to-cart]");
  if (addButton) {
    const product = {
      id: addButton.dataset.productId,
      name: addButton.dataset.productName || "Product",
    };
    if (!product.id) return;
    addToCart(product);
    return;
  }

  if (event.target.closest("[data-open-cart]")) {
    event.preventDefault();
    openCartDrawer();
    refreshCartUI();
    return;
  }

  if (event.target.closest("[data-cart-close]")) {
    closeCartDrawer();
    return;
  }

  const increase = event.target.closest("[data-cart-increase]");
  if (increase) {
    updateQuantity(increase.dataset.cartIncrease, 1);
    return;
  }

  const decrease = event.target.closest("[data-cart-decrease]");
  if (decrease) {
    updateQuantity(decrease.dataset.cartDecrease, -1);
    return;
  }

  const remove = event.target.closest("[data-cart-remove]");
  if (remove) {
    removeItem(remove.dataset.cartRemove);
    return;
  }

  if (event.target.closest("[data-cart-checkout]")) {
    startCheckout();
    return;
  }

  if (event.target.closest("[data-shipping-dialog-close]")) {
    document.querySelector("[data-shipping-dialog]")?.remove();
    return;
  }

  if (event.target.closest("[data-shipping-dialog-focus]")) {
    document.querySelector("[data-shipping-dialog]")?.remove();
    const { shippingCountrySelect } = getCartElements();
    if (shippingCountrySelect) shippingCountrySelect.focus();
  }
});

function bindShippingCountrySelect() {
  if (shippingCountryBound) return;
  document.addEventListener("change", (event) => {
    const select = event.target.closest("[data-shipping-country]");
    if (!select) return;
    writeShippingCountry(select.value);
    updateShippingCountryHint();
  });
  shippingCountryBound = true;
}

function initCartUI() {
  bindShippingCountrySelect();
  renderCartCount();
  if (commerceSettings) {
    renderShippingCountryOptions();
  }
  refreshCartUI();
}

function hasCartPageTargets() {
  const { cartPage, cartPageItems } = getCartElements();
  return Boolean(cartPage && cartPageItems);
}

function initCartPageWhenReady(attempt = 0) {
  const maxAttempts = 12;

  if (hasCartPageTargets()) {
    initCartUI();
    return;
  }

  if (attempt >= maxAttempts) {
    initCartUI();
    return;
  }

  window.setTimeout(() => {
    initCartPageWhenReady(attempt + 1);
  }, 50);
}

function scheduleCartUIRefresh() {
  initCartUI();
  window.requestAnimationFrame(() => {
    initCartUI();
    initCartPageWhenReady();
  });
  window.setTimeout(() => {
    initCartUI();
    initCartPageWhenReady();
  }, 0);
  initCartPageWhenReady();
}

window.addEventListener("storage", () => {
  const { shippingCountrySelect } = getCartElements();
  renderCartCount();
  refreshCartUI();
  if (shippingCountrySelect) shippingCountrySelect.value = readShippingCountry();
  updateShippingCountryHint();
});

document.addEventListener("astro:page-load", () => {
  scheduleCartUIRefresh();
});

(async () => {
  bindShippingCountrySelect();
  try {
    commerceSettings = await fetchCommerceSettings();
    renderShippingCountryOptions();
  } catch (error) {
    const { shippingCountryHint } = getCartElements();
    if (shippingCountryHint) shippingCountryHint.textContent = error.message;
  }
  scheduleCartUIRefresh();
})();

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
  });
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}

function countryLabel(code) {
  return COUNTRY_LABELS[code] || code;
}

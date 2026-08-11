function formatMoney(amount = 0, currency = "gbp") {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: String(currency || "gbp").toUpperCase(),
  }).format((Number(amount) || 0) / 100);
}

function formatAddress(address) {
  if (!address) return "";
  return [address.line1, address.line2, address.city, address.state, address.postal_code, address.country]
    .filter(Boolean)
    .join(", ");
}

function humanizeStatus(value = "") {
  const clean = String(value || "").trim();
  if (!clean) return "Unavailable";
  return clean.replaceAll("_", " ");
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

function formatDate(value) {
  if (!value) return "Unavailable";
  return new Date(value).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

const shell = document.querySelector("[data-order-success]");
const summaryGrid = document.querySelector("[data-order-success-grid]");
const emptyState = document.querySelector("[data-order-success-empty]");
const copyNode = document.querySelector("[data-order-success-copy]");
const metaNode = document.querySelector("[data-order-success-meta]");
const itemsNode = document.querySelector("[data-order-success-items]");
const emailNode = document.querySelector("[data-order-success-email]");

(async () => {
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get("session_id");

  if (!sessionId) return;

  try {
    const response = await fetch(`/api/commerce/order-summary?session_id=${encodeURIComponent(sessionId)}`);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Could not load order summary.");
    if (!data.order) return;

    const order = data.order;
    if (copyNode) {
      copyNode.textContent = "Thank you. Your order is confirmed and the summary below reflects what we received on our side.";
    }

    if (metaNode) {
      metaNode.innerHTML = `
        <div class="product-stats">
          <div><dt>Order</dt><dd>${order.id.slice(0, 8).toUpperCase()}</dd></div>
          <div><dt>Placed</dt><dd>${formatDate(order.created_at)}</dd></div>
          <div><dt>Total paid</dt><dd>${formatMoney(order.total_amount, order.currency)}</dd></div>
          <div><dt>Status</dt><dd>${humanizeStatus(order.fulfillment_status)}</dd></div>
        </div>
        <div class="order-success-detail-grid">
          <div class="order-success-address">
            <p class="eyebrow">Shipping to</p>
            <p>${order.shipping_name || order.customer_name || "Unavailable"}</p>
            <p>${formatAddress(order.shipping_address) || "Address unavailable."}</p>
          </div>
          <div class="order-success-address">
            <p class="eyebrow">Account email</p>
            <p>${order.email || "Unavailable"}</p>
            <p>Use this same email to revisit the order in Account.</p>
          </div>
        </div>
      `;
    }

    if (itemsNode) {
      itemsNode.innerHTML = `
        <div class="order-success-item-list">
          ${(order.customer_order_items || []).map((item) => `
            <article class="order-success-item">
              <div>
                <p class="eyebrow">Product</p>
                <h3>${toTitleCase(item.product_name)}</h3>
                <p>${formatMoney(item.unit_amount, order.currency)} each</p>
              </div>
              <div class="order-success-item-total">
                <span>Qty ${item.quantity}</span>
                <strong>${formatMoney(item.line_total_amount, order.currency)}</strong>
              </div>
            </article>
          `).join("")}
        </div>
        <div class="order-success-totals">
          <div><span>Subtotal</span><strong>${formatMoney(order.subtotal_amount, order.currency)}</strong></div>
          <div><span>Shipping</span><strong>${formatMoney(order.shipping_amount, order.currency)}</strong></div>
          <div><span>Tax</span><strong>${formatMoney(order.tax_amount, order.currency)}</strong></div>
          <div class="is-total"><span>Total paid</span><strong>${formatMoney(order.total_amount, order.currency)}</strong></div>
        </div>
      `;
    }

    if (emailNode) {
      emailNode.textContent = order.email
        ? `The confirmation is tied to ${order.email}. Keep an eye on that inbox for fulfilment updates and delivery notes.`
        : "Use the same checkout email in Account to view this order again later.";
    }

    summaryGrid.hidden = false;
    emptyState.hidden = true;
  } catch (error) {
    if (copyNode) copyNode.textContent = error.message;
  }
})();

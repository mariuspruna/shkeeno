const FULFILLMENT_OPTIONS = [
  ["unfulfilled", "Unfulfilled"],
  ["packed", "Packed"],
  ["shipped", "Shipped"],
  ["delivered", "Delivered"],
  ["cancelled", "Cancelled"],
  ["needs_attention", "Needs attention"],
];
const PAYMENT_OPTIONS = [
  ["paid", "Paid"],
  ["partially_refunded", "Partially refunded"],
  ["refunded", "Refunded"],
  ["cancelled", "Cancelled"],
];

function setStatus(message, tone = "neutral") {
  const statusNode = document.querySelector("[data-orders-status]");
  if (!statusNode) return;
  statusNode.textContent = message;
  statusNode.dataset.tone = tone;
}

function showToast(message, tone = "good") {
  const existing = document.querySelector("[data-toast]");
  existing?.remove();
  document.body.insertAdjacentHTML(
    "beforeend",
    `<p class="action-toast" data-toast data-tone="${escapeAttribute(tone)}">${escapeHtml(message)}</p>`,
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

function formatMoney(pence, currency = "gbp") {
  return `${currency.toUpperCase()} ${(Number(pence || 0) / 100).toFixed(2)}`;
}

function formatAddress(address) {
  if (!address) return "No address";
  return [address.line1, address.line2, address.city, address.state, address.postal_code, address.country]
    .filter(Boolean)
    .join(", ");
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function selectMarkup(name, currentValue, options) {
  return `
    <select name="${name}">
      ${options.map(([value, label]) => `
        <option value="${escapeAttribute(value)}"${currentValue === value ? " selected" : ""}>${escapeHtml(label)}</option>
      `).join("")}
    </select>
  `;
}

function renderOrders(orders) {
  const tableNode = document.querySelector("[data-orders-table]");
  if (!tableNode) return;

  if (orders.length === 0) {
    tableNode.innerHTML = localStorage.getItem("shkeeno-admin-key")
      ? '<p class="empty-copy">No paid orders yet.</p>'
      : '<p class="empty-copy">Save the admin key in Access, then return here.</p>';
    return;
  }

  tableNode.innerHTML = `
    <div class="orders-stack">
      ${orders.map((order) => `
        <article class="order-card">
          <div class="order-card-head">
            <div>
              <p class="eyebrow">${escapeHtml(order.payment_status)} / ${escapeHtml(order.fulfillment_status)}</p>
              <h3>${escapeHtml(order.customer_name || order.email || "Unknown customer")}</h3>
              <p>${escapeHtml(order.email || "No email")}</p>
            </div>
            <div class="order-card-total">
              <strong>${formatMoney(order.total_amount, order.currency)}</strong>
              <span>${new Date(order.created_at).toLocaleString()}</span>
            </div>
          </div>
          <div class="order-card-grid">
            <div>
              <p class="eyebrow">Items</p>
              <ul class="order-items-list">
                ${(order.customer_order_items || []).map((item) => `
                  <li>
                    <span>${escapeHtml(item.product_name)}</span>
                    <strong>${item.quantity} x ${formatMoney(item.unit_amount, order.currency)}</strong>
                  </li>
                `).join("")}
              </ul>
            </div>
            <div>
              <p class="eyebrow">Shipping</p>
              <p>${escapeHtml(order.shipping_name || "No shipping name")}</p>
              <p>${escapeHtml(formatAddress(order.shipping_address))}</p>
              ${order.shipping_carrier ? `<p>Carrier: ${escapeHtml(order.shipping_carrier)}</p>` : ""}
              ${order.tracking_number ? `<p>Tracking: ${escapeHtml(order.tracking_number)}</p>` : ""}
            </div>
            <div>
              <p class="eyebrow">Totals</p>
              <p>Subtotal: ${formatMoney(order.subtotal_amount, order.currency)}</p>
              <p>Shipping: ${formatMoney(order.shipping_amount, order.currency)}</p>
              <p>Tax: ${formatMoney(order.tax_amount, order.currency)}</p>
              ${order.stock_issue ? '<p class="order-flag">Stock issue needs attention</p>' : ""}
            </div>
          </div>
          <form class="inline-form order-admin-form" data-order-form data-order-id="${order.id}">
            <div class="settings-grid">
              <label class="setting-row">
                <span>Fulfillment status</span>
                ${selectMarkup("fulfillment_status", order.fulfillment_status, FULFILLMENT_OPTIONS)}
              </label>
              <label class="setting-row">
                <span>Payment status</span>
                ${selectMarkup("payment_status", order.payment_status, PAYMENT_OPTIONS)}
              </label>
              <label class="setting-row">
                <span>Carrier</span>
                <input type="text" name="shipping_carrier" value="${escapeAttribute(order.shipping_carrier || "")}" placeholder="Royal Mail" />
              </label>
              <label class="setting-row">
                <span>Tracking number</span>
                <input type="text" name="tracking_number" value="${escapeAttribute(order.tracking_number || "")}" placeholder="Tracking reference" />
              </label>
              <label class="setting-row wide-card">
                <span>Tracking URL</span>
                <input type="url" name="tracking_url" value="${escapeAttribute(order.tracking_url || "")}" placeholder="https://tracking.example/..." />
              </label>
              <label class="setting-row wide-card">
                <span>Internal notes</span>
                <textarea name="fulfillment_notes" placeholder="Packing note, refund context, customer exception...">${escapeHtml(order.fulfillment_notes || "")}</textarea>
              </label>
            </div>
            <div class="order-admin-timestamps">
              <p><strong>Packed:</strong> ${escapeHtml(formatDate(order.packed_at))}</p>
              <p><strong>Shipped:</strong> ${escapeHtml(formatDate(order.shipped_at))}</p>
              <p><strong>Delivered:</strong> ${escapeHtml(formatDate(order.delivered_at))}</p>
              <p><strong>Cancelled:</strong> ${escapeHtml(formatDate(order.cancelled_at))}</p>
              <p><strong>Refunded:</strong> ${escapeHtml(formatDate(order.refunded_at))}</p>
            </div>
            <div class="admin-actions">
              <button type="button" class="back-link" data-order-refresh="${order.id}">Refresh Stripe details</button>
              ${order.payment_status === "paid" || order.payment_status === "partially_refunded"
                ? `<button type="button" class="back-link" data-order-refund="${order.id}">Refund via Stripe</button>`
                : ""}
              <button type="submit" class="reset-button">Save order</button>
            </div>
          </form>
        </article>
      `).join("")}
    </div>
  `;
}

async function loadOrders() {
  try {
    if (!localStorage.getItem("shkeeno-admin-key")) {
      renderOrders([]);
      setStatus("Open Access in admin and save the key first.", "bad");
      return;
    }
    setStatus("Loading orders...");
    const data = await api("/api/commerce/orders");
    renderOrders(data.orders || []);
    setStatus("Orders loaded.", "good");
  } catch (error) {
    renderOrders([]);
    setStatus(error.message, "bad");
  }
}

async function saveOrder(form) {
  const submitButton = form.querySelector('button[type="submit"]');
  const payload = {
    id: form.dataset.orderId,
    fulfillment_status: form.elements.namedItem("fulfillment_status").value,
    payment_status: form.elements.namedItem("payment_status").value,
    shipping_carrier: form.elements.namedItem("shipping_carrier").value,
    tracking_number: form.elements.namedItem("tracking_number").value,
    tracking_url: form.elements.namedItem("tracking_url").value,
    fulfillment_notes: form.elements.namedItem("fulfillment_notes").value,
  };

  setStatus("Saving order...");
  if (submitButton) submitButton.disabled = true;
  try {
    const result = await api("/api/commerce/orders", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    await loadOrders();
    if (result.email_sent && result.email_kind) {
      const message = `Order updated. ${result.email_kind} email sent.`;
      setStatus(message, "good");
      showToast(message);
    } else {
      setStatus("Order updated.", "good");
      showToast("Order updated.");
    }
  } finally {
    if (submitButton) submitButton.disabled = false;
  }
}

async function refreshOrder(orderId, button) {
  setStatus("Refreshing order from Stripe...");
  if (button) button.disabled = true;
  try {
    await api("/api/commerce/orders", {
      method: "PUT",
      body: JSON.stringify({
        id: orderId,
        action: "refresh_from_stripe",
      }),
    });
    await loadOrders();
    setStatus("Order details refreshed from Stripe.", "good");
    showToast("Order details refreshed from Stripe.");
  } finally {
    if (button) button.disabled = false;
  }
}

async function refundOrder(orderId, button) {
  const confirmed = window.confirm(
    "Issue a real Stripe refund for this order? This will refund the payment and email the customer.",
  );
  if (!confirmed) return;

  setStatus("Creating Stripe refund...");
  if (button) button.disabled = true;
  try {
    await api("/api/commerce/orders", {
      method: "PUT",
      body: JSON.stringify({
        id: orderId,
        action: "refund_in_stripe",
      }),
    });
    await loadOrders();
    setStatus("Stripe refund created. Customer emailed.", "good");
    showToast("Stripe refund created. Customer emailed.");
  } finally {
    if (button) button.disabled = false;
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
  });
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}

function initOrdersAdmin() {
  if (!document.querySelector("[data-orders-table]")) return;
  if (localStorage.getItem("shkeeno-admin-key")) {
    loadOrders();
  } else {
    renderOrders([]);
    setStatus("Open Access in admin and save the key first.", "bad");
  }
}

initOrdersAdmin();
document.addEventListener("astro:page-load", initOrdersAdmin);

document.addEventListener("submit", async (event) => {
  const form = event.target.closest("[data-order-form]");
  if (!form) return;
  event.preventDefault();

  try {
    await saveOrder(form);
  } catch (error) {
    setStatus(error.message, "bad");
    showToast(error.message, "bad");
  }
});

document.addEventListener("click", async (event) => {
  const refreshButton = event.target.closest("[data-order-refresh]");
  if (refreshButton) {
    try {
      await refreshOrder(refreshButton.dataset.orderRefresh, refreshButton);
    } catch (error) {
      setStatus(error.message, "bad");
      showToast(error.message, "bad");
    }
    return;
  }

  const refundButton = event.target.closest("[data-order-refund]");
  if (refundButton) {
    try {
      await refundOrder(refundButton.dataset.orderRefund, refundButton);
    } catch (error) {
      setStatus(error.message, "bad");
      showToast(error.message, "bad");
    }
  }
});

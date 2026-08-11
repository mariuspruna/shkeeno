export function renderAddress(address) {
  if (!address) return "";
  return [
    address.line1,
    address.line2,
    address.city,
    address.state,
    address.postal_code,
    address.country,
  ]
    .filter(Boolean)
    .join(", ");
}

export function formatMoney(amount = 0, currency = "gbp") {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: String(currency || "gbp").toUpperCase(),
  }).format((Number(amount) || 0) / 100);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]
  ));
}

async function sendEmail(env, payload) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Resend failed: ${error}`);
  }

  return response.json();
}

function baseEmailPayload(env, to, subject, html) {
  const payload = {
    from: env.ORDER_FROM_EMAIL,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
  };

  if (env.ORDER_SUPPORT_EMAIL) {
    payload.reply_to = env.ORDER_SUPPORT_EMAIL;
  }

  return payload;
}

export async function sendOrderConfirmationEmail(env, order, items = []) {
  if (!env.RESEND_API_KEY || !env.ORDER_FROM_EMAIL || !order?.email) {
    return { skipped: true, reason: "Missing email configuration or recipient." };
  }

  const siteUrl = env.PUBLIC_SITE_URL || "https://shkeeno.com";
  const subject = `Shkeeno order received - ${order.id.slice(0, 8).toUpperCase()}`;
  const orderUrl = `${siteUrl}/account?email=${encodeURIComponent(order.email)}`;
  const itemLines = items.map((item) => `
    <tr>
      <td style="padding:10px 0;border-top:1px solid #ddd;">${escapeHtml(item.product_name)}</td>
      <td style="padding:10px 0;border-top:1px solid #ddd;text-align:center;">${item.quantity}</td>
      <td style="padding:10px 0;border-top:1px solid #ddd;text-align:right;">${escapeHtml(formatMoney(item.line_total_amount, order.currency))}</td>
    </tr>
  `).join("");

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;padding:24px;color:#202020;">
      <p style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;margin:0 0 12px;">Shkeeno</p>
      <h1 style="font-size:32px;line-height:0.95;margin:0 0 18px;text-transform:uppercase;">Order received.</h1>
      <p style="font-size:18px;line-height:1.5;margin:0 0 20px;">Thank you. We have your order and will send another note when it moves from packed to shipped.</p>
      <p style="font-size:14px;line-height:1.5;margin:0 0 20px;"><strong>Order</strong> ${escapeHtml(order.id.slice(0, 8).toUpperCase())}<br /><strong>Email</strong> ${escapeHtml(order.email)}</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin:0 0 20px;">
        <thead>
          <tr>
            <th style="text-align:left;padding-bottom:8px;">Item</th>
            <th style="text-align:center;padding-bottom:8px;">Qty</th>
            <th style="text-align:right;padding-bottom:8px;">Total</th>
          </tr>
        </thead>
        <tbody>${itemLines}</tbody>
      </table>
      <p style="font-size:14px;line-height:1.6;margin:0 0 18px;">
        <strong>Subtotal</strong> ${escapeHtml(formatMoney(order.subtotal_amount, order.currency))}<br />
        <strong>Shipping</strong> ${escapeHtml(formatMoney(order.shipping_amount, order.currency))}<br />
        <strong>Total</strong> ${escapeHtml(formatMoney(order.total_amount, order.currency))}
      </p>
      <p style="font-size:14px;line-height:1.6;margin:0 0 20px;">
        <strong>Shipping to</strong><br />
        ${escapeHtml(order.shipping_name || order.customer_name || "")}<br />
        ${escapeHtml(renderAddress(order.shipping_address))}
      </p>
      <p style="margin:24px 0;">
        <a href="${orderUrl}" style="display:inline-block;background:#202020;color:#f3f0e8;padding:14px 18px;text-decoration:none;font-weight:700;text-transform:uppercase;">View my orders</a>
      </p>
      <p style="font-size:13px;line-height:1.5;color:#555;">Questions? Reply to this email or contact ${escapeHtml(env.ORDER_SUPPORT_EMAIL || env.SUPPORT_EMAIL || "support@shkeeno.com")}.</p>
    </div>
  `;

  return sendEmail(env, baseEmailPayload(env, order.email, subject, html));
}

export async function sendFulfillmentUpdateEmail(env, order, items = [], context = {}) {
  if (!env.RESEND_API_KEY || !env.ORDER_FROM_EMAIL || !order?.email) {
    return { skipped: true, reason: "Missing email configuration or recipient." };
  }

  const siteUrl = env.PUBLIC_SITE_URL || "https://shkeeno.com";
  const orderUrl = `${siteUrl}/account?email=${encodeURIComponent(order.email)}`;
  const itemSummary = items.map((item) => `
    <li style="margin-bottom:8px;">${escapeHtml(item.product_name)} x ${item.quantity}</li>
  `).join("");
  const trackingLine = order.tracking_number
    ? `<p style="font-size:14px;line-height:1.6;margin:0 0 10px;"><strong>Tracking</strong> ${escapeHtml(order.tracking_number)}</p>`
    : "";
  const trackingLink = order.tracking_url
    ? `<p style="margin:0 0 18px;"><a href="${escapeHtml(order.tracking_url)}" style="color:#202020;text-decoration:underline;">Track this order</a></p>`
    : "";

  const variants = {
    shipped: {
      subject: `Shkeeno order shipped - ${order.id.slice(0, 8).toUpperCase()}`,
      title: "Order shipped.",
      copy: "Your order has left us and is now on the way.",
    },
    delivered: {
      subject: `Shkeeno order delivered - ${order.id.slice(0, 8).toUpperCase()}`,
      title: "Order delivered.",
      copy: "Your order is marked as delivered. We hope it earns its place.",
    },
    cancelled: {
      subject: `Shkeeno order cancelled - ${order.id.slice(0, 8).toUpperCase()}`,
      title: "Order cancelled.",
      copy: "Your order has been cancelled. If this looks wrong, reply to this email and we will help.",
    },
    refunded: {
      subject: `Shkeeno order refunded - ${order.id.slice(0, 8).toUpperCase()}`,
      title: "Order refunded.",
      copy: "Your order has been marked as refunded. Please allow a little time for the card statement to catch up.",
    },
  };

  const variant = variants[context.kind];
  if (!variant) return { skipped: true, reason: "No email variant for this change." };

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;padding:24px;color:#202020;">
      <p style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;margin:0 0 12px;">Shkeeno</p>
      <h1 style="font-size:32px;line-height:0.95;margin:0 0 18px;text-transform:uppercase;">${escapeHtml(variant.title)}</h1>
      <p style="font-size:18px;line-height:1.5;margin:0 0 20px;">${escapeHtml(variant.copy)}</p>
      <p style="font-size:14px;line-height:1.6;margin:0 0 10px;"><strong>Order</strong> ${escapeHtml(order.id.slice(0, 8).toUpperCase())}</p>
      ${order.shipping_carrier ? `<p style="font-size:14px;line-height:1.6;margin:0 0 10px;"><strong>Carrier</strong> ${escapeHtml(order.shipping_carrier)}</p>` : ""}
      ${trackingLine}
      ${trackingLink}
      <p style="font-size:14px;line-height:1.6;margin:0 0 10px;"><strong>Items</strong></p>
      <ul style="font-size:14px;line-height:1.6;margin:0 0 20px 18px;padding:0;">${itemSummary}</ul>
      <p style="margin:24px 0;">
        <a href="${orderUrl}" style="display:inline-block;background:#202020;color:#f3f0e8;padding:14px 18px;text-decoration:none;font-weight:700;text-transform:uppercase;">View my orders</a>
      </p>
      <p style="font-size:13px;line-height:1.5;color:#555;">Questions? Reply to this email or contact ${escapeHtml(env.ORDER_SUPPORT_EMAIL || "support@shkeeno.com")}.</p>
    </div>
  `;

  return sendEmail(env, baseEmailPayload(env, order.email, variant.subject, html));
}

function getNodes() {
  return {
    statusNode: document.querySelector("[data-newsletter-admin-status]"),
    statsNode: document.querySelector("[data-newsletter-stats]"),
    queueNode: document.querySelector("[data-newsletter-queue]"),
    subscribersNode: document.querySelector("[data-newsletter-subscribers]"),
    campaignsNode: document.querySelector("[data-newsletter-campaigns]"),
    previewCopyNode: document.querySelector("[data-newsletter-preview-copy]"),
    settingsForm: document.querySelector("[data-newsletter-settings-form]"),
    settingsSubmitNode: document.querySelector("[data-newsletter-settings-submit]"),
    sendNode: document.querySelector("[data-newsletter-send]"),
    refreshNode: document.querySelector("[data-newsletter-refresh]"),
  };
}

function setStatus(message, tone = "neutral") {
  const { statusNode } = getNodes();
  if (!statusNode) return;
  statusNode.textContent = message;
  statusNode.dataset.tone = tone;
}

function showToast(message, tone = "good") {
  const existing = document.querySelector("[data-toast]");
  existing?.remove();
  document.body.insertAdjacentHTML(
    "beforeend",
    `<p class="action-toast" data-toast data-tone="${escapeHtml(tone)}">${escapeHtml(message)}</p>`,
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

function fillSettings(formNode, settings = {}) {
  if (!formNode) return;
  setValue(formNode, "newsletter_enabled", settings.newsletter_enabled !== false);
  setValue(formNode, "newsletter_auto_send_enabled", settings.newsletter_auto_send_enabled !== false);
  setValue(formNode, "newsletter_sender_name", settings.newsletter_sender_name || "Shkeeno");
  setValue(formNode, "newsletter_reply_to_email", settings.newsletter_reply_to_email || "");
  setValue(formNode, "newsletter_confirm_subject", settings.newsletter_confirm_subject || "");
  setValue(formNode, "newsletter_digest_subject", settings.newsletter_digest_subject || "");
  setValue(formNode, "newsletter_digest_intro", settings.newsletter_digest_intro || "");
  setValue(formNode, "newsletter_schedule_weekday", settings.newsletter_schedule_weekday ?? 1);
  setValue(formNode, "newsletter_schedule_hour_utc", settings.newsletter_schedule_hour_utc ?? 9);
}

function renderStats(counts = {}) {
  const { statsNode } = getNodes();
  if (!statsNode) return;
  const values = [counts.total, counts.subscribed, counts.pending, counts.last7];
  statsNode.querySelectorAll("dd").forEach((node, index) => {
    node.textContent = String(values[index] ?? 0);
  });
}

function clearStats(placeholder = "—") {
  const { statsNode } = getNodes();
  if (!statsNode) return;
  statsNode.querySelectorAll("dd").forEach((node) => {
    node.textContent = placeholder;
  });
}

function renderQueue(products = []) {
  const { queueNode } = getNodes();
  if (!queueNode) return;
  if (!products.length) {
    queueNode.innerHTML = '<p class="empty-copy">No products are queued for the next digest.</p>';
    return;
  }

  queueNode.innerHTML = `
    <div class="orders-stack">
      ${products.map((product) => `
        <article class="order-card">
          <div class="order-card-head">
            <div>
              <p class="eyebrow">${Math.round(Number(product.weight_grams || 0))}g / £${formatPrice(product.price_gbp)}</p>
              <h3>${escapeHtml(product.name)}</h3>
            </div>
            <div class="order-card-total">
              <strong>${escapeHtml(product.slug)}</strong>
              <span>${formatDate(product.created_at)}</span>
            </div>
          </div>
          <p>${escapeHtml(product.short_description || "")}</p>
        </article>
      `).join("")}
    </div>
  `;
}

function renderSubscribers(rows = []) {
  const { subscribersNode } = getNodes();
  if (!subscribersNode) return;
  if (!rows.length) {
    subscribersNode.innerHTML = '<p class="empty-copy">No newsletter subscribers yet.</p>';
    return;
  }

  subscribersNode.innerHTML = `
    <table class="catalog-table">
      <thead>
        <tr>
          <th>Email</th>
          <th>Status</th>
          <th>Source</th>
          <th>Created</th>
          <th>Last sent</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map((row) => `
          <tr>
            <td data-label="Email"><strong>${escapeHtml(row.email)}</strong></td>
            <td data-label="Status">${escapeHtml(row.status)}</td>
            <td data-label="Source">${escapeHtml(row.source || "footer")}</td>
            <td data-label="Created">${formatDate(row.created_at)}</td>
            <td data-label="Last sent">${row.last_sent_at ? formatDate(row.last_sent_at) : "—"}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function renderCampaigns(rows = []) {
  const { campaignsNode } = getNodes();
  if (!campaignsNode) return;
  if (!rows.length) {
    campaignsNode.innerHTML = '<p class="empty-copy">No newsletter campaigns yet.</p>';
    return;
  }

  campaignsNode.innerHTML = `
    <table class="catalog-table">
      <thead>
        <tr>
          <th>Subject</th>
          <th>Status</th>
          <th>Products</th>
          <th>Sent</th>
          <th>Audience</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map((row) => `
          <tr>
            <td data-label="Subject">
              <strong>${escapeHtml(row.subject)}</strong>
              ${row.error_message ? `<span>${escapeHtml(row.error_message)}</span>` : ""}
            </td>
            <td data-label="Status">${escapeHtml(row.status)}</td>
            <td data-label="Products">${row.product_count}</td>
            <td data-label="Sent">${row.sent_at ? formatDate(row.sent_at) : "—"}</td>
            <td data-label="Audience">${row.sent_count}/${row.subscriber_count}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function renderPreview(preview = {}) {
  const { previewCopyNode } = getNodes();
  if (!previewCopyNode) return;
  const productCount = Number(preview.products?.length || 0);
  const subscriberCount = Number(preview.subscriberCount || 0);
  const queueCopy = productCount > 0
    ? `${productCount} queued ${productCount === 1 ? "product" : "products"} / ${subscriberCount} subscribed ${subscriberCount === 1 ? "reader" : "readers"}`
    : "No queued products yet. Mark products for newsletter in the product editor.";
  const autoCopy = preview.autoSendEnabled === false ? "Automatic sending is off." : "Automatic sending is on.";
  const cadenceCopy = preview.cadence ? `Scheduled for ${preview.cadence}.` : "";
  const lastSentCopy = preview.lastCampaignSentAt ? `Last send ${formatDate(preview.lastCampaignSentAt)}.` : "";
  previewCopyNode.textContent = [queueCopy, autoCopy, cadenceCopy, lastSentCopy].filter(Boolean).join(" ");
}

async function refreshOverview() {
  const { settingsForm } = getNodes();
  if (!settingsForm) return;

  if (!localStorage.getItem("shkeeno-admin-key")) {
    setStatus("Open Access in admin and save the key first.", "bad");
    clearStats();
    renderQueue([]);
    renderSubscribers([]);
    renderCampaigns([]);
    renderPreview({});
    return;
  }

  setStatus("Loading newsletter data...");
  const [overview, settings, preview] = await Promise.all([
    api("/api/newsletter/overview"),
    api("/api/newsletter/settings"),
    api("/api/newsletter/preview"),
  ]);

  fillSettings(settingsForm, settings.settings || {});
  renderStats(overview.counts || {});
  renderQueue(overview.queuedProducts || []);
  renderSubscribers(overview.recentSubscribers || []);
  renderCampaigns(overview.recentCampaigns || []);
  renderPreview(preview || {});
  setStatus("Newsletter data loaded.", "good");
}

document.addEventListener("submit", async (event) => {
  const formNode = event.target.closest("[data-newsletter-settings-form]");
  if (!formNode) return;

  event.preventDefault();
  const { settingsSubmitNode } = getNodes();

  try {
    setStatus("Saving newsletter settings...");
    if (settingsSubmitNode) settingsSubmitNode.disabled = true;
    const formData = new FormData(formNode);
    const body = Object.fromEntries(formData.entries());
    body.newsletter_enabled = formNode.elements.namedItem("newsletter_enabled").checked;
    body.newsletter_auto_send_enabled = formNode.elements.namedItem("newsletter_auto_send_enabled").checked;
    body.newsletter_schedule_weekday = Number(body.newsletter_schedule_weekday || 1);
    body.newsletter_schedule_hour_utc = Number(body.newsletter_schedule_hour_utc || 9);
    const data = await api("/api/newsletter/settings", {
      method: "PUT",
      body: JSON.stringify(body),
    });
    fillSettings(formNode, data.settings || body);
    setStatus("Newsletter settings saved.", "good");
    showToast("Newsletter settings saved.");
  } catch (error) {
    setStatus(error.message, "bad");
    showToast(error.message, "bad");
  } finally {
    if (settingsSubmitNode) settingsSubmitNode.disabled = false;
  }
});

document.addEventListener("click", async (event) => {
  const refreshNode = event.target.closest("[data-newsletter-refresh]");
  if (refreshNode) {
    try {
      await refreshOverview();
    } catch (error) {
      setStatus(error.message, "bad");
    }
    return;
  }

  const sendNode = event.target.closest("[data-newsletter-send]");
  if (!sendNode) return;

  try {
    sendNode.disabled = true;
    setStatus("Sending weekly digest...");
    const result = await api("/api/newsletter/send", {
      method: "POST",
      body: JSON.stringify({}),
    });

    if (result.skipped) {
      setStatus(result.reason || "Nothing to send right now.", "neutral");
      showToast(result.reason || "Nothing to send right now.");
      return;
    }

    setStatus(`Digest finished. ${result.sentCount} sent, ${result.failedCount} failed.`, result.failedCount ? "bad" : "good");
    showToast(result.failedCount ? "Digest sent with some failures." : "Weekly digest sent.");
    await refreshOverview();
  } catch (error) {
    setStatus(error.message, "bad");
    showToast(error.message, "bad");
  } finally {
    sendNode.disabled = false;
  }
});

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]
  ));
}

function formatPrice(pence) {
  return (Number(pence || 0) / 100).toFixed(2);
}

function formatDate(value) {
  try {
    return new Date(value).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return "—";
  }
}

document.addEventListener("astro:page-load", () => {
  if (document.querySelector("[data-newsletter-settings-form]")) {
    refreshOverview().catch((error) => setStatus(error.message, "bad"));
  }
});

if (document.querySelector("[data-newsletter-settings-form]")) {
  refreshOverview().catch((error) => setStatus(error.message, "bad"));
}

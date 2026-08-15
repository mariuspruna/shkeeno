const messageState = {
  messages: [],
  selectedId: null,
  filter: "all",
};

function setStatus(message, tone = "neutral") {
  const statusNode = document.querySelector("[data-messages-status]");
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

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
  });
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function statusLabel(status) {
  return String(status || "new").replace("_", " ");
}

function snippet(value, max = 120) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function renderMessageList() {
  const listNode = document.querySelector("[data-message-list]");
  if (!listNode) return;

  const messages = messageState.messages;

  if (!messages.length) {
    listNode.innerHTML = localStorage.getItem("shkeeno-admin-key")
      ? '<p class="empty-copy">No contact messages yet.</p>'
      : '<p class="empty-copy">Save the admin key in Access, then return here.</p>';
    return;
  }

  listNode.innerHTML = messages.map((message) => `
    <button
      type="button"
      class="message-list-item${message.id === messageState.selectedId ? " is-active" : ""}"
      data-message-id="${escapeAttribute(message.id)}"
    >
      <span class="message-list-meta">
        <span>${escapeHtml(statusLabel(message.status))}</span>
        <time datetime="${escapeAttribute(message.created_at)}">${escapeHtml(formatDate(message.created_at))}</time>
      </span>
      <strong>${escapeHtml(message.reason || "Contact message")}</strong>
      <span>${escapeHtml(message.name)} · ${escapeHtml(message.email)}</span>
      <p>${escapeHtml(snippet(message.message))}</p>
    </button>
  `).join("");
}

function renderReplies(replies) {
  if (!replies?.length) return '<p class="empty-copy">No replies sent yet.</p>';

  return `
    <div class="message-replies">
      ${replies.map((reply) => `
        <article class="message-reply-card">
          <p class="eyebrow">${escapeHtml(reply.status)} / ${escapeHtml(formatDate(reply.sent_at || reply.created_at))}</p>
          <p>${escapeHtml(reply.body).replace(/\n/g, "<br />")}</p>
        </article>
      `).join("")}
    </div>
  `;
}

function renderDetail(message, replies) {
  const detailNode = document.querySelector("[data-message-detail]");
  if (!detailNode) return;

  detailNode.innerHTML = `
    <article class="message-detail">
      <div class="message-detail-head">
        <div>
          <p class="eyebrow">${escapeHtml(statusLabel(message.status))} / ${escapeHtml(formatDate(message.created_at))}</p>
          <h3>${escapeHtml(message.reason || "Contact message")}</h3>
          <p>${escapeHtml(message.name)} · <a href="mailto:${escapeAttribute(message.email)}">${escapeHtml(message.email)}</a></p>
          ${message.order_ref ? `<p><strong>Order reference:</strong> ${escapeHtml(message.order_ref)}</p>` : ""}
        </div>
        <div class="admin-actions message-detail-actions">
          ${message.status !== "archived"
            ? `<button type="button" class="back-link" data-message-status="archived">Archive</button>`
            : `<button type="button" class="back-link" data-message-status="read">Move to inbox</button>`}
        </div>
      </div>

      <div class="message-body-box">
        ${escapeHtml(message.message).replace(/\n/g, "<br />")}
      </div>

      <section class="message-thread" aria-label="Sent replies">
        <h4>Replies</h4>
        ${renderReplies(replies)}
      </section>

      <form class="message-reply-form" data-message-reply-form data-message-id="${escapeAttribute(message.id)}">
        <label class="setting-row wide-card">
          <span>Reply as Shkeeno</span>
          <textarea name="body" rows="8" placeholder="Write the reply here. It will be sent from Shkeeno."></textarea>
        </label>
        <div class="admin-actions">
          <button type="submit" class="reset-button">Send reply</button>
        </div>
      </form>
    </article>
  `;
}

async function loadMessages() {
  if (!localStorage.getItem("shkeeno-admin-key")) {
    messageState.messages = [];
    renderMessageList();
    setStatus("Open Access in admin and save the key first.", "bad");
    return;
  }

  setStatus("Loading messages...");
  const data = await api(`/api/messages?status=${encodeURIComponent(messageState.filter)}`);
  messageState.messages = data.messages || [];

  if (!messageState.selectedId && messageState.messages.length) {
    messageState.selectedId = messageState.messages[0].id;
  }

  renderMessageList();
  setStatus("Messages loaded.", "good");

  if (messageState.selectedId) {
    await loadMessageDetail(messageState.selectedId);
  }
}

async function loadMessageDetail(id) {
  messageState.selectedId = id;
  renderMessageList();

  const data = await api(`/api/messages/${encodeURIComponent(id)}`);
  renderDetail(data.message, data.replies || []);

  if (data.message?.status === "new") {
    await updateMessageStatus(id, "read", false);
  }
}

async function updateMessageStatus(id, status, shouldReload = true) {
  await api(`/api/messages/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });

  if (shouldReload) {
    showToast(status === "archived" ? "Message archived." : "Message moved to inbox.");
    messageState.selectedId = id;
    await loadMessages();
  }
}

async function sendReply(form) {
  const submitButton = form.querySelector('button[type="submit"]');
  const body = form.elements.namedItem("body")?.value || "";
  if (submitButton) submitButton.disabled = true;
  setStatus("Sending reply...");

  try {
    await api(`/api/messages/${encodeURIComponent(form.dataset.messageId)}/reply`, {
      method: "POST",
      body: JSON.stringify({ body }),
    });
    showToast("Reply sent from Shkeeno.");
    setStatus("Reply sent.", "good");
    form.reset();
    await loadMessages();
  } finally {
    if (submitButton) submitButton.disabled = false;
  }
}

function initMessagesAdmin() {
  if (!document.querySelector("[data-message-list]")) return;
  const filterNode = document.querySelector("[data-message-filter]");
  if (filterNode) filterNode.value = messageState.filter;

  loadMessages().catch((error) => {
    messageState.messages = [];
    renderMessageList();
    setStatus(error.message, "bad");
  });
}

initMessagesAdmin();
document.addEventListener("astro:page-load", initMessagesAdmin);

document.addEventListener("change", (event) => {
  const filterNode = event.target.closest("[data-message-filter]");
  if (!filterNode) return;
  messageState.filter = filterNode.value;
  messageState.selectedId = null;
  loadMessages().catch((error) => setStatus(error.message, "bad"));
});

document.addEventListener("click", (event) => {
  const messageButton = event.target.closest("[data-message-id]");
  if (messageButton) {
    loadMessageDetail(messageButton.dataset.messageId).catch((error) => setStatus(error.message, "bad"));
    return;
  }

  const statusButton = event.target.closest("[data-message-status]");
  if (statusButton && messageState.selectedId) {
    updateMessageStatus(messageState.selectedId, statusButton.dataset.messageStatus).catch((error) => {
      setStatus(error.message, "bad");
      showToast(error.message, "bad");
    });
  }
});

document.addEventListener("submit", (event) => {
  const form = event.target.closest("[data-message-reply-form]");
  if (!form) return;
  event.preventDefault();
  sendReply(form).catch((error) => {
    setStatus(error.message, "bad");
    showToast(error.message, "bad");
  });
});

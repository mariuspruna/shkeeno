import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const shell = document.querySelector("[data-account-page]");
const ACCOUNT_KEY = "shkeeno-account-email";
const SESSION_EVENT = "shkeeno-account-session";

if (shell) {
  const supabaseUrl = shell.dataset.supabaseUrl;
  const supabaseKey = shell.dataset.supabaseKey;
  const form = document.querySelector("[data-account-form]");
  const status = document.querySelector("[data-account-status]");
  const ordersNode = document.querySelector("[data-account-orders]");
  const copyNode = document.querySelector("[data-account-copy]");
  const signoutButton = document.querySelector("[data-account-signout]");
  const statusRow = document.querySelector("[data-account-status-row]");
  const submitButton = document.querySelector("[data-account-submit]");
  const sessionPanel = document.querySelector("[data-account-session]");
  const emailNode = document.querySelector("[data-account-session] [data-account-email]");
  const avatarNode = document.querySelector("[data-account-avatar]");
  const emailInput = form?.querySelector('input[name="email"]');
  const accessTitle = document.querySelector("[data-account-access-title]");
  const sessionNote = document.querySelector("[data-account-session-note]");
  const accountCard = document.querySelector("[data-account-card]");
  const params = new URLSearchParams(window.location.search);
  const seededEmail = params.get("email") || "";

  const supabase = createClient(supabaseUrl, supabaseKey);

  if (emailInput && seededEmail) emailInput.value = seededEmail;

  function setStatus(message, tone = "neutral") {
    if (!status) return;
    status.hidden = !message;
    status.textContent = message || "";
    status.dataset.tone = tone;
  }

  function setAccountChrome(cleanEmail = "") {
    const signedIn = Boolean(cleanEmail);

    if (accessTitle) accessTitle.textContent = signedIn ? "Your account" : "Magic link";
    if (sessionNote) sessionNote.hidden = !signedIn;
    if (accountCard) accountCard.dataset.accountSignedIn = signedIn ? "true" : "false";
  }

  function setAccountIdentity(email = "") {
    const cleanEmail = String(email || "").trim();
    const initial = cleanEmail ? cleanEmail[0].toUpperCase() : "4";

    if (emailNode) emailNode.textContent = cleanEmail || "Signed out";
    if (avatarNode) avatarNode.textContent = initial;
    if (sessionPanel) sessionPanel.hidden = !cleanEmail;
    if (form) form.hidden = Boolean(cleanEmail);
    if (signoutButton) signoutButton.hidden = !cleanEmail;
    if (statusRow) {
      const showRow = !cleanEmail ? false : !signoutButton?.hidden;
      statusRow.hidden = !showRow;
    }
    setAccountChrome(cleanEmail);
    if (cleanEmail) {
      localStorage.setItem(ACCOUNT_KEY, cleanEmail);
    } else {
      localStorage.removeItem(ACCOUNT_KEY);
    }

    window.dispatchEvent(new CustomEvent(SESSION_EVENT, {
      detail: { email: cleanEmail },
    }));
  }

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

  function renderOrders(email, orders) {
    if (!ordersNode) return;
    if (!orders.length) {
      ordersNode.innerHTML = `<p class="empty-copy">No orders found yet. Make sure you used the same email as checkout.</p>`;
      if (copyNode) {
        copyNode.textContent = "No paid orders are tied to this email yet.";
      }
      return;
    }

    if (copyNode) {
      copyNode.textContent = "Paid orders tied to this email.";
    }

    ordersNode.innerHTML = orders.map((order) => `
      <article class="order-card">
        <div class="order-card-head">
          <div>
            <p class="eyebrow">Order ${order.id.slice(0, 8).toUpperCase()}</p>
            <h3>${order.customer_name || order.email || "Shkeeno customer"}</h3>
          </div>
          <div class="order-card-total">
            <strong>${formatMoney(order.total_amount, order.currency)}</strong>
            <span>${new Date(order.created_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</span>
          </div>
        </div>
        <div class="order-card-grid">
          <div>
            <p class="eyebrow">Status</p>
            <p>${order.fulfillment_status}</p>
          </div>
          <div>
            <p class="eyebrow">Shipping</p>
            <p>${order.shipping_name || "-"}</p>
            <p>${formatAddress(order.shipping_address) || "Address unavailable."}</p>
          </div>
          <div>
            <p class="eyebrow">Items</p>
            <ul class="order-items-list">
              ${(order.customer_order_items || []).map((item) => `
                <li><span>${toTitleCase(item.product_name)} x ${item.quantity}</span><strong>${formatMoney(item.line_total_amount, order.currency)}</strong></li>
              `).join("")}
            </ul>
          </div>
        </div>
      </article>
    `).join("");
  }

  async function loadOrders(session) {
    if (!session?.access_token) return;
    setStatus("Loading orders...");
    setAccountChrome(session.user?.email || "");

    const response = await fetch("/api/account/orders", {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Could not load orders.");

    setAccountIdentity(data.email || session.user?.email || "");
    renderOrders(data.email, data.orders || []);
    setStatus("");
  }

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = emailInput?.value?.trim();
    if (!email) return;

    setStatus("Sending magic link...");
    if (submitButton) submitButton.disabled = true;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/account`,
      },
    });

    if (error) {
      setStatus(error.message, "bad");
      if (submitButton) submitButton.disabled = false;
      return;
    }

    setStatus(`Magic link sent to ${email}.`, "good");
    if (submitButton) submitButton.disabled = false;
  });

  signoutButton?.addEventListener("click", async () => {
    await supabase.auth.signOut();
    setAccountIdentity("");
    ordersNode.innerHTML = "";
    if (emailInput) emailInput.value = seededEmail || "";
    if (copyNode) {
      copyNode.textContent = "Sign in with the checkout email to see your paid orders, shipping address, and item summaries.";
    }
    setStatus("");
  });

  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === "SIGNED_IN" && session) {
      try {
        await loadOrders(session);
      } catch (error) {
        setStatus(error.message, "bad");
      }
    }
  });

  const { data } = await supabase.auth.getSession();
  if (data.session) {
    try {
      await loadOrders(data.session);
    } catch (error) {
      setStatus(error.message, "bad");
    }
  } else {
    setAccountIdentity("");
  }
}

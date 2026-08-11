import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ACCOUNT_KEY = "shkeeno-account-email";
const SESSION_EVENT = "shkeeno-account-session";

function renderHeaderAccount(email = "") {
  const accountLinks = document.querySelectorAll('a[href="/account"]');
  if (!accountLinks.length) return;

  const cleanEmail = String(email || "").trim();
  const initial = cleanEmail.charAt(0).toUpperCase();

  accountLinks.forEach((accountLink) => {
    const badge = accountLink.querySelector("[data-account-badge]");

    accountLink.classList.toggle("is-signed-in", Boolean(cleanEmail));

    if (!cleanEmail) {
      accountLink.removeAttribute("data-account-email");
      if (badge) {
        badge.textContent = "";
        badge.dataset.empty = "true";
      }
      return;
    }

    accountLink.dataset.accountEmail = cleanEmail;
    if (badge) {
      badge.textContent = initial;
      badge.dataset.empty = "false";
    }
  });
}

async function syncHeaderAccountFromSession() {
  const supabaseUrl = document.body?.dataset.supabaseUrl;
  const supabaseKey = document.body?.dataset.supabaseKey;
  if (!supabaseUrl || !supabaseKey) {
    renderHeaderAccount("");
    return;
  }

  const supabase = window.__49gHeaderSupabase
    || (window.__49gHeaderSupabase = createClient(supabaseUrl, supabaseKey));

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const email = session?.user?.email || "";
  if (email) {
    localStorage.setItem(ACCOUNT_KEY, email);
  } else {
    localStorage.removeItem(ACCOUNT_KEY);
  }
  renderHeaderAccount(email);
}

if (!window.__49gHeaderAccountInit) {
  window.__49gHeaderAccountInit = true;

  window.addEventListener("storage", (event) => {
    if (event.key === ACCOUNT_KEY) syncHeaderAccountFromSession();
  });

  window.addEventListener(SESSION_EVENT, (event) => {
    renderHeaderAccount(event.detail?.email || "");
  });

  document.addEventListener("astro:page-load", syncHeaderAccountFromSession);

  const supabaseUrl = document.body?.dataset.supabaseUrl;
  const supabaseKey = document.body?.dataset.supabaseKey;
  if (supabaseUrl && supabaseKey) {
    const supabase = window.__49gHeaderSupabase
      || (window.__49gHeaderSupabase = createClient(supabaseUrl, supabaseKey));
    supabase.auth.onAuthStateChange((_event, session) => {
      const email = session?.user?.email || "";
      if (email) {
        localStorage.setItem(ACCOUNT_KEY, email);
      } else {
        localStorage.removeItem(ACCOUNT_KEY);
      }
      renderHeaderAccount(email);
    });
  }
}

syncHeaderAccountFromSession();

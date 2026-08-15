const SESSION_KEY = "shkeeno_ntfy_visit_pinged";
const ACCOUNT_KEY = "shkeeno-account-email";
const PING_URL = "/api/ping";

const BOT_UA_RE =
  /\b(bot|crawl(?:er|ing)?|spider|slurp|googlebot|bingbot|applebot|yandexbot|duckduckbot|facebookexternalhit|facebot|twitterbot|linkedinbot|slackbot|discordbot|telegrambot|whatsapp|preview|unfurl|monitor|headless|lighthouse|chrome-lighthouse|pagespeed|gtmetrix|pingdom|uptime)\b/i;

function getSupabaseAccessToken() {
  try {
    for (const key of Object.keys(localStorage)) {
      if (!key.startsWith("sb-") || !key.endsWith("-auth-token")) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;

      const parsed = JSON.parse(raw);
      const token =
        parsed?.access_token ||
        parsed?.currentSession?.access_token ||
        parsed?.session?.access_token ||
        parsed?.data?.session?.access_token ||
        "";

      if (token) return String(token);
    }
  } catch {
    return "";
  }

  return "";
}

function getReferrerHost() {
  try {
    if (!document.referrer) return "";
    const url = new URL(document.referrer);
    if (url.origin === window.location.origin) return "";
    return url.hostname;
  } catch {
    return "";
  }
}

function shouldSkipPing() {
  if (typeof window === "undefined") return true;

  const host = window.location.hostname;
  const path = window.location.pathname || "/";

  if (host === "localhost" || host === "127.0.0.1") return true;
  if (path.startsWith("/admin")) return true;
  if (path.startsWith("/api")) return true;
  if (sessionStorage.getItem(SESSION_KEY)) return true;
  if (document.visibilityState !== "visible") return true;
  if (BOT_UA_RE.test(navigator.userAgent)) return true;

  return false;
}

function fireVisitPing() {
  if (shouldSkipPing()) return;

  sessionStorage.setItem(SESSION_KEY, "1");

  const accountEmail = localStorage.getItem(ACCOUNT_KEY) || "";
  const accessToken = getSupabaseAccessToken();
  const headers = {
    "Content-Type": "application/json",
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  void fetch(PING_URL, {
    method: "POST",
    headers,
    credentials: "same-origin",
    keepalive: true,
    body: JSON.stringify({
      path: window.location.pathname || "/",
      referrer: getReferrerHost() || undefined,
      accountEmail: accountEmail || undefined,
    }),
  }).catch(() => {});
}

function scheduleVisitPing() {
  if (shouldSkipPing()) return;
  window.setTimeout(fireVisitPing, 1500);
}

document.addEventListener("astro:page-load", scheduleVisitPing);
scheduleVisitPing();

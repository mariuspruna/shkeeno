import { json, supabaseAuthUser, supabaseFetch } from "./catalog/_shared.js";

const DEFAULT_NTFY_URL = "https://ntfy.sh/shkeeno";
const DEDUP_WINDOW_MS = 60 * 60 * 1000;

function getClientIp(request) {
  const cfConnectingIp = request.headers.get("cf-connecting-ip");
  if (cfConnectingIp) return cfConnectingIp.trim();

  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();

  const xri = request.headers.get("x-real-ip");
  if (xri) return xri.trim();

  return "unknown";
}

function getGeo(request) {
  const country = request.headers.get("cf-ipcountry") || request.cf?.country || "";
  const region = request.cf?.region || request.cf?.regionCode || "";
  const city = request.cf?.city || "";

  return {
    country: String(country || "").trim(),
    region: String(region || "").trim(),
    city: String(city || "").trim(),
  };
}

function readSkipEmails(env) {
  return new Set(
    String(env.NTFY_SKIP_EMAILS || "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );
}

function readNtfyUrl(env) {
  return String(env.NTFY_TOPIC_URL || DEFAULT_NTFY_URL).trim() || DEFAULT_NTFY_URL;
}

function pathForClick(path) {
  const safePath = String(path || "/").startsWith("/") ? String(path || "/") : `/${String(path || "")}`;
  return safePath.slice(0, 500);
}

async function hasRecentPing(env, ip) {
  const cutoff = new Date(Date.now() - DEDUP_WINDOW_MS).toISOString();
  const query = new URLSearchParams({
    select: "id",
    ip: `eq.${ip}`,
    pinged_at: `gte.${cutoff}`,
    order: "pinged_at.desc",
    limit: "1",
  });

  const response = await supabaseFetch(env, `/ping_log?${query.toString()}`, {
    headers: {
      prefer: "count=none",
    },
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const rows = await response.json();
  return Array.isArray(rows) && rows.length > 0;
}

async function insertPingLog(env, payload) {
  const response = await supabaseFetch(env, "/ping_log", {
    method: "POST",
    headers: {
      prefer: "return=minimal",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }
}

async function resolveVisitorEmail(env, request, fallbackEmail) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

  if (!token) return fallbackEmail || "";

  try {
    const user = await supabaseAuthUser(env, token);
    return String(user?.email || fallbackEmail || "").trim();
  } catch {
    return String(fallbackEmail || "").trim();
  }
}

export async function onRequestPost({ request, env }) {
  let body = {};

  try {
    body = await request.json();
  } catch {
    return json({ error: "Bad body." }, 400);
  }

  const path = pathForClick(body?.path || "/");
  const referrer = String(body?.referrer || "").trim().slice(0, 200);
  const fallbackEmail = String(body?.accountEmail || "").trim().toLowerCase();
  const ip = getClientIp(request);
  const skipEmails = readSkipEmails(env);
  const siteUrl = String(env.PUBLIC_SITE_URL || env.PUBLIC_SITE_DOMAIN || "https://shkeeno.com").replace(/\/+$/, "");

  if (ip === "unknown" && !request.headers.get("cf-ipcountry") && !request.cf) {
    return json({ ok: true, skipped: "local" }, 202);
  }

  const email = await resolveVisitorEmail(env, request, fallbackEmail);
  if (email && skipEmails.has(email.toLowerCase())) {
    return json({ ok: true, skipped: "admin" }, 202);
  }

  try {
    if (await hasRecentPing(env, ip)) {
      return json({ ok: true, skipped: "recent" }, 202);
    }
  } catch {
    // Better to over-ping than miss a visit when dedupe storage has a wobble.
  }

  const geo = getGeo(request);

  void insertPingLog(env, {
    ip,
    path,
    country_code: geo.country || null,
    region: geo.region || null,
    city: geo.city || null,
    visitor_email: email || null,
  }).catch(() => {});

  const identity = email || "Someone";
  const refSuffix = referrer ? `(via ${referrer})` : "(direct)";
  const geoParts = [geo.country, geo.region, geo.city].filter(Boolean);
  const geoSuffix = geoParts.length ? ` · ${geoParts.join(" · ")}` : "";
  const messageBody = `${identity} opened ${path} ${refSuffix}${geoSuffix}`;

  void fetch(readNtfyUrl(env), {
    method: "POST",
    headers: {
      Title: "Shkeeno visit",
      Tags: "eyes,shopping_bags",
      Priority: "default",
      Click: `${siteUrl}${path}`,
    },
    body: messageBody,
  }).catch(() => {});

  return json({ ok: true }, 202);
}

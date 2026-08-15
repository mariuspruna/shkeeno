const DEFAULT_NTFY_URL = "https://ntfy.sh/shkeeno";

export function getSiteUrl(env) {
  return String(env.PUBLIC_SITE_URL || env.PUBLIC_SITE_DOMAIN || "https://shkeeno.com").replace(/\/+$/, "");
}

export function getRequestGeo(request) {
  const country = request.headers.get("cf-ipcountry") || request.cf?.country || "";
  const region = request.cf?.region || request.cf?.regionCode || "";
  const city = request.cf?.city || "";

  return {
    country: String(country || "").trim(),
    region: String(region || "").trim(),
    city: String(city || "").trim(),
  };
}

export function formatGeo(geo = {}) {
  return [geo.country, geo.city || geo.region].filter(Boolean).join(" · ");
}

export function readNtfyUrl(env) {
  return String(env.NTFY_TOPIC_URL || DEFAULT_NTFY_URL).trim() || DEFAULT_NTFY_URL;
}

export async function notifyNtfy(env, options = {}) {
  const url = readNtfyUrl(env);
  if (!url || env.NTFY_DISABLED === "true") {
    return { skipped: true };
  }

  const headers = {};
  if (options.title) headers.Title = String(options.title);
  if (options.tags) headers.Tags = Array.isArray(options.tags) ? options.tags.join(",") : String(options.tags);
  if (options.priority) headers.Priority = String(options.priority);
  if (options.click) headers.Click = String(options.click);

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: String(options.body || ""),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.text();
}

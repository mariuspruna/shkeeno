import { getCommerceSettings } from "../catalog/_shared.js";

function escapeXml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[char]
  ));
}

function normalizeSvg(svg) {
  const source = String(svg || "").trim();
  if (!source.includes("<svg")) return "";
  if (source.includes("xmlns=")) return source;
  return source.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
}

function fallbackLogo(wordmark) {
  const label = escapeXml(wordmark || "SHKEENO");
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="720" height="180" viewBox="0 0 720 180" role="img" aria-label="${label}">
  <rect width="720" height="180" fill="#f3f0e8"/>
  <text x="0" y="132" fill="#202020" font-family="Arial Black, Arial, sans-serif" font-size="120" font-weight="900">${label}</text>
</svg>`;
}

export async function onRequestGet({ env }) {
  try {
    const settings = await getCommerceSettings(env);
    const svg = normalizeSvg(settings?.brand_svg);
    const body = svg || fallbackLogo(settings?.brand_wordmark || "SHKEENO");

    return new Response(body, {
      headers: {
        "content-type": "image/svg+xml; charset=utf-8",
        "cache-control": "public, max-age=300",
      },
    });
  } catch {
    return new Response(fallbackLogo("SHKEENO"), {
      headers: {
        "content-type": "image/svg+xml; charset=utf-8",
        "cache-control": "public, max-age=300",
      },
    });
  }
}

import { json, readJson, requireAdmin } from "./_shared.js";

export async function onRequestPost({ request, env }) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;

  const { url } = await readJson(request);

  if (!url || !/^https?:\/\//i.test(url)) {
    return json({ error: "Paste a valid http(s) product URL." }, 400);
  }

  const response = await fetch(url, {
    headers: {
      "user-agent": "Shkeeno-catalog-preview/1.0",
      accept: "text/html,application/xhtml+xml",
    },
  });

  if (!response.ok) {
    return json({ error: `Could not fetch page. HTTP ${response.status}.` }, 422);
  }

  const html = await response.text();
  const title = pickMeta(html, "og:title") || pickTitle(html);
  const description = pickMeta(html, "og:description") || pickMeta(html, "description");
  const image = pickMeta(html, "og:image") || pickImage(html);
  const siteName = pickMeta(html, "og:site_name");
  const productBrand = pickProductBrand(html, title, siteName);
  const price = pickPrice(html);
  const weight = pickWeight(html);

  return json({
    source_url: url,
    title: clean(title),
    brand: clean(productBrand),
    description: clean(description),
    price_gbp: price,
    weight_grams: weight,
    images: image ? [new URL(image, url).toString()] : [],
  });
}

function pickMeta(html, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const propertyPattern = new RegExp(
    `<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`,
    "i",
  );
  const contentFirstPattern = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["'][^>]*>`,
    "i",
  );
  return html.match(propertyPattern)?.[1] || html.match(contentFirstPattern)?.[1] || "";
}

function pickTitle(html) {
  return html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || "";
}

function pickImage(html) {
  return html.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i)?.[1] || "";
}

function clean(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function pickProductBrand(html, title, fallbackSiteName) {
  const jsonLdBrand = pickJsonLdBrand(html);
  if (jsonLdBrand) return jsonLdBrand;

  const metaBrand = pickMeta(html, "product:brand")
    || pickMeta(html, "brand")
    || pickMeta(html, "og:brand");
  if (metaBrand) return metaBrand;

  const cleanTitle = clean(title);
  const siteName = clean(fallbackSiteName);

  if (cleanTitle) {
    const dashSplit = cleanTitle.split(/\s+[|\-–—]\s+/).map(clean).filter(Boolean);
    if (dashSplit.length > 1) {
      const candidate = dashSplit.find((part) => siteName && part !== siteName && !part.toLowerCase().includes(siteName.toLowerCase()));
      if (candidate) return candidate;
    }

    const bySplit = cleanTitle.match(/^(.+?)\s+by\s+(.+)$/i);
    if (bySplit?.[2]) return bySplit[2];
  }

  return siteName;
}

function pickJsonLdBrand(html) {
  const scriptMatches = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi) || [];

  for (const script of scriptMatches) {
    const raw = script
      .replace(/^<script[^>]*>/i, "")
      .replace(/<\/script>$/i, "")
      .trim();

    try {
      const parsed = JSON.parse(raw);
      const brand = findBrandInJsonLd(parsed);
      if (brand) return brand;
    } catch {
      continue;
    }
  }

  return "";
}

function findBrandInJsonLd(value) {
  if (!value) return "";
  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = findBrandInJsonLd(entry);
      if (found) return found;
    }
    return "";
  }

  if (typeof value !== "object") return "";

  if (value["@type"] === "Product" || value["@type"] === "ProductGroup") {
    const brand = value.brand;
    if (typeof brand === "string") return brand;
    if (brand && typeof brand === "object" && typeof brand.name === "string") return brand.name;
  }

  for (const nested of Object.values(value)) {
    const found = findBrandInJsonLd(nested);
    if (found) return found;
  }

  return "";
}

function pickPrice(html) {
  const candidates = [
    pickMeta(html, "product:price:amount"),
    pickMeta(html, "og:price:amount"),
    html.match(/"price"\s*:\s*"(\d+(?:\.\d{1,2})?)"/i)?.[1],
    html.match(/(?:£|GBP)\s?(\d{1,4}(?:\.\d{1,2})?)/i)?.[1],
  ].filter(Boolean);

  for (const candidate of candidates) {
    const value = Number.parseFloat(String(candidate).replace(/,/g, ""));
    if (Number.isFinite(value) && value >= 0) {
      return value.toFixed(2);
    }
  }

  return "";
}

function pickWeight(html) {
  const text = clean(html.replace(/<[^>]+>/g, " "));
  const match = text.match(/(\d+(?:\.\d+)?)\s*g\b/i);
  if (!match) return "";

  const grams = Math.round(Number.parseFloat(match[1]));
  if (!Number.isFinite(grams) || grams <= 0 || grams > 49) return "";
  return String(grams);
}

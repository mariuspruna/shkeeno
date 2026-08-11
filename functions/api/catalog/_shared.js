const CATALOG_SELECT = [
  "id",
  "slug",
  "name",
  "brand",
  "origin_country",
  "short_description",
  "editorial_description",
  "price_gbp",
  "compare_at_price_gbp",
  "weight_grams",
  "category",
  "tags",
  "materials",
  "supplier_url",
  "stock_quantity",
  "low_stock_threshold",
  "badge",
  "is_published",
  "is_featured",
  "include_in_newsletter",
  "newsletter_promoted_at",
  "created_at",
  "updated_at",
  "product_images(id,url,alt,sort_order)",
].join(",");

const CATEGORY_SELECT = [
  "slug",
  "name",
  "description",
  "sort_order",
  "is_active",
  "created_at",
  "updated_at",
].join(",");

const TAG_SELECT = [
  "slug",
  "name",
  "description",
  "sort_order",
  "is_active",
  "created_at",
  "updated_at",
].join(",");

const COMMERCE_SETTINGS_SELECT = [
  "id",
  "shop_name",
  "support_email",
  "brand_name",
  "brand_wordmark",
  "brand_domain",
  "brand_svg",
  "brand_display_font",
  "brand_display_letter_spacing",
  "brand_body_font",
  "allow_promotion_codes",
  "require_phone",
  "collect_billing_address",
  "allowed_countries",
  "standard_rate_name",
  "standard_rate_amount",
  "standard_min_business_days",
  "standard_max_business_days",
  "express_enabled",
  "express_rate_name",
  "express_rate_amount",
  "express_min_business_days",
  "express_max_business_days",
  "shipping_rate_standard_id",
  "shipping_rate_express_id",
  "newsletter_enabled",
  "newsletter_sender_name",
  "newsletter_reply_to_email",
  "newsletter_confirm_subject",
  "newsletter_digest_subject",
  "newsletter_digest_intro",
  "newsletter_auto_send_enabled",
  "newsletter_schedule_weekday",
  "newsletter_schedule_hour_utc",
  "newsletter_last_campaign_sent_at",
  "updated_at",
].join(",");

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
};

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: jsonHeaders,
  });
}

export function requireAdmin(request, env) {
  const configuredKey = env.ADMIN_API_KEY;

  if (!configuredKey) {
    return json({ error: "Missing ADMIN_API_KEY environment variable." }, 500);
  }

  const providedKey = request.headers.get("x-admin-key");

  if (!providedKey || providedKey !== configuredKey) {
    return json({ error: "Admin key required." }, 401);
  }

  return null;
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export function getSupabaseConfig(env) {
  const url = env.PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Missing Supabase admin environment variables.");
  }

  return { url, serviceKey };
}

export async function supabaseFetch(env, path, init = {}) {
  const { url, serviceKey } = getSupabaseConfig(env);
  const headers = new Headers(init.headers || {});
  headers.set("apikey", serviceKey);
  headers.set("authorization", `Bearer ${serviceKey}`);
  headers.set("content-type", "application/json");

  return fetch(`${url}/rest/v1${path}`, {
    ...init,
    headers,
  });
}

export async function supabaseAuthUser(env, accessToken) {
  const { url, serviceKey } = getSupabaseConfig(env);
  const response = await fetch(`${url}/auth/v1/user`, {
    headers: {
      apikey: serviceKey,
      authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error("Could not verify account session.");
  }

  return response.json();
}

export async function supabaseRpc(env, name, payload = {}) {
  const response = await supabaseFetch(env, `/rpc/${name}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
}

export async function listProducts(env) {
  const response = await supabaseFetch(
    env,
    `/products?select=${encodeURIComponent(CATALOG_SELECT)}&order=created_at.desc`,
  );

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
}

export async function listCategories(env, activeOnly = false) {
  const filters = [
    `select=${encodeURIComponent(CATEGORY_SELECT)}`,
    "order=sort_order.asc",
    "order=name.asc",
  ];

  if (activeOnly) filters.push("is_active=eq.true");

  const response = await supabaseFetch(
    env,
    `/catalog_categories?${filters.join("&")}`,
  );

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
}

export async function listTags(env, activeOnly = false) {
  const filters = [
    `select=${encodeURIComponent(TAG_SELECT)}`,
    "order=sort_order.asc",
    "order=name.asc",
  ];

  if (activeOnly) filters.push("is_active=eq.true");

  const response = await supabaseFetch(
    env,
    `/catalog_tags?${filters.join("&")}`,
  );

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
}

export async function getCommerceSettings(env) {
  const response = await supabaseFetch(
    env,
    `/commerce_settings?select=${encodeURIComponent(COMMERCE_SETTINGS_SELECT)}&id=eq.1&limit=1`,
  );

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const rows = await response.json();
  return rows[0] || null;
}

export function sanitizeBrandSettings(input) {
  const name = String(input.name || "").trim() || "Shkeeno";
  const wordmark = String(input.wordmark || "").trim() || "SHKEENO";
  const domain = String(input.domain || "").trim() || "shkeeno.com";
  const svg = input.svg ? String(input.svg).trim() : null;
  const displayFont = String(input.displayFont || "").trim() || "Peace Sans, Arial Black, sans-serif";
  const displayLetterSpacing = Number(input.displayLetterSpacing || 0);
  const bodyFont =
    String(input.bodyFont || "").trim() || "\"Space Grotesk\", Helvetica, Arial, sans-serif";

  if (svg && !svg.includes("<svg")) {
    return { error: "Custom logo must be valid SVG markup." };
  }

  if (!Number.isInteger(displayLetterSpacing) || displayLetterSpacing > 0 || displayLetterSpacing < -30 || displayLetterSpacing % 5 !== 0) {
    return { error: "Display letter spacing must be 0 or a negative value in steps of 5." };
  }

  return {
    settings: {
      id: 1,
      brand_name: name,
      brand_wordmark: wordmark,
      brand_domain: domain,
      brand_svg: svg || null,
      brand_display_font: displayFont,
      brand_display_letter_spacing: displayLetterSpacing,
      brand_body_font: bodyFont,
      updated_at: new Date().toISOString(),
    },
  };
}

export function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function sanitizeProduct(input) {
  const name = String(input.name || "").trim();
  const shortDescription = String(input.short_description || "").trim();
  const weight = Math.round(Number(input.weight_grams || 1));
  const price = Number(input.price_gbp);
  const stock = Number(input.stock_quantity || 0);
  const imageUrls = Array.isArray(input.images)
    ? input.images.map((image) => String(image || "").trim()).filter(Boolean).slice(0, 6)
    : [];

  if (!name) return { error: "Product name is required." };
  if (!shortDescription) return { error: "Short reason is required." };
  if (!Number.isFinite(weight) || weight <= 0 || weight > 49) {
    return { error: "Product metadata could not be saved. Please refresh and try again." };
  }
  if (!Number.isFinite(price) || price < 0) return { error: "Price must be zero or higher." };
  if (!Number.isInteger(stock) || stock < 0) return { error: "Stock must be zero or higher." };
  if (input.is_published && imageUrls.length === 0) {
    return { error: "Published products need at least one image." };
  }

  return {
    product: {
      slug: slugify(input.slug || name),
      name,
      brand: input.brand ? String(input.brand).trim() : null,
      origin_country: input.origin_country ? String(input.origin_country).trim() : null,
      short_description: shortDescription,
      editorial_description: input.editorial_description
        ? String(input.editorial_description).trim()
        : null,
      price_gbp: roundMoney(price),
      compare_at_price_gbp: input.compare_at_price_gbp
        ? roundMoney(Number(input.compare_at_price_gbp))
        : null,
      weight_grams: weight,
      category: String(input.category || "collections").trim().toLowerCase(),
      tags: splitList(input.tags),
      materials: splitList(input.materials),
      supplier_url: input.supplier_url ? String(input.supplier_url).trim() : null,
      stock_quantity: stock,
      low_stock_threshold: Number(input.low_stock_threshold || 3),
      badge: input.badge || null,
      is_published: Boolean(input.is_published),
      is_featured: Boolean(input.is_featured),
      include_in_newsletter: Boolean(input.include_in_newsletter),
      updated_at: new Date().toISOString(),
    },
    imageUrls,
  };
}

export function sanitizeCategory(input) {
  const name = String(input.name || "").trim();
  const slug = slugify(input.slug || name);
  const sortOrder = Number(input.sort_order || 0);

  if (!name) return { error: "Category name is required." };
  if (!slug) return { error: "Category slug is required." };
  if (!Number.isInteger(sortOrder) || sortOrder < 0) {
    return { error: "Sort order must be zero or higher." };
  }

  return {
    category: {
      slug,
      name,
      description: input.description ? String(input.description).trim() : null,
      sort_order: sortOrder,
      is_active: input.is_active !== false,
      updated_at: new Date().toISOString(),
    },
  };
}

export function sanitizeTag(input) {
  const name = String(input.name || "").trim();
  const slug = slugify(input.slug || name);
  const sortOrder = Number(input.sort_order || 0);

  if (!name) return { error: "Tag name is required." };
  if (!slug) return { error: "Tag slug is required." };
  if (!Number.isInteger(sortOrder) || sortOrder < 0) {
    return { error: "Sort order must be zero or higher." };
  }

  return {
    tag: {
      slug,
      name,
      description: input.description ? String(input.description).trim() : null,
      sort_order: sortOrder,
      is_active: input.is_active !== false,
      updated_at: new Date().toISOString(),
    },
  };
}

export function sanitizeCommerceSettings(input) {
  const allowedCountries = Array.isArray(input.allowed_countries)
    ? input.allowed_countries
    : String(input.allowed_countries || "")
      .split(",")
      .map((item) => item.trim().toUpperCase())
      .filter(Boolean);

  const standardRateAmount = Math.round(Number(input.standard_rate_amount || 0));
  const expressRateAmount = Math.round(Number(input.express_rate_amount || 0));
  const standardMin = Number(input.standard_min_business_days || 0);
  const standardMax = Number(input.standard_max_business_days || 0);
  const expressMin = Number(input.express_min_business_days || 0);
  const expressMax = Number(input.express_max_business_days || 0);

  if (!String(input.shop_name || "").trim()) return { error: "Shop name is required." };
  if (allowedCountries.length === 0) return { error: "At least one allowed country is required." };
  if (!Number.isInteger(standardRateAmount) || standardRateAmount < 0) return { error: "Standard shipping amount must be zero or higher." };
  if (!Number.isInteger(expressRateAmount) || expressRateAmount < 0) return { error: "Express shipping amount must be zero or higher." };
  if (!Number.isInteger(standardMin) || !Number.isInteger(standardMax) || standardMin < 0 || standardMax < standardMin) {
    return { error: "Standard delivery estimate is invalid." };
  }
  if (!Number.isInteger(expressMin) || !Number.isInteger(expressMax) || expressMin < 0 || expressMax < expressMin) {
    return { error: "Express delivery estimate is invalid." };
  }

  return {
    settings: {
      id: 1,
      shop_name: String(input.shop_name || "").trim(),
      support_email: input.support_email ? String(input.support_email).trim() : null,
      allow_promotion_codes: input.allow_promotion_codes !== false,
      require_phone: input.require_phone !== false,
      collect_billing_address: input.collect_billing_address !== false,
      allowed_countries: allowedCountries,
      standard_rate_name: String(input.standard_rate_name || "").trim() || "Tracked shipping",
      standard_rate_amount: standardRateAmount,
      standard_min_business_days: standardMin,
      standard_max_business_days: standardMax,
      express_enabled: Boolean(input.express_enabled),
      express_rate_name: String(input.express_rate_name || "").trim() || "Express shipping",
      express_rate_amount: expressRateAmount,
      express_min_business_days: expressMin,
      express_max_business_days: expressMax,
      shipping_rate_standard_id: input.shipping_rate_standard_id ? String(input.shipping_rate_standard_id).trim() : null,
      shipping_rate_express_id: input.shipping_rate_express_id ? String(input.shipping_rate_express_id).trim() : null,
      updated_at: new Date().toISOString(),
    },
  };
}

export function sanitizeNewsletterSettings(input) {
  const weekday = Number(input.newsletter_schedule_weekday ?? 1);
  const hour = Number(input.newsletter_schedule_hour_utc ?? 9);
  const senderName = String(input.newsletter_sender_name || "").trim() || "Shkeeno";
  const confirmSubject = String(input.newsletter_confirm_subject || "").trim() || "Confirm your Shkeeno subscription";
  const digestSubject = String(input.newsletter_digest_subject || "").trim() || "New products designed with intention";
  const digestIntro = String(input.newsletter_digest_intro || "").trim() || "A few new additions designed with intention.";
  const replyTo = input.newsletter_reply_to_email ? String(input.newsletter_reply_to_email).trim() : null;

  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
    return { error: "Newsletter weekday must be between 0 and 6." };
  }

  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    return { error: "Newsletter send hour must be between 0 and 23." };
  }

  return {
    settings: {
      id: 1,
      newsletter_enabled: input.newsletter_enabled !== false,
      newsletter_sender_name: senderName,
      newsletter_reply_to_email: replyTo,
      newsletter_confirm_subject: confirmSubject,
      newsletter_digest_subject: digestSubject,
      newsletter_digest_intro: digestIntro,
      newsletter_auto_send_enabled: input.newsletter_auto_send_enabled !== false,
      newsletter_schedule_weekday: weekday,
      newsletter_schedule_hour_utc: hour,
      updated_at: new Date().toISOString(),
    },
  };
}

function splitList(value) {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function roundMoney(value) {
  return Math.round(Number(value) * 100) / 100;
}

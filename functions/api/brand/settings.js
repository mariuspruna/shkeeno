import {
  getCommerceSettings,
  json,
  readJson,
  requireAdmin,
  sanitizeBrandSettings,
  supabaseFetch,
} from "../catalog/_shared.js";

function pickBrandSettings(settings) {
  return settings ? {
    name: settings.brand_name || "Shkeeno",
    wordmark: settings.brand_wordmark || "SHKEENO",
    domain: settings.brand_domain || "shkeeno.com",
    svg: settings.brand_svg || "",
    displayFont: settings.brand_display_font || "Peace Sans, Arial Black, sans-serif",
    displayLetterSpacing: Number(settings.brand_display_letter_spacing || 0),
    bodyFont: settings.brand_body_font || "\"Space Grotesk\", Helvetica, Arial, sans-serif",
  } : {
    name: "Shkeeno",
    wordmark: "SHKEENO",
    domain: "shkeeno.com",
    svg: "",
    displayFont: "Peace Sans, Arial Black, sans-serif",
    displayLetterSpacing: 0,
    bodyFont: "\"Space Grotesk\", Helvetica, Arial, sans-serif",
  };
}

export async function onRequestGet({ env }) {
  try {
    const settings = await getCommerceSettings(env);
    return json({ settings: pickBrandSettings(settings) });
  } catch {
    return json({ settings: pickBrandSettings(null) });
  }
}

export async function onRequestPut({ request, env }) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;

  try {
    const body = await readJson(request);
    const result = sanitizeBrandSettings(body);

    if (result.error) return json({ error: result.error }, 400);

    const response = await supabaseFetch(env, "/commerce_settings?id=eq.1", {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(result.settings),
    });

    if (!response.ok) return json({ error: await response.text() }, 400);

    const [settings] = await response.json();
    return json({ settings: pickBrandSettings(settings) });
  } catch (error) {
    return json({ error: error.message }, 500);
  }
}

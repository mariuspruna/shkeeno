import { getCommerceSettings, supabaseFetch, sanitizeNewsletterSettings } from "../catalog/_shared.js";
import { json, readJson, requireAdmin } from "./_shared.js";

function pickSettings(settings) {
  return settings ? {
    newsletter_enabled: settings.newsletter_enabled !== false,
    newsletter_sender_name: settings.newsletter_sender_name || settings.brand_name || "Shkeeno",
    newsletter_reply_to_email: settings.newsletter_reply_to_email || settings.support_email || "",
    newsletter_confirm_subject: settings.newsletter_confirm_subject || "Confirm your Shkeeno subscription",
    newsletter_digest_subject: settings.newsletter_digest_subject || "New products designed with intention",
    newsletter_digest_intro: settings.newsletter_digest_intro || "A few new additions designed with intention.",
    newsletter_auto_send_enabled: settings.newsletter_auto_send_enabled !== false,
    newsletter_schedule_weekday: Number(settings.newsletter_schedule_weekday ?? 1),
    newsletter_schedule_hour_utc: Number(settings.newsletter_schedule_hour_utc ?? 9),
    newsletter_last_campaign_sent_at: settings.newsletter_last_campaign_sent_at || null,
  } : null;
}

export async function onRequestGet({ request, env }) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;

  try {
    return json({ settings: pickSettings(await getCommerceSettings(env)) });
  } catch (error) {
    return json({ error: error.message || "Could not load newsletter settings." }, 500);
  }
}

export async function onRequestPut({ request, env }) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;

  try {
    const body = await readJson(request);
    const result = sanitizeNewsletterSettings(body);
    if (result.error) return json({ error: result.error }, 400);

    const response = await supabaseFetch(env, "/commerce_settings?id=eq.1", {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(result.settings),
    });

    if (!response.ok) return json({ error: await response.text() }, 400);

    const [settings] = await response.json();
    return json({ settings: pickSettings(settings) });
  } catch (error) {
    return json({ error: error.message || "Could not save newsletter settings." }, 500);
  }
}

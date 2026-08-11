import {
  getCommerceSettings,
  json,
  readJson,
  requireAdmin,
  sanitizeCommerceSettings,
  supabaseFetch,
} from "../catalog/_shared.js";

export async function onRequestGet({ request, env }) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;

  try {
    return json({ settings: await getCommerceSettings(env) });
  } catch (error) {
    return json({ error: error.message }, 500);
  }
}

export async function onRequestPut({ request, env }) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;

  try {
    const body = await readJson(request);
    const result = sanitizeCommerceSettings(body);

    if (result.error) return json({ error: result.error }, 400);

    const response = await supabaseFetch(env, "/commerce_settings?id=eq.1", {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(result.settings),
    });

    if (!response.ok) return json({ error: await response.text() }, 400);

    const [settings] = await response.json();
    return json({ settings });
  } catch (error) {
    return json({ error: error.message }, 500);
  }
}

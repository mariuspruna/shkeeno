import { json, readJson, requireAdmin, sanitizeCategory, supabaseFetch } from "../_shared.js";

export async function onRequestPut({ request, env, params }) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;

  try {
    const body = await readJson(request);
    const result = sanitizeCategory({ ...body, slug: params.slug });

    if (result.error) return json({ error: result.error }, 400);

    const response = await supabaseFetch(env, `/catalog_categories?slug=eq.${encodeURIComponent(params.slug)}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(result.category),
    });

    if (!response.ok) return json({ error: await response.text() }, 400);

    const [category] = await response.json();
    return json({ category });
  } catch (error) {
    return json({ error: error.message }, 500);
  }
}

export async function onRequestDelete({ request, env, params }) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;

  try {
    const usageResponse = await supabaseFetch(
      env,
      `/products?category=eq.${encodeURIComponent(params.slug)}&select=id&limit=1`,
    );

    if (!usageResponse.ok) return json({ error: await usageResponse.text() }, 400);
    const usage = await usageResponse.json();

    if (usage.length > 0) {
      return json({ error: "This category is still used by products." }, 400);
    }

    const response = await supabaseFetch(env, `/catalog_categories?slug=eq.${encodeURIComponent(params.slug)}`, {
      method: "DELETE",
    });

    if (!response.ok) return json({ error: await response.text() }, 400);

    return json({ ok: true });
  } catch (error) {
    return json({ error: error.message }, 500);
  }
}

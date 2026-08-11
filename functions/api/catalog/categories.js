import { json, listCategories, readJson, requireAdmin, sanitizeCategory, supabaseFetch } from "./_shared.js";

export async function onRequestGet({ request, env }) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;

  try {
    return json({ categories: await listCategories(env) });
  } catch (error) {
    return json({ error: error.message }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;

  try {
    const body = await readJson(request);
    const result = sanitizeCategory(body);

    if (result.error) return json({ error: result.error }, 400);

    const response = await supabaseFetch(env, "/catalog_categories", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(result.category),
    });

    if (!response.ok) return json({ error: await response.text() }, 400);

    const [category] = await response.json();
    return json({ category }, 201);
  } catch (error) {
    return json({ error: error.message }, 500);
  }
}

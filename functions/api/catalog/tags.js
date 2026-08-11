import { json, listTags, readJson, requireAdmin, sanitizeTag, supabaseFetch } from "./_shared.js";

export async function onRequestGet({ request, env }) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;

  try {
    return json({ tags: await listTags(env) });
  } catch (error) {
    return json({ error: error.message }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;

  try {
    const body = await readJson(request);
    const result = sanitizeTag(body);

    if (result.error) return json({ error: result.error }, 400);

    const response = await supabaseFetch(env, "/catalog_tags", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(result.tag),
    });

    if (!response.ok) return json({ error: await response.text() }, 400);

    const [tag] = await response.json();
    return json({ tag }, 201);
  } catch (error) {
    return json({ error: error.message }, 500);
  }
}

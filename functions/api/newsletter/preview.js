import { buildDigestPreview, json, requireAdmin } from "./_shared.js";

export async function onRequestGet({ request, env }) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;

  try {
    return json(await buildDigestPreview(env));
  } catch (error) {
    return json({ error: error.message || "Could not build newsletter preview." }, 500);
  }
}

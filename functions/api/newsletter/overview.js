import { json, newsletterOverview, requireAdmin } from "./_shared.js";

export async function onRequestGet({ request, env }) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;

  try {
    return json(await newsletterOverview(env));
  } catch (error) {
    return json({ error: error.message || "Could not load newsletter overview." }, 500);
  }
}

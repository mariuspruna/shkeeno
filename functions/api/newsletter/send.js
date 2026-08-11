import { json, requireAdmin, sendWeeklyDigest } from "./_shared.js";

export async function onRequestPost({ request, env }) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;

  try {
    const result = await sendWeeklyDigest(env);
    if (!result.ok && !result.skipped) {
      return json({ error: result.reason || "Newsletter send failed." }, 500);
    }

    return json(result);
  } catch (error) {
    return json({ error: error.message || "Newsletter send failed." }, 500);
  }
}

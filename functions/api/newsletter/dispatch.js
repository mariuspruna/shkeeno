import { json, sendWeeklyDigest } from "./_shared.js";

function authorized(request, env) {
  const configuredSecret = String(env.NEWSLETTER_CRON_SECRET || "").trim();
  if (!configuredSecret) {
    throw new Error("Missing NEWSLETTER_CRON_SECRET environment variable.");
  }

  const headerSecret = request.headers.get("x-newsletter-cron-secret") || "";
  const authHeader = request.headers.get("authorization") || "";
  const bearerSecret = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

  return headerSecret === configuredSecret || bearerSecret === configuredSecret;
}

export async function onRequestPost({ request, env }) {
  try {
    if (!authorized(request, env)) {
      return json({ error: "Dispatch secret required." }, 401);
    }

    return json(await sendWeeklyDigest(env, { force: false }));
  } catch (error) {
    return json({ error: error.message || "Newsletter dispatch failed." }, 500);
  }
}

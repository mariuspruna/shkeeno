import { json, readJson, unsubscribeSubscriber } from "./_shared.js";

export async function onRequestPost({ request, env }) {
  try {
    const body = await readJson(request);
    const token = String(body.token || "").trim();

    if (!token) {
      return json({ error: "Missing unsubscribe token." }, 400);
    }

    const subscriber = await unsubscribeSubscriber(env, token);
    return json({
      ok: true,
      alreadyUnsubscribed: Boolean(subscriber.alreadyUnsubscribed),
      email: subscriber.email,
    });
  } catch (error) {
    return json({ error: error.message || "Could not unsubscribe this address." }, 400);
  }
}

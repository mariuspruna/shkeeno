import { confirmSubscriber, json, readJson } from "./_shared.js";
import { notifyNtfy } from "../_ntfy.js";

export async function onRequestPost({ request, env }) {
  try {
    const body = await readJson(request);
    const token = String(body.token || "").trim();

    if (!token) {
      return json({ error: "Missing confirmation token." }, 400);
    }

    const subscriber = await confirmSubscriber(env, token);

    if (!subscriber.alreadyConfirmed) {
      void notifyNtfy(env, {
        title: "Shkeeno newsletter",
        tags: "white_check_mark,email",
        priority: "default",
        body: `✅ Newsletter confirmed: ${subscriber.email}`,
      }).catch(() => {});
    }

    return json({
      ok: true,
      alreadyConfirmed: Boolean(subscriber.alreadyConfirmed),
      email: subscriber.email,
    });
  } catch (error) {
    return json({ error: error.message || "Could not confirm the subscription." }, 400);
  }
}

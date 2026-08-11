import {
  getNewsletterSettings,
  isValidEmail,
  json,
  normalizeEmail,
  readJson,
  sendConfirmationEmail,
  upsertPendingSubscriber,
} from "./_shared.js";

export async function onRequestPost({ request, env }) {
  try {
    const body = await readJson(request);
    const email = String(body.email || "").trim();
    const source = String(body.source || "footer").trim() || "footer";
    const company = String(body.company || "").trim();

    if (company) return json({ ok: true });
    if (!isValidEmail(email)) {
      return json({ error: "Enter a valid email address." }, 400);
    }

    const settings = await getNewsletterSettings(env);
    if (!settings.newsletterEnabled) {
      return json({ error: "Newsletter signups are disabled right now." }, 400);
    }

    const subscriber = await upsertPendingSubscriber(env, {
      email: normalizeEmail(email),
      source,
    });

    if (subscriber.alreadySubscribed) {
      return json({
        ok: true,
        message: "This email is already subscribed.",
        alreadySubscribed: true,
      });
    }

    await sendConfirmationEmail(env, subscriber);

    let message = "Check your inbox to confirm the subscription.";
    if (subscriber.resentConfirmation) {
      message = "You already started subscribing. Check your inbox for the confirmation email.";
    } else if (subscriber.reactivatedSubscription) {
      message = "Check your inbox to confirm the subscription again.";
    }

    return json({
      ok: true,
      message,
      resentConfirmation: Boolean(subscriber.resentConfirmation),
      reactivatedSubscription: Boolean(subscriber.reactivatedSubscription),
    });
  } catch (error) {
    return json({ error: error.message || "Could not start the subscription." }, 500);
  }
}

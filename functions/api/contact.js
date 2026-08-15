import { json, supabaseFetch } from "./catalog/_shared.js";

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]
  ));
}

async function sendEmail(env, payload) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
}

async function createContactMessage(env, payload) {
  const response = await supabaseFetch(env, "/contact_messages", {
    method: "POST",
    headers: {
      prefer: "return=representation",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const rows = await response.json();
  return rows?.[0] || null;
}

async function updateContactMessage(env, id, payload) {
  if (!id) return;
  await supabaseFetch(env, `/contact_messages?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({
      ...payload,
      updated_at: new Date().toISOString(),
    }),
  });
}

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json().catch(() => ({}));
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim();
    const reason = String(body.reason || "").trim();
    const orderRef = String(body.order_ref || "").trim();
    const message = String(body.message || "").trim();
    const company = String(body.company || "").trim();

    if (company) return json({ ok: true });
    if (!name || !email || !reason || !message) {
      return json({ error: "Name, email, reason, and message are required." }, 400);
    }

    if (!env.RESEND_API_KEY || !env.ORDER_FROM_EMAIL || !env.ORDER_SUPPORT_EMAIL) {
      return json({ error: "Contact email is not configured yet." }, 500);
    }

    const contactMessage = await createContactMessage(env, {
      name,
      email,
      normalized_email: email.toLowerCase(),
      reason,
      order_ref: orderRef || null,
      message,
      status: "new",
      source: "contact_form",
    });

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;padding:24px;color:#202020;">
        <p style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;margin:0 0 12px;">Shkeeno / contact</p>
        <h1 style="font-size:28px;line-height:1;margin:0 0 18px;text-transform:uppercase;">${escapeHtml(reason)}</h1>
        <p style="font-size:14px;line-height:1.6;margin:0 0 10px;"><strong>Name</strong> ${escapeHtml(name)}</p>
        <p style="font-size:14px;line-height:1.6;margin:0 0 10px;"><strong>Email</strong> ${escapeHtml(email)}</p>
        ${orderRef ? `<p style="font-size:14px;line-height:1.6;margin:0 0 10px;"><strong>Order reference</strong> ${escapeHtml(orderRef)}</p>` : ""}
        <div style="margin-top:18px;padding-top:18px;border-top:1px solid #ddd;font-size:15px;line-height:1.7;">
          ${escapeHtml(message).replace(/\n/g, "<br />")}
        </div>
      </div>
    `;

    try {
      await sendEmail(env, {
        from: env.ORDER_FROM_EMAIL,
        to: [env.ORDER_SUPPORT_EMAIL],
        reply_to: email,
        subject: `Shkeeno contact: ${reason} — ${name}`,
        html,
      });

      await updateContactMessage(env, contactMessage?.id, {
        inbound_email_sent: true,
        last_error: null,
      });
    } catch (emailError) {
      await updateContactMessage(env, contactMessage?.id, {
        inbound_email_sent: false,
        last_error: emailError.message || "Could not send inbox notification.",
      });
      throw emailError;
    }

    return json({ ok: true });
  } catch (error) {
    return json({ error: error.message || "Could not send message." }, 500);
  }
}

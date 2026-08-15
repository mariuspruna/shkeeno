import { json, readJson, requireAdmin, supabaseFetch } from "../../catalog/_shared.js";

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

async function getMessage(env, id) {
  const response = await supabaseFetch(
    env,
    `/contact_messages?id=eq.${encodeURIComponent(id)}&select=*&limit=1`,
  );

  if (!response.ok) throw new Error(await response.text());
  const rows = await response.json();
  return rows?.[0] || null;
}

async function recordReply(env, payload) {
  const response = await supabaseFetch(env, "/contact_message_replies", {
    method: "POST",
    headers: { prefer: "return=representation" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) throw new Error(await response.text());
  const rows = await response.json();
  return rows?.[0] || null;
}

async function markMessageReplied(env, id) {
  const now = new Date().toISOString();
  await supabaseFetch(env, `/contact_messages?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({
      status: "replied",
      replied_at: now,
      updated_at: now,
      last_error: null,
    }),
  });
}

export async function onRequestPost({ request, env, params }) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;

  try {
    const body = await readJson(request);
    const replyBody = String(body.body || "").trim();

    if (!replyBody) {
      return json({ error: "Write a reply first." }, 400);
    }

    if (!env.RESEND_API_KEY || !env.ORDER_FROM_EMAIL || !env.ORDER_SUPPORT_EMAIL) {
      return json({ error: "Reply email is not configured yet." }, 500);
    }

    const message = await getMessage(env, params.id);
    if (!message) return json({ error: "Message not found." }, 404);

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;padding:24px;color:#202020;">
        <p style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;margin:0 0 12px;">Shkeeno / reply</p>
        <div style="font-size:15px;line-height:1.7;margin:0 0 24px;">
          ${escapeHtml(replyBody).replace(/\n/g, "<br />")}
        </div>
        <div style="border-top:1px solid #ddd;padding-top:16px;color:#666;font-size:13px;line-height:1.6;">
          <p style="margin:0 0 8px;"><strong>Original message</strong></p>
          <p style="margin:0 0 8px;">${escapeHtml(message.reason)} from ${escapeHtml(message.name)}</p>
          <p style="margin:0;">${escapeHtml(message.message).replace(/\n/g, "<br />")}</p>
        </div>
      </div>
    `;

    const resendResult = await sendEmail(env, {
      from: env.ORDER_FROM_EMAIL,
      to: [message.email],
      reply_to: env.ORDER_SUPPORT_EMAIL,
      subject: `Re: Shkeeno contact: ${message.reason}`,
      html,
    });

    const reply = await recordReply(env, {
      message_id: message.id,
      body: replyBody,
      from_email: env.ORDER_FROM_EMAIL,
      to_email: message.email,
      reply_to_email: env.ORDER_SUPPORT_EMAIL,
      resend_email_id: resendResult?.id || null,
      status: "sent",
      error_message: null,
    });

    await markMessageReplied(env, message.id);

    return json({ ok: true, reply });
  } catch (error) {
    return json({ error: error.message || "Could not send reply." }, 500);
  }
}

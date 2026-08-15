import { json, readJson, requireAdmin, supabaseFetch } from "../catalog/_shared.js";

const MESSAGE_SELECT = [
  "id",
  "name",
  "email",
  "normalized_email",
  "reason",
  "order_ref",
  "message",
  "status",
  "source",
  "inbound_email_sent",
  "last_error",
  "replied_at",
  "archived_at",
  "created_at",
  "updated_at",
].join(",");

const REPLY_SELECT = [
  "id",
  "body",
  "from_email",
  "to_email",
  "reply_to_email",
  "resend_email_id",
  "status",
  "error_message",
  "sent_at",
  "created_at",
].join(",");

async function loadMessage(env, id) {
  const response = await supabaseFetch(
    env,
    `/contact_messages?id=eq.${encodeURIComponent(id)}&select=${encodeURIComponent(MESSAGE_SELECT)}&limit=1`,
  );

  if (!response.ok) throw new Error(await response.text());
  const rows = await response.json();
  return rows?.[0] || null;
}

async function loadReplies(env, id) {
  const response = await supabaseFetch(
    env,
    `/contact_message_replies?message_id=eq.${encodeURIComponent(id)}&select=${encodeURIComponent(REPLY_SELECT)}&order=created_at.asc`,
  );

  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export async function onRequestGet({ request, env, params }) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;

  try {
    const message = await loadMessage(env, params.id);
    if (!message) return json({ error: "Message not found." }, 404);
    const replies = await loadReplies(env, params.id);
    return json({ message, replies });
  } catch (error) {
    return json({ error: error.message || "Could not load message." }, 500);
  }
}

export async function onRequestPatch({ request, env, params }) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;

  try {
    const body = await readJson(request);
    const allowedStatuses = new Set(["new", "read", "replied", "archived"]);
    const status = String(body.status || "").trim();

    if (!allowedStatuses.has(status)) {
      return json({ error: "Choose a valid message status." }, 400);
    }

    const payload = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === "archived") {
      payload.archived_at = new Date().toISOString();
    } else {
      payload.archived_at = null;
    }

    const response = await supabaseFetch(env, `/contact_messages?id=eq.${encodeURIComponent(params.id)}`, {
      method: "PATCH",
      headers: { prefer: "return=representation" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error(await response.text());
    const rows = await response.json();
    return json({ message: rows?.[0] || null });
  } catch (error) {
    return json({ error: error.message || "Could not update message." }, 500);
  }
}

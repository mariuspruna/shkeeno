import { json, requireAdmin, supabaseFetch } from "./catalog/_shared.js";

const MESSAGE_SELECT = [
  "id",
  "name",
  "email",
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

export async function onRequestGet({ request, env }) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;

  try {
    const url = new URL(request.url);
    const rawLimit = Number(url.searchParams.get("limit") || 100);
    const limit = Math.max(1, Math.min(rawLimit, 100));
    const status = url.searchParams.get("status") || "all";
    const statusFilter = status && status !== "all"
      ? `&status=eq.${encodeURIComponent(status)}`
      : "";

    const response = await supabaseFetch(
      env,
      `/contact_messages?select=${encodeURIComponent(MESSAGE_SELECT)}${statusFilter}&order=created_at.desc&limit=${limit}`,
    );

    if (!response.ok) {
      throw new Error(await response.text());
    }

    return json({ messages: await response.json() });
  } catch (error) {
    return json({ error: error.message || "Could not load messages." }, 500);
  }
}

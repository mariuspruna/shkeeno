import { json, supabaseFetch } from "../catalog/_shared.js";

const ORDER_SELECT = [
  "id",
  "email",
  "customer_name",
  "payment_status",
  "fulfillment_status",
  "currency",
  "subtotal_amount",
  "shipping_amount",
  "tax_amount",
  "total_amount",
  "shipping_name",
  "shipping_address",
  "created_at",
  "customer_order_items(product_name,quantity,unit_amount,line_total_amount)",
].join(",");

export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get("session_id");

    if (!sessionId) return json({ error: "Missing session_id." }, 400);

    const response = await supabaseFetch(
      env,
      `/customer_orders?select=${encodeURIComponent(ORDER_SELECT)}&stripe_checkout_session_id=eq.${encodeURIComponent(sessionId)}&limit=1`,
    );

    if (!response.ok) return json({ error: await response.text() }, 400);

    const rows = await response.json();
    return json({ order: rows[0] || null });
  } catch (error) {
    return json({ error: error.message }, 500);
  }
}

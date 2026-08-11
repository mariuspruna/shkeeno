import { json, supabaseAuthUser, supabaseFetch } from "../catalog/_shared.js";

const ORDER_SELECT = [
  "id",
  "email",
  "customer_name",
  "payment_status",
  "fulfillment_status",
  "stock_issue",
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
    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

    if (!token) return json({ error: "Missing account session." }, 401);

    const user = await supabaseAuthUser(env, token);
    const email = user?.email;

    if (!email) return json({ error: "Missing account email." }, 400);

    const response = await supabaseFetch(
      env,
      `/customer_orders?select=${encodeURIComponent(ORDER_SELECT)}&email=eq.${encodeURIComponent(email)}&order=created_at.desc&limit=50`,
    );

    if (!response.ok) return json({ error: await response.text() }, 400);

    const orders = await response.json();
    return json({ email, orders });
  } catch (error) {
    return json({ error: error.message }, 500);
  }
}

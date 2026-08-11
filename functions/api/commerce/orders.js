import { sendFulfillmentUpdateEmail } from "../_email.js";
import { json, readJson, requireAdmin, supabaseFetch } from "../catalog/_shared.js";

const ORDER_SELECT = [
  "id",
  "stripe_checkout_session_id",
  "email",
  "customer_name",
  "phone",
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
  "billing_address",
  "shipping_carrier",
  "tracking_number",
  "tracking_url",
  "fulfillment_notes",
  "packed_at",
  "shipped_at",
  "delivered_at",
  "cancelled_at",
  "refunded_at",
  "created_at",
  "customer_order_items(id,product_id,product_slug,product_name,quantity,unit_amount,line_total_amount)",
].join(",");

const FULFILLMENT_STATUSES = new Set([
  "unfulfilled",
  "packed",
  "shipped",
  "delivered",
  "cancelled",
  "needs_attention",
]);

const PAYMENT_STATUSES = new Set([
  "paid",
  "refunded",
  "cancelled",
  "partially_refunded",
]);

function parseAddress(address) {
  if (!address) return null;
  return {
    line1: address.line1 || null,
    line2: address.line2 || null,
    city: address.city || null,
    state: address.state || null,
    postal_code: address.postal_code || null,
    country: address.country || null,
  };
}

async function stripeRequest(env, path, options = {}) {
  const response = await fetch(`https://api.stripe.com${path}`, {
    method: options.method || "GET",
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      ...(options.body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body: options.body || undefined,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error?.message || "Stripe request failed.");
  return data;
}

async function refreshOrderFromStripe(env, order) {
  if (!env.STRIPE_SECRET_KEY) throw new Error("Missing STRIPE_SECRET_KEY environment variable.");
  if (!order?.stripe_checkout_session_id) throw new Error("This order has no Stripe checkout session.");

  const session = await stripeRequest(
    env,
    `/v1/checkout/sessions/${encodeURIComponent(order.stripe_checkout_session_id)}?expand[]=customer&expand[]=payment_intent`,
  );

  const patch = {
    email: session.customer_details?.email || order.email || "",
    customer_name: session.customer_details?.name || session.shipping_details?.name || order.customer_name || "",
    phone: session.customer_details?.phone || order.phone || "",
    payment_status: session.payment_status || order.payment_status || "paid",
    shipping_name: session.shipping_details?.name || session.customer_details?.name || order.shipping_name || "",
    shipping_address: parseAddress(session.shipping_details?.address || session.customer_details?.address) || order.shipping_address || null,
    billing_address: parseAddress(session.customer_details?.address || session.shipping_details?.address) || order.billing_address || null,
    raw_checkout_session: session,
    updated_at: new Date().toISOString(),
  };

  const response = await supabaseFetch(env, `/customer_orders?id=eq.${encodeURIComponent(order.id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(patch),
  });

  if (!response.ok) throw new Error(await response.text());
  const [updated] = await response.json();
  return updated;
}

async function refundOrderInStripe(env, order) {
  if (!env.STRIPE_SECRET_KEY) throw new Error("Missing STRIPE_SECRET_KEY environment variable.");
  if (!order?.stripe_payment_intent_id) throw new Error("This order has no Stripe payment intent.");
  if (order.payment_status === "refunded") throw new Error("This order is already marked as refunded.");

  const body = new URLSearchParams();
  body.set("payment_intent", order.stripe_payment_intent_id);
  body.set("reason", "requested_by_customer");
  const refund = await stripeRequest(env, "/v1/refunds", {
    method: "POST",
    body: body.toString(),
  });

  const status = refund.status === "succeeded" ? "refunded" : "partially_refunded";
  const now = new Date().toISOString();
  const patch = {
    payment_status: status,
    refunded_at: now,
    updated_at: now,
    fulfillment_notes: [
      order.fulfillment_notes || "",
      `Stripe refund ${refund.id} created on ${new Date(now).toLocaleString("en-GB")}.`,
    ].filter(Boolean).join("\n"),
  };

  const response = await supabaseFetch(env, `/customer_orders?id=eq.${encodeURIComponent(order.id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(patch),
  });

  if (!response.ok) throw new Error(await response.text());
  const [updated] = await response.json();

  try {
    await sendFulfillmentUpdateEmail(env, updated, order.customer_order_items || [], { kind: "refunded" });
  } catch (emailError) {
    console.error("Refund email failed:", emailError.message);
  }

  return { order: updated, refund };
}

export async function onRequestGet({ request, env }) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;

  try {
    const url = new URL(request.url);
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || 50)));
    const response = await supabaseFetch(
      env,
      `/customer_orders?select=${encodeURIComponent(ORDER_SELECT)}&order=created_at.desc&limit=${limit}`,
    );

    if (!response.ok) return json({ error: await response.text() }, 400);

    const orders = await response.json();
    return json({ orders });
  } catch (error) {
    return json({ error: error.message }, 500);
  }
}

export async function onRequestPut({ request, env }) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;

  try {
    const body = await readJson(request);
    const orderId = String(body.id || "").trim();
    const action = String(body.action || "").trim();
    if (!orderId) return json({ error: "Order id is required." }, 400);

    const existingResponse = await supabaseFetch(
      env,
      `/customer_orders?select=${encodeURIComponent(ORDER_SELECT)}&id=eq.${encodeURIComponent(orderId)}&limit=1`,
    );

    if (!existingResponse.ok) return json({ error: await existingResponse.text() }, 400);

    const [existingOrder] = await existingResponse.json();
    if (!existingOrder) return json({ error: "Order not found." }, 404);

    if (action === "refresh_from_stripe") {
      const order = await refreshOrderFromStripe(env, existingOrder);
      return json({ order, refreshed_from_stripe: true });
    }

    if (action === "refund_in_stripe") {
      const { order, refund } = await refundOrderInStripe(env, existingOrder);
      return json({ order, refund_id: refund.id, email_sent: true, email_kind: "refunded", refunded_in_stripe: true });
    }

    const fulfillmentStatus = String(body.fulfillment_status || "").trim().toLowerCase();
    const paymentStatus = String(body.payment_status || "").trim().toLowerCase();
    if (!FULFILLMENT_STATUSES.has(fulfillmentStatus)) {
      return json({ error: "Invalid fulfillment status." }, 400);
    }
    if (!PAYMENT_STATUSES.has(paymentStatus)) {
      return json({ error: "Invalid payment status." }, 400);
    }

    const now = new Date().toISOString();

    const patch = {
      fulfillment_status: fulfillmentStatus,
      payment_status: paymentStatus,
      shipping_carrier: body.shipping_carrier ? String(body.shipping_carrier).trim() : null,
      tracking_number: body.tracking_number ? String(body.tracking_number).trim() : null,
      tracking_url: body.tracking_url ? String(body.tracking_url).trim() : null,
      fulfillment_notes: body.fulfillment_notes ? String(body.fulfillment_notes).trim() : null,
      packed_at: fulfillmentStatus === "packed" ? (body.packed_at || now) : null,
      shipped_at: fulfillmentStatus === "shipped" || fulfillmentStatus === "delivered" ? (body.shipped_at || now) : null,
      delivered_at: fulfillmentStatus === "delivered" ? (body.delivered_at || now) : null,
      cancelled_at: fulfillmentStatus === "cancelled" ? (body.cancelled_at || now) : null,
      refunded_at: paymentStatus === "refunded" || paymentStatus === "partially_refunded" ? (body.refunded_at || now) : null,
      updated_at: now,
    };

    if (fulfillmentStatus !== "packed" && !body.packed_at) patch.packed_at = null;
    if (!["shipped", "delivered"].includes(fulfillmentStatus) && !body.shipped_at) patch.shipped_at = null;
    if (fulfillmentStatus !== "delivered" && !body.delivered_at) patch.delivered_at = null;
    if (fulfillmentStatus !== "cancelled" && !body.cancelled_at) patch.cancelled_at = null;
    if (!["refunded", "partially_refunded"].includes(paymentStatus) && !body.refunded_at) patch.refunded_at = null;

    const response = await supabaseFetch(env, `/customer_orders?id=eq.${encodeURIComponent(orderId)}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(patch),
    });

    if (!response.ok) return json({ error: await response.text() }, 400);

    const [order] = await response.json();

    let emailSent = false;
    let emailKind = null;

    try {
      if (existingOrder.fulfillment_status !== fulfillmentStatus) {
        if (fulfillmentStatus === "shipped") emailKind = "shipped";
        if (fulfillmentStatus === "delivered") emailKind = "delivered";
        if (fulfillmentStatus === "cancelled") emailKind = "cancelled";
      }

      if (existingOrder.payment_status !== paymentStatus) {
        if (paymentStatus === "refunded" || paymentStatus === "partially_refunded") {
          emailKind = "refunded";
        }
      }

      if (emailKind) {
        await sendFulfillmentUpdateEmail(env, order, order.customer_order_items || [], { kind: emailKind });
        emailSent = true;
      }
    } catch (emailError) {
      console.error("Fulfillment email failed:", emailError.message);
    }

    return json({ order, email_sent: emailSent, email_kind: emailKind });
  } catch (error) {
    return json({ error: error.message }, 500);
  }
}

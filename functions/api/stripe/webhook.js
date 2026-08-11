import { sendOrderConfirmationEmail } from "../_email.js";
import { json, supabaseRpc } from "../catalog/_shared.js";
import { normalizeEmail, sendConfirmationEmail, upsertPendingSubscriber } from "../newsletter/_shared.js";

async function stripeRequest(env, path) {
  const response = await fetch(`https://api.stripe.com${path}`, {
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error?.message || `Stripe request failed for ${path}`);
  }

  return data;
}

function parseStripeSignature(header) {
  const values = { t: "", v1: [] };
  String(header || "")
    .split(",")
    .map((part) => part.trim())
    .forEach((part) => {
      const [key, value] = part.split("=");
      if (key === "t") values.t = value;
      if (key === "v1" && value) values.v1.push(value);
    });
  return values;
}

function hexToBytes(value) {
  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < value.length; index += 2) {
    bytes[index / 2] = Number.parseInt(value.slice(index, index + 2), 16);
  }
  return bytes;
}

function timingSafeEqualHex(a, b) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let index = 0; index < a.length; index += 1) {
    mismatch |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return mismatch === 0;
}

async function verifyStripeSignature(payload, header, secret) {
  const signature = parseStripeSignature(header);
  if (!signature.t || signature.v1.length === 0) return false;

  const signedPayload = `${signature.t}.${payload}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedPayload));
  const computed = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  return signature.v1.some((candidate) => timingSafeEqualHex(candidate, computed));
}

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

function parseCartMetadata(session) {
  try {
    return JSON.parse(session.metadata?.cart_items || "[]");
  } catch {
    return [];
  }
}

export async function onRequestPost({ request, env }) {
  try {
    if (!env.STRIPE_SECRET_KEY) {
      return json({ error: "Missing STRIPE_SECRET_KEY environment variable." }, 500);
    }

    if (!env.STRIPE_WEBHOOK_SECRET) {
      return json({ error: "Missing STRIPE_WEBHOOK_SECRET environment variable." }, 500);
    }

    const payload = await request.text();
    const signatureHeader = request.headers.get("stripe-signature");
    const isValid = await verifyStripeSignature(payload, signatureHeader, env.STRIPE_WEBHOOK_SECRET);

    if (!isValid) {
      return json({ error: "Invalid Stripe signature." }, 400);
    }

    const event = JSON.parse(payload);

    if (event.type !== "checkout.session.completed") {
      return json({ received: true, ignored: true });
    }

    const session = event.data?.object;
    if (!session?.id) {
      return json({ error: "Missing checkout session." }, 400);
    }

    if (session.payment_status !== "paid") {
      return json({ received: true, ignored: true });
    }

    const lineItemsResponse = await stripeRequest(
      env,
      `/v1/checkout/sessions/${session.id}/line_items?limit=100&expand[]=data.price.product`,
    );

    const metadataItems = parseCartMetadata(session);
    const metadataByIndex = new Map(metadataItems.map((item, index) => [index, item]));

    const items = (lineItemsResponse.data || []).map((lineItem, index) => {
      const metadataItem = metadataByIndex.get(index) || {};
      return {
        product_id: metadataItem.id || lineItem.price?.product?.metadata?.product_id || null,
        product_slug: metadataItem.slug || lineItem.price?.product?.metadata?.product_slug || null,
        product_name: lineItem.description || metadataItem.name || "Unknown product",
        quantity: Number(lineItem.quantity || metadataItem.quantity || 1),
        unit_amount: Number(lineItem.price?.unit_amount || metadataItem.unit_amount || 0),
        line_total_amount: Number(lineItem.amount_total || 0),
      };
    });

    const orderPayload = {
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: session.payment_intent || "",
      stripe_customer_id: session.customer || "",
      currency: session.currency || "gbp",
      email: session.customer_details?.email || "",
      customer_name: session.customer_details?.name || session.shipping_details?.name || "",
      phone: session.customer_details?.phone || "",
      payment_status: session.payment_status || "paid",
      fulfillment_status: "unfulfilled",
      subtotal_amount: Number(session.amount_subtotal || 0),
      shipping_amount: Number(session.total_details?.amount_shipping || 0),
      tax_amount: Number(session.total_details?.amount_tax || 0),
      total_amount: Number(session.amount_total || 0),
      shipping_name: session.shipping_details?.name || session.customer_details?.name || "",
      shipping_address: parseAddress(session.shipping_details?.address || session.customer_details?.address),
      billing_address: parseAddress(session.customer_details?.address || session.shipping_details?.address),
      stripe_metadata: session.metadata || {},
      raw_checkout_session: session,
    };

    const [result] = await supabaseRpc(env, "finalize_checkout_order", {
      order_payload: orderPayload,
      item_payloads: items,
    });

    if (!result?.already_processed) {
      try {
        await sendOrderConfirmationEmail(env, {
          id: result?.order_id || session.id,
          ...orderPayload,
        }, items);
      } catch (emailError) {
        console.error("Order confirmation email failed:", emailError.message);
      }

      try {
        const newsletterOptIn = session.metadata?.newsletter_opt_in === "true";
        const checkoutEmail = String(session.customer_details?.email || "").trim();

        if (newsletterOptIn && checkoutEmail) {
          const subscriber = await upsertPendingSubscriber(env, {
            email: normalizeEmail(checkoutEmail),
            source: "checkout",
          });

          if (!subscriber.alreadySubscribed) {
            await sendConfirmationEmail(env, subscriber);
          }
        }
      } catch (newsletterError) {
        console.error("Newsletter checkout opt-in failed:", newsletterError.message);
      }
    }

    return json({
      received: true,
      order_id: result?.order_id || null,
      already_processed: result?.already_processed || false,
      stock_issue: result?.stock_issue || false,
    });
  } catch (error) {
    return json({ error: error.message }, 500);
  }
}

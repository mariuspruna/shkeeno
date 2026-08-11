import { getCommerceSettings, json, supabaseFetch } from "./catalog/_shared.js";

const PRODUCT_SELECT = [
  "id",
  "slug",
  "name",
  "short_description",
  "price_gbp",
  "stock_quantity",
  "is_published",
].join(",");

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function toStripeAmount(value) {
  return Math.round(Number(value || 0) * 100);
}

function shippingOptionsFromSettings(settings) {
  const options = [];
  const configuredIds = [
    settings?.shipping_rate_standard_id,
    settings?.express_enabled ? settings?.shipping_rate_express_id : null,
  ].filter(Boolean);

  configuredIds.forEach((shippingRate) => {
    options.push({ shipping_rate: shippingRate });
  });

  if (options.length > 0) return options;

  const fallback = [{
    shipping_rate_data: {
      type: "fixed_amount",
      fixed_amount: { amount: settings?.standard_rate_amount ?? 495, currency: "gbp" },
      display_name: settings?.standard_rate_name || "Tracked shipping",
      delivery_estimate: {
        minimum: { unit: "business_day", value: settings?.standard_min_business_days ?? 2 },
        maximum: { unit: "business_day", value: settings?.standard_max_business_days ?? 10 },
      },
    },
  }];

  if (settings?.express_enabled) {
    fallback.push({
      shipping_rate_data: {
        type: "fixed_amount",
        fixed_amount: { amount: settings?.express_rate_amount ?? 995, currency: "gbp" },
        display_name: settings?.express_rate_name || "Express shipping",
        delivery_estimate: {
          minimum: { unit: "business_day", value: settings?.express_min_business_days ?? 1 },
          maximum: { unit: "business_day", value: settings?.express_max_business_days ?? 3 },
        },
      },
    });
  }

  return fallback;
}

function pickShippingOption(settings, shippingCountry) {
  const isUk = shippingCountry === "GB";

  if (isUk) {
    if (settings?.shipping_rate_standard_id) {
      return [{ shipping_rate: settings.shipping_rate_standard_id }];
    }

    return [{
      shipping_rate_data: {
        type: "fixed_amount",
        fixed_amount: { amount: settings?.standard_rate_amount ?? 495, currency: "gbp" },
        display_name: settings?.standard_rate_name || "United Kingdom",
        delivery_estimate: {
          minimum: { unit: "business_day", value: settings?.standard_min_business_days ?? 1 },
          maximum: { unit: "business_day", value: settings?.standard_max_business_days ?? 2 },
        },
      },
    }];
  }

  if (settings?.shipping_rate_express_id) {
    return [{ shipping_rate: settings.shipping_rate_express_id }];
  }

  return [{
    shipping_rate_data: {
      type: "fixed_amount",
      fixed_amount: { amount: settings?.express_rate_amount ?? 899, currency: "gbp" },
      display_name: settings?.express_rate_name || "International (Non-UK)",
      delivery_estimate: {
        minimum: { unit: "business_day", value: settings?.express_min_business_days ?? 5 },
        maximum: { unit: "business_day", value: settings?.express_max_business_days ?? 10 },
      },
    },
  }];
}

export async function onRequestPost({ request, env }) {
  try {
    if (!env.STRIPE_SECRET_KEY) {
      return json({ error: "Missing STRIPE_SECRET_KEY environment variable." }, 500);
    }

    const body = await readJson(request);
    const items = Array.isArray(body.items) ? body.items : [];
    const shippingCountry = String(body.shipping_country || "").trim().toUpperCase();
    const newsletterOptIn = body.newsletter_opt_in === true;
    const origin = new URL(request.url).origin;
    const siteUrl = env.PUBLIC_SITE_URL || origin;
    const settings = await getCommerceSettings(env);
    const allowedCountries = settings?.allowed_countries || ["GB", "US", "DE", "FR", "NL", "SE", "JP"];

    const sanitizedItems = items
      .map((item) => ({
        id: String(item.id || "").trim(),
        quantity: Math.max(1, Math.min(10, Number(item.quantity || 1))),
      }))
      .filter((item) => item.id);

    if (sanitizedItems.length === 0) {
      return json({ error: "Cart is empty." }, 400);
    }

    if (!shippingCountry) {
      return json({ error: "Choose a shipping country before checkout." }, 400);
    }

    if (!allowedCountries.includes(shippingCountry)) {
      return json({ error: "That shipping country is not available right now." }, 400);
    }

    const ids = sanitizedItems.map((item) => item.id);
    const productResponse = await supabaseFetch(
      env,
      `/products?select=${encodeURIComponent(PRODUCT_SELECT)}&is_published=eq.true&id=in.(${ids.map(encodeURIComponent).join(",")})`,
    );

    if (!productResponse.ok) {
      return json({ error: await productResponse.text() }, 400);
    }

    const products = await productResponse.json();
    const productMap = new Map(products.map((product) => [product.id, product]));

    const lineItems = [];
    const cartMetadata = [];

    for (const item of sanitizedItems) {
      const product = productMap.get(item.id);
      if (!product) {
        return json({ error: "One cart item is no longer available." }, 400);
      }

      if (product.stock_quantity < item.quantity) {
        return json({ error: `${product.name} does not have enough stock.` }, 400);
      }

      lineItems.push({
        "price_data[currency]": "gbp",
        "price_data[unit_amount]": String(toStripeAmount(product.price_gbp)),
        "price_data[product_data][name]": product.name,
        "price_data[product_data][description]": product.short_description || "",
        "price_data[product_data][metadata][product_id]": product.id,
        "price_data[product_data][metadata][product_slug]": product.slug,
        quantity: String(item.quantity),
      });

      cartMetadata.push({
        id: product.id,
        slug: product.slug,
        name: product.name,
        quantity: item.quantity,
        unit_amount: toStripeAmount(product.price_gbp),
      });
    }

    const payload = new URLSearchParams();
    payload.set("mode", "payment");
    payload.set("success_url", `${siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`);
    payload.set("cancel_url", `${siteUrl}/cart`);
    payload.set("billing_address_collection", settings?.collect_billing_address === false ? "auto" : "required");
    payload.set("customer_creation", "always");
    payload.set("phone_number_collection[enabled]", settings?.require_phone === false ? "false" : "true");
    payload.set("allow_promotion_codes", settings?.allow_promotion_codes === false ? "false" : "true");
    payload.set("shipping_address_collection[allowed_countries][0]", shippingCountry);
    payload.set("custom_text[submit][message]", "Shipping and taxes are finalised here. You will receive a confirmation after payment.");
    payload.set("metadata[cart_items]", JSON.stringify(cartMetadata));
    payload.set("metadata[item_count]", String(cartMetadata.length));
    payload.set("metadata[shop_name]", settings?.shop_name || "Shkeeno");
    payload.set("metadata[shipping_country]", shippingCountry);
    payload.set("metadata[newsletter_opt_in]", newsletterOptIn ? "true" : "false");

    lineItems.forEach((lineItem, index) => {
      Object.entries(lineItem).forEach(([key, value]) => {
        payload.set(`line_items[${index}][${key}]`, value);
      });
    });

    pickShippingOption(settings, shippingCountry).forEach((option, index) => {
      if (option.shipping_rate) {
        payload.set(`shipping_options[${index}][shipping_rate]`, option.shipping_rate);
        return;
      }

      payload.set(`shipping_options[${index}][shipping_rate_data][type]`, option.shipping_rate_data.type);
      payload.set(`shipping_options[${index}][shipping_rate_data][fixed_amount][amount]`, String(option.shipping_rate_data.fixed_amount.amount));
      payload.set(`shipping_options[${index}][shipping_rate_data][fixed_amount][currency]`, option.shipping_rate_data.fixed_amount.currency);
      payload.set(`shipping_options[${index}][shipping_rate_data][display_name]`, option.shipping_rate_data.display_name);
      payload.set(`shipping_options[${index}][shipping_rate_data][delivery_estimate][minimum][unit]`, option.shipping_rate_data.delivery_estimate.minimum.unit);
      payload.set(`shipping_options[${index}][shipping_rate_data][delivery_estimate][minimum][value]`, String(option.shipping_rate_data.delivery_estimate.minimum.value));
      payload.set(`shipping_options[${index}][shipping_rate_data][delivery_estimate][maximum][unit]`, option.shipping_rate_data.delivery_estimate.maximum.unit);
      payload.set(`shipping_options[${index}][shipping_rate_data][delivery_estimate][maximum][value]`, String(option.shipping_rate_data.delivery_estimate.maximum.value));
    });

    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: payload.toString(),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return json({ error: data.error?.message || "Stripe checkout failed." }, 400);
    }

    return json({ url: data.url, id: data.id });
  } catch (error) {
    return json({ error: error.message }, 500);
  }
}

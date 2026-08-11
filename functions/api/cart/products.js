import { json, supabaseFetch } from "../catalog/_shared.js";

const PRODUCT_SELECT = [
  "id",
  "slug",
  "name",
  "brand",
  "short_description",
  "price_gbp",
  "compare_at_price_gbp",
  "weight_grams",
  "stock_quantity",
  "low_stock_threshold",
  "badge",
  "product_images(id,url,alt,sort_order)",
].join(",");

export async function onRequestGet({ env, request }) {
  try {
    const url = new URL(request.url);
    const ids = (url.searchParams.get("ids") || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
      .slice(0, 24);

    if (ids.length === 0) {
      return json({ products: [] });
    }

    const response = await supabaseFetch(
      env,
      `/products?select=${encodeURIComponent(PRODUCT_SELECT)}&is_published=eq.true&id=in.(${ids.map(encodeURIComponent).join(",")})`,
      {
        headers: {
          Prefer: "count=exact",
        },
      },
    );

    if (!response.ok) {
      return json({ error: await response.text() }, 400);
    }

    const products = await response.json();
    return json({ products });
  } catch (error) {
    return json({ error: error.message }, 500);
  }
}

import { json, listProducts } from "../catalog/_shared.js";

const viewBadgeMap = {
  "new-in": "new",
  "pre-order": "pre_order",
  sale: "sale",
};

export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url);
    const category = url.searchParams.get("category") || "";
    const view = url.searchParams.get("view") || "";
    const sort = url.searchParams.get("sort") || "newest";
    const limit = Number(url.searchParams.get("limit") || 0);
    const badge = viewBadgeMap[view] || "";

    let products = (await listProducts(env)).filter((product) => product.is_published);

    if (category) {
      products = products.filter((product) => product.category === category);
    }

    if (badge) {
      products = products.filter((product) => product.badge === badge);
    }

    products = sortProducts(products, sort);

    if (Number.isInteger(limit) && limit > 0) {
      products = products.slice(0, limit);
    }

    return json({ products });
  } catch (error) {
    return json({ error: error.message }, 500);
  }
}

function sortProducts(products, sort) {
  return [...products].sort((left, right) => {
    if (sort === "price-asc") return Number(left.price_gbp || 0) - Number(right.price_gbp || 0);
    if (sort === "price-desc") return Number(right.price_gbp || 0) - Number(left.price_gbp || 0);
    return new Date(right.created_at || 0).getTime() - new Date(left.created_at || 0).getTime();
  });
}

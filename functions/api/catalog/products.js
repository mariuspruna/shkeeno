import { json, listProducts, readJson, requireAdmin, sanitizeProduct, supabaseFetch } from "./_shared.js";

const viewBadgeMap = {
  "new-in": "new",
  "pre-order": "pre_order",
  sale: "sale",
};

export async function onRequestGet({ request, env }) {
  try {
    const providedKey = request.headers.get("x-admin-key");
    const isAdmin = Boolean(env.ADMIN_API_KEY && providedKey === env.ADMIN_API_KEY);

    if (providedKey && !isAdmin) {
      return json({ error: "Admin key required." }, 401);
    }

    const url = new URL(request.url);
    const category = url.searchParams.get("category") || "";
    const view = url.searchParams.get("view") || "";
    const sort = url.searchParams.get("sort") || "newest";
    const limit = Number(url.searchParams.get("limit") || 0);
    const badge = viewBadgeMap[view] || "";

    let products = await listProducts(env);

    if (!isAdmin) {
      products = products.filter((product) => product.is_published);
    }

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

export async function onRequestPost({ request, env }) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;

  try {
    const body = await readJson(request);
    const result = sanitizeProduct(body);

    if (result.error) return json({ error: result.error }, 400);

    const createResponse = await supabaseFetch(env, "/products?select=id", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(result.product),
    });

    if (!createResponse.ok) return json({ error: await createResponse.text() }, 400);

    const [created] = await createResponse.json();

    if (result.imageUrls.length > 0) {
      const images = result.imageUrls.map((url, index) => ({
        product_id: created.id,
        url,
        alt: `${result.product.name} image ${index + 1}`,
        sort_order: index,
      }));

      const imageResponse = await supabaseFetch(env, "/product_images", {
        method: "POST",
        body: JSON.stringify(images),
      });

      if (!imageResponse.ok) return json({ error: await imageResponse.text() }, 400);
    }

    return json({ product: created }, 201);
  } catch (error) {
    return json({ error: error.message }, 500);
  }
}

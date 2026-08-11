import { json, readJson, requireAdmin, sanitizeProduct, supabaseFetch } from "../_shared.js";

export async function onRequestPut({ request, env, params }) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;

  try {
    const body = await readJson(request);
    const result = sanitizeProduct(body);

    if (result.error) return json({ error: result.error }, 400);

    const productResponse = await supabaseFetch(env, `/products?id=eq.${params.id}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(result.product),
    });

    if (!productResponse.ok) return json({ error: await productResponse.text() }, 400);

    const deleteImagesResponse = await supabaseFetch(env, `/product_images?product_id=eq.${params.id}`, {
      method: "DELETE",
    });

    if (!deleteImagesResponse.ok) {
      return json({ error: await deleteImagesResponse.text() }, 400);
    }

    if (result.imageUrls.length > 0) {
      const images = result.imageUrls.map((url, index) => ({
        product_id: params.id,
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

    return json({ ok: true });
  } catch (error) {
    return json({ error: error.message }, 500);
  }
}

export async function onRequestPatch({ request, env, params }) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;

  try {
    const body = await readJson(request);
    const id = params.id;

    if (body.is_published === true) {
      const imagesResponse = await supabaseFetch(
        env,
        `/product_images?product_id=eq.${id}&select=id&limit=1`,
      );
      const images = imagesResponse.ok ? await imagesResponse.json() : [];

      if (images.length === 0) {
        return json({ error: "Published products need at least one image." }, 400);
      }
    }

    const update = {
      updated_at: new Date().toISOString(),
    };

    if (typeof body.is_published === "boolean") update.is_published = body.is_published;
    if (typeof body.is_featured === "boolean") update.is_featured = body.is_featured;
    if (typeof body.badge === "string") update.badge = body.badge || null;

    const response = await supabaseFetch(env, `/products?id=eq.${id}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(update),
    });

    if (!response.ok) return json({ error: await response.text() }, 400);

    return json({ ok: true });
  } catch (error) {
    return json({ error: error.message }, 500);
  }
}

export async function onRequestDelete({ request, env, params }) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;

  try {
    const response = await supabaseFetch(env, `/products?id=eq.${params.id}`, {
      method: "DELETE",
    });

    if (!response.ok) return json({ error: await response.text() }, 400);

    return json({ ok: true });
  } catch (error) {
    return json({ error: error.message }, 500);
  }
}

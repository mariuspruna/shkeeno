import { getSupabaseConfig, json, requireAdmin } from "./_shared.js";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

export async function onRequestPost({ request, env }) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;

  let formData;

  try {
    formData = await request.formData();
  } catch {
    return json({ error: "Upload must be sent as multipart form data." }, 400);
  }

  const file = formData.get("file");

  if (!file || typeof file === "string") {
    return json({ error: "Image file is required." }, 400);
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return json({ error: "Use JPG, PNG, WebP, or AVIF images." }, 400);
  }

  if (file.size > MAX_FILE_SIZE) {
    return json({ error: "Image must be 5MB or smaller." }, 400);
  }

  const { url, serviceKey } = getSupabaseConfig(env);
  const extension = extensionForType(file.type);
  const objectPath = `manual/${crypto.randomUUID()}.${extension}`;
  const uploadUrl = `${url}/storage/v1/object/product-images/${objectPath}`;
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      authorization: `Bearer ${serviceKey}`,
      "content-type": file.type,
      "cache-control": "31536000",
      "x-upsert": "false",
    },
    body: await file.arrayBuffer(),
  });

  if (!response.ok) {
    return json({ error: await response.text() }, 400);
  }

  return json({
    url: `${url}/storage/v1/object/public/product-images/${objectPath}`,
  });
}

function extensionForType(type) {
  if (type === "image/jpeg") return "jpg";
  if (type === "image/png") return "png";
  if (type === "image/avif") return "avif";
  return "webp";
}

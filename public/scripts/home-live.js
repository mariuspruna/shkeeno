const homeFeaturedProducts = document.querySelector("[data-home-featured-products]");

if (homeFeaturedProducts) {
  refreshHomeProducts();
}

async function refreshHomeProducts() {
  const response = await fetch("/api/catalog/products");
  if (!response.ok) return;

  const data = await response.json();
  const products = data.products || [];
  if (!products.length) return;

  const featured = products.filter((product) => product.is_featured);
  const source = (featured.length ? featured : products).slice(0, 3);

  homeFeaturedProducts.innerHTML = source.map(renderHomeProduct).join("");
}

function renderHomeProduct(product) {
  const image = [...(product.product_images || [])].sort((a, b) => a.sort_order - b.sort_order)[0];
  const displayName = toTitleCase(product.name);
  const provenance = product.origin_country
    ? `<span>${escapeHtml(product.brand || product.category || "Shkeeno")}</span><span class="meta-origin">${escapeHtml(product.origin_country)}</span>`
    : `<span>${escapeHtml(product.brand || product.category || "Shkeeno")}</span>`;

  return `
    <article class="home-feature-card">
      <div class="home-feature-media">
        <div class="gallery-viewport">
          <a
            href="/shop/${escapeAttribute(product.slug)}"
            class="product-image ${image?.url ? "has-image" : ""}"
            ${image?.url ? `style="--product-image: url('${escapeAttribute(image.url)}')"` : ""}
            aria-label="View ${escapeAttribute(displayName)}"
          ></a>
        </div>
      </div>
      <div class="home-feature-copy">
        <p class="eyebrow home-feature-provenance">${provenance}</p>
        <h3><a href="/shop/${escapeAttribute(product.slug)}">${escapeHtml(displayName)}</a></h3>
        <p>${escapeHtml(product.short_description || "")}</p>
        <div class="home-feature-meta">
          <strong>£${formatPrice(product.price_gbp)}</strong>
        </div>
      </div>
    </article>
  `;
}

function formatPrice(value) {
  return Number(value || 0).toFixed(2);
}

function toTitleCase(value) {
  const smallWords = new Set(["a", "an", "and", "as", "at", "but", "by", "for", "in", "of", "on", "or", "the", "to", "with"]);
  return String(value || "")
    .toLowerCase()
    .split(/(\s+|[-/])/)
    .map((part, index) => {
      if (!part.trim() || part === "-" || part === "/") return part;
      if (index > 0 && smallWords.has(part)) return part;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join("");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
  });
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}

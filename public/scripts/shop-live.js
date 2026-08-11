const shopResults = document.querySelector("[data-shop-results]");
const shopResultContext = document.querySelector("[data-shop-result-context]");
const shopFilterLinks = Array.from(document.querySelectorAll("[data-shop-filter]"));
const shopShellNodes = Array.from(document.querySelectorAll("[data-shop-shell]"));
const shopSortSelect = document.querySelector("[data-shop-sort]");

if (shopResults) {
  refreshShopProducts();
}

async function refreshShopProducts() {
  const limit = Number(shopResults.dataset.limit || 0);
  const params = new URLSearchParams(window.location.search);
  const category = params.get("category") || "";
  const view = params.get("view") || "";
  const sort = params.get("sort") || "newest";

  setShopPending(true);

  const url = new URL("/api/shop/products", window.location.origin);
  if (category) url.searchParams.set("category", category);
  if (view) url.searchParams.set("view", view);
  if (sort && sort !== "newest") url.searchParams.set("sort", sort);
  if (Number.isInteger(limit) && limit > 0) url.searchParams.set("limit", String(limit));
  const response = await fetch(url.toString());

  if (!response.ok) {
    setShopPending(false);
    return;
  }

  const data = await response.json();
  const products = sortProducts(data.products || [], sort);
  syncShopChrome(category, view, sort, products.length);
  shopResults.innerHTML = renderProducts(products);
  setShopPending(false);
}

function syncShopChrome(category, view, sort, count) {
  const activeFilter = view ? `view:${view}` : category ? `category:${category}` : "all";
  const activeLink = shopFilterLinks.find((link) => link.dataset.shopFilter === activeFilter);
  const activeLabel = activeLink?.textContent?.trim() || "";

  shopFilterLinks.forEach((link) => {
    if (link.dataset.shopFilter === activeFilter) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });

  if (shopResultContext) {
    shopResultContext.textContent = activeFilter !== "all"
      ? `${activeLabel} / ${count} ${count === 1 ? "product" : "products"}`
      : `${count} ${count === 1 ? "product" : "products"} in collection`;
  }

  if (shopSortSelect) {
    shopSortSelect.value = sort;
  }
}

function setShopPending(isPending) {
  if (isPending) {
    document.documentElement.dataset.shopFilterPending = "true";
  } else {
    delete document.documentElement.dataset.shopFilterPending;
  }

  shopShellNodes.forEach((node) => {
    node.dataset.pending = isPending ? "true" : "false";
  });
}

shopFilterLinks.forEach((link) => {
  link.addEventListener("click", async (event) => {
    const url = new URL(link.href, window.location.origin);
    if (url.pathname !== "/shop") return;

    event.preventDefault();
    const currentParams = new URLSearchParams(window.location.search);
    const currentSort = currentParams.get("sort");
    if (currentSort) {
      url.searchParams.set("sort", currentSort);
    }
    window.history.pushState({}, "", url.toString());
    await refreshShopProducts();
  });
});

shopSortSelect?.addEventListener("change", async (event) => {
  const sort = event.target.value || "newest";
  const url = new URL(window.location.href);
  if (sort === "newest") {
    url.searchParams.delete("sort");
  } else {
    url.searchParams.set("sort", sort);
  }
  window.history.pushState({}, "", url.toString());
  await refreshShopProducts();
});

window.addEventListener("popstate", () => {
  if (!shopResults) return;
  refreshShopProducts();
});

function sortProducts(products, sort) {
  return [...products].sort((left, right) => {
    if (sort === "price-asc") return Number.parseFloat(left.price_gbp || 0) - Number.parseFloat(right.price_gbp || 0);
    if (sort === "price-desc") return Number.parseFloat(right.price_gbp || 0) - Number.parseFloat(left.price_gbp || 0);
    return new Date(right.created_at || 0).getTime() - new Date(left.created_at || 0).getTime();
  });
}

function renderProducts(products) {
  if (!products.length) {
    return `
      <section class="empty-state">
        <p>No published products yet.</p>
        <a href="/admin/products">Open catalogue admin</a>
      </section>
    `;
  }

  return `
    <section class="product-grid product-grid-shop" aria-label="Published products">
      ${products.map(renderProductCard).join("")}
    </section>
  `;
}

function renderProductCard(product) {
  const images = [...(product.product_images || [])].sort((a, b) => a.sort_order - b.sort_order).slice(0, 6);
  const lowStock =
    product.stock_quantity > 0 && product.stock_quantity <= product.low_stock_threshold;
  const status = product.stock_quantity === 0
    ? "Sold out"
    : lowStock
      ? `Only ${product.stock_quantity} available`
      : product.is_featured
        ? "Featured product"
        : "Available";
  const statusLabel = product.badge ? `${product.badge.replace("_", " ")} / ${status}` : status;
  const discountLabel = product.compare_at_price_gbp && Number(product.compare_at_price_gbp) > Number(product.price_gbp)
    ? `-${Math.round((1 - (Number(product.price_gbp) / Number(product.compare_at_price_gbp))) * 100)}%`
    : "";
  const gallery = images.length > 0
    ? images.map((image, index) => `
        <a
          href="/shop/${escapeAttribute(product.slug)}"
          aria-label="View ${escapeAttribute(toTitleCase(product.name))}"
          class="${index === 0 ? "product-image has-image" : "product-image has-image is-hidden"}"
          style="--product-image: url('${escapeAttribute(image.url)}')"
          data-gallery-image
          ${index === 0 ? "" : "hidden"}
        >
          ${discountLabel ? `<strong class="product-discount-badge">${escapeHtml(discountLabel)}</strong>` : ""}
        </a>
      `).join("")
    : `
        <a href="/shop/${escapeAttribute(product.slug)}" aria-label="View ${escapeAttribute(toTitleCase(product.name))}" class="product-image">
          ${discountLabel ? `<strong class="product-discount-badge">${escapeHtml(discountLabel)}</strong>` : ""}
        </a>
      `;
  const controls = images.length > 1
    ? `
        <div class="gallery-controls">
          <button type="button" data-gallery-prev aria-label="Previous image for ${escapeAttribute(toTitleCase(product.name))}"><span aria-hidden="true">‹</span></button>
          <button type="button" data-gallery-next aria-label="Next image for ${escapeAttribute(toTitleCase(product.name))}"><span aria-hidden="true">›</span></button>
        </div>
      `
    : "";

  return `
    <article class="product-card">
      <div class="product-card-media">
        <div class="product-card-gallery" data-gallery>
          <div class="gallery-viewport">
            ${gallery}
            ${controls}
          </div>
        </div>
      </div>
      <a href="/shop/${escapeAttribute(product.slug)}" aria-label="View ${escapeAttribute(toTitleCase(product.name))}">
        <div class="product-meta">
          <p>${escapeHtml(statusLabel)}</p>
          <h2>${escapeHtml(toTitleCase(product.name))}</h2>
          <span>
            £${formatPrice(product.price_gbp)}
            ${product.compare_at_price_gbp ? `<s>£${formatPrice(product.compare_at_price_gbp)}</s>` : ""}
          </span>
        </div>
        <p>${escapeHtml(product.short_description || "")}</p>
      </a>
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

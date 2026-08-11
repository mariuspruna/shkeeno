let productTable = null;
let productForm = null;
let fetchForm = null;
let statusNode = null;
let imageList = null;
let formModeNode = null;
let formSubmitButton = null;
let imageFilesInput = null;
let uploadPreview = null;
let cancelEditButton = null;
let formSummaryNode = null;
let productStatsNode = null;
let editorBackButton = null;
let categorySelect = null;
let tagInput = null;
let tagPickerList = null;
let productsLoading = false;
let pendingAction = null;
let currentProducts = [];
let editingProductId = null;
let imageEntries = [];
let lastSavedSnapshot = "";
let pendingAfterSave = null;
let currentCategories = [];
let currentTags = [];
let selectedTags = [];
const FETCHED_FIELD_NAMES = ["name", "brand", "short_description", "weight_grams", "price_gbp"];

const MAX_IMAGE_COUNT = 6;
const MAX_SOURCE_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

function bindCatalogAdminNodes() {
  productTable = document.querySelector("[data-products-table]");
  productForm = document.querySelector("[data-product-form]");
  fetchForm = document.querySelector("[data-fetch-form]");
  statusNode = document.querySelector("[data-catalog-status]");
  imageList = document.querySelector("[data-image-list]");
  formModeNode = document.querySelector("[data-form-mode]");
  formSubmitButton = document.querySelector("[data-product-submit]");
  imageFilesInput = document.querySelector("[data-image-files]");
  uploadPreview = document.querySelector("[data-upload-preview]");
  cancelEditButton = document.querySelector("[data-cancel-edit]");
  formSummaryNode = document.querySelector("[data-form-summary]");
  productStatsNode = document.querySelector("[data-product-stats]");
  editorBackButton = document.querySelector("[data-editor-back]");
  categorySelect = document.querySelector("[data-category-select]");
  tagInput = document.querySelector('input[name="tags"]');
  tagPickerList = document.querySelector("[data-tag-picker-list]");
}

function setStatus(message, tone = "neutral") {
  if (!statusNode) return;
  statusNode.textContent = message;
  statusNode.dataset.tone = tone;
}

function showToast(message, tone = "good") {
  const existing = document.querySelector("[data-toast]");
  existing?.remove();

  document.body.insertAdjacentHTML(
    "beforeend",
    `<p class="action-toast" data-toast data-tone="${tone}">${escapeHtml(message)}</p>`,
  );

  window.setTimeout(() => {
    document.querySelector("[data-toast]")?.remove();
  }, 3600);
}

function clearFetchedState() {
  if (!productForm) return;
  FETCHED_FIELD_NAMES.forEach((name) => {
    const field = productForm.elements.namedItem(name);
    field?.removeAttribute?.("data-fetched");
  });
}

function markFetchedField(name, hasValue) {
  if (!productForm || !hasValue) return;
  const field = productForm.elements.namedItem(name);
  field?.setAttribute?.("data-fetched", "true");
}

async function api(path, options = {}) {
  const adminKey = localStorage.getItem("shkeeno-admin-key") || "";
  const response = await fetch(path, {
    ...options,
    headers: {
      "content-type": "application/json",
      "x-admin-key": adminKey,
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed.");
  return data;
}

async function uploadImage(file) {
  const adminKey = localStorage.getItem("shkeeno-admin-key") || "";
  const formData = new FormData();
  formData.append("file", file, file.name);

  const response = await fetch("/api/catalog/upload-image", {
    method: "POST",
    headers: {
      "x-admin-key": adminKey,
    },
    body: formData,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Image upload failed.");
  return data.url;
}

function formValue(form, name) {
  return form.elements.namedItem(name)?.value?.trim() || "";
}

function renderProducts(products) {
  currentProducts = products;
  if (!productTable) return;
  renderProductStats(products);

  if (products.length === 0) {
    productTable.innerHTML = localStorage.getItem("shkeeno-admin-key")
      ? '<p class="empty-copy">No catalogue products yet.</p>'
      : '<p class="empty-copy">Save the admin key in Access, then return here.</p>';
    return;
  }

  productTable.innerHTML = `
    <table class="catalog-table">
      <thead>
        <tr>
          <th>Product</th>
          <th>Weight</th>
          <th>Price</th>
          <th>Status</th>
          <th>Newsletter</th>
          <th>Stock</th>
          <th>Images</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${products.map(renderProductRow).join("")}
      </tbody>
    </table>
  `;
}

function renderProductStats(products) {
  if (!productStatsNode) return;

  const total = products.length;
  const live = products.filter((product) => product.is_published).length;
  const drafts = total - live;
  const categories = currentCategories.length > 0
    ? currentCategories.filter((category) => category.is_active !== false).length
    : new Set(products.map((product) => product.category).filter(Boolean)).size;
  const values = [total, live, drafts, categories];

  productStatsNode.querySelectorAll("dd").forEach((node, index) => {
    node.textContent = String(values[index] ?? 0);
  });
}

function renderCategoryOptions(selected = "") {
  if (!categorySelect) return;

  const categories = currentCategories.length > 0
    ? currentCategories
    : [
        { slug: "pocket", name: "Pocket" },
        { slug: "travel", name: "Travel" },
        { slug: "edc", name: "EDC" },
        { slug: "wearable", name: "Wearable" },
        { slug: "accessory", name: "Accessory" },
      ];

  categorySelect.innerHTML = categories
    .map((category) => `
      <option value="${escapeAttribute(category.slug)}" ${category.slug === selected ? "selected" : ""}>
        ${escapeHtml(category.name)}
      </option>
    `)
    .join("");
}

async function loadCategories() {
  try {
    const data = await api("/api/catalog/categories");
    currentCategories = (data.categories || []).filter((category) => category.is_active !== false);
    renderCategoryOptions(formValue(productForm, "category") || currentCategories[0]?.slug || "pocket");
    rememberSnapshot();
  } catch {
    currentCategories = [];
    renderCategoryOptions(formValue(productForm, "category") || "pocket");
    rememberSnapshot();
  }
}

function syncTagInput() {
  if (tagInput) tagInput.value = selectedTags.join(", ");
}

function renderTagPicker() {
  if (!tagPickerList) return;

  if (!localStorage.getItem("shkeeno-admin-key")) {
    tagPickerList.innerHTML = '<p class="empty-copy">Save the admin key in Access, then return here.</p>';
    return;
  }

  if (currentTags.length === 0) {
    tagPickerList.innerHTML = '<p class="empty-copy">No tags yet. Create them in Tags.</p>';
    return;
  }

  tagPickerList.innerHTML = currentTags
    .map((tag) => `
      <button
        type="button"
        class="tag-chip ${selectedTags.includes(tag.slug) ? "is-selected" : ""}"
        data-tag-option="${escapeAttribute(tag.slug)}"
        aria-pressed="${selectedTags.includes(tag.slug) ? "true" : "false"}"
      >
        ${escapeHtml(tag.name)}
      </button>
    `)
    .join("");
}

async function loadTags() {
  try {
    const data = await api("/api/catalog/tags");
    currentTags = (data.tags || []).filter((tag) => tag.is_active !== false);
    renderTagPicker();
    rememberSnapshot();
  } catch {
    currentTags = [];
    renderTagPicker();
    rememberSnapshot();
  }
}

function renderProductRow(product) {
  const status = product.is_published ? "Listed" : "Unlisted";
  const action = product.is_published ? "Unlist" : "List";
  const nextPublished = product.is_published ? "false" : "true";
  const price = product.compare_at_price_gbp
    ? `£${formatPrice(product.price_gbp)} <s>£${formatPrice(product.compare_at_price_gbp)}</s>`
    : `£${formatPrice(product.price_gbp)}`;
  const category = product.category || "";
  const tags = Array.isArray(product.tags)
    ? [...new Set(product.tags.filter(Boolean).filter((tag) => tag !== category))].slice(0, 3)
    : [];
  const heroImage = (product.product_images || [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)[0]?.url || "";
  const metaBits = [
    product.brand ? `<span>${escapeHtml(product.brand)}</span>` : "",
    category ? `<strong>Category: ${escapeHtml(category)}</strong>` : "",
    tags.length ? `<em>${escapeHtml(tags.join(" • "))}</em>` : "",
  ].filter(Boolean);
  const description = product.short_description ? escapeHtml(product.short_description) : "No short description yet.";
  const newsletterStatus = product.newsletter_promoted_at
    ? `Sent ${formatDate(product.newsletter_promoted_at)}`
    : product.include_in_newsletter
      ? "Queued"
      : "Not queued";

  return `
    <tr>
      <td data-label="Product">
        <div class="catalog-product-cell">
          <div class="catalog-product-thumb ${heroImage ? "has-image" : ""}" ${heroImage ? `style="--product-image: url('${escapeAttribute(heroImage)}')"` : ""}></div>
          <div class="catalog-product-copy">
            <strong>${escapeHtml(product.name)}</strong>
            <span class="catalog-row-meta">${metaBits.join('<span class="catalog-row-divider">•</span>') || "Unassigned"}</span>
            <dl class="catalog-mobile-details">
              <div><dt>Weight</dt><dd>${Math.round(Number(product.weight_grams))}g</dd></div>
              <div><dt>Price</dt><dd>${price}</dd></div>
              <div><dt>Status</dt><dd>${product.badge ? `${escapeHtml(product.badge)} / ` : ""}${status}</dd></div>
              <div><dt>Newsletter</dt><dd>${escapeHtml(newsletterStatus)}</dd></div>
              <div><dt>Stock</dt><dd>${product.stock_quantity}</dd></div>
              <div><dt>Images</dt><dd>${Math.min((product.product_images || []).length, MAX_IMAGE_COUNT)}</dd></div>
              <div><dt>Description</dt><dd>${description}</dd></div>
            </dl>
          </div>
        </div>
      </td>
      <td data-label="Weight">${Math.round(Number(product.weight_grams))}g</td>
      <td data-label="Price">${price}</td>
      <td data-label="Status">${product.badge ? `${escapeHtml(product.badge)} / ` : ""}${status}</td>
      <td data-label="Newsletter">${escapeHtml(newsletterStatus)}</td>
      <td data-label="Stock">${product.stock_quantity}</td>
      <td data-label="Images">${Math.min((product.product_images || []).length, MAX_IMAGE_COUNT)}</td>
      <td data-label="Actions" class="table-actions">
        <button type="button" data-action="edit" data-id="${product.id}">Edit</button>
        <button type="button" data-action="toggle" data-id="${product.id}" data-next-published="${nextPublished}" data-name="${escapeAttribute(product.name)}">${action}</button>
        <button type="button" data-action="delete" data-id="${product.id}" data-name="${escapeAttribute(product.name)}">Delete</button>
      </td>
    </tr>
  `;
}

async function loadProducts() {
  if (productsLoading) return;
  productsLoading = true;

  try {
    if (!localStorage.getItem("shkeeno-admin-key")) {
      renderProducts([]);
      setStatus("Open Access in admin and save the key first.", "bad");
      renderCategoryOptions(currentCategories[0]?.slug || "pocket");
      return;
    }
    setStatus("Loading catalogue...");
    const productData = await api("/api/catalog/products");
    await loadCategories();
    await loadTags();
    renderProducts(productData.products || []);
    setStatus("Catalogue loaded.", "good");
  } catch (error) {
    renderProducts([]);
    setStatus(error.message, "bad");
  } finally {
    productsLoading = false;
  }
}

async function handleFetchSubmit(event) {
  event.preventDefault();
  try {
    setStatus("Fetching product page...");
    const url = formValue(fetchForm, "source_url");
    const data = await api("/api/catalog/fetch", {
      method: "POST",
      body: JSON.stringify({ url }),
    });

    clearFetchedState();
    productForm.elements.namedItem("supplier_url").value = data.source_url || url;
    productForm.elements.namedItem("name").value = data.title || "";
    productForm.elements.namedItem("brand").value = data.brand || "";
    productForm.elements.namedItem("short_description").value = data.description || "";
    productForm.elements.namedItem("weight_grams").value = data.weight_grams || "";
    productForm.elements.namedItem("price_gbp").value = data.price_gbp || "";
    renderImageInputs((data.images || []).map((image) => ({ url: image })));
    markFetchedField("name", Boolean(data.title));
    markFetchedField("brand", Boolean(data.brand));
    markFetchedField("short_description", Boolean(data.description));
    markFetchedField("weight_grams", Boolean(data.weight_grams));
    markFetchedField("price_gbp", Boolean(data.price_gbp));
    setStatus("Draft fetched. Review before saving.", "good");
  } catch (error) {
    setStatus(error.message, "bad");
  }
}

async function handleProductSubmit(event) {
  event.preventDefault();
  try {
    const hasLocalUploads = imageEntries.some((entry) => entry.file);
    setStatus(hasLocalUploads ? "Uploading images and saving draft..." : "Saving draft...");
    const body = Object.fromEntries(new FormData(productForm).entries());
    body.is_published = productForm.elements.namedItem("is_published").checked;
    body.is_featured = productForm.elements.namedItem("is_featured").checked;
    body.include_in_newsletter = productForm.elements.namedItem("include_in_newsletter").checked;
    const orderedImageUrls = [];

    for (const entry of imageEntries.slice(0, MAX_IMAGE_COUNT)) {
      if (entry.file) {
        orderedImageUrls.push(await uploadImage(entry.file));
      } else if (entry.url.trim()) {
        orderedImageUrls.push(entry.url.trim());
      }
    }

    body.images = orderedImageUrls;
    const wasEditing = Boolean(editingProductId);
    const savedProductId = editingProductId;

    await api(editingProductId ? `/api/catalog/products/${editingProductId}` : "/api/catalog/products", {
      method: editingProductId ? "PUT" : "POST",
      body: JSON.stringify(body),
    });

    await loadProducts();
    if (pendingAfterSave) {
      const followUp = pendingAfterSave;
      pendingAfterSave = null;
      editingProductId = null;
      resetProductEditor();
      rememberSnapshot();
      followUp();
    } else if (wasEditing) {
      const refreshedProduct = currentProducts.find((item) => item.id === savedProductId);
      if (refreshedProduct) {
        populateProductForm(refreshedProduct);
      } else {
        editingProductId = null;
        resetProductEditor();
        rememberSnapshot();
      }
    } else {
      editingProductId = null;
      resetProductEditor();
      rememberSnapshot();
    }
    showToast(wasEditing ? "Product updated." : "Product added.");
    setStatus("Product saved.", "good");
  } catch (error) {
    pendingAfterSave = null;
    showToast(error.message, "bad");
    setStatus(error.message, "bad");
  }
}

function handleProductTableClick(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const action = button.dataset.action;
  const name = button.dataset.name || "this product";

  if (action === "edit") {
    const product = currentProducts.find((item) => item.id === button.dataset.id);
    if (!product) {
      setStatus("Could not find product to edit.", "bad");
      return;
    }
    attemptEditorExit(() => {
      populateProductForm(product);
      setStatus(`Editing ${product.name}.`, "good");
      productForm?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return;
  }

  pendingAction = {
    action,
    id: button.dataset.id,
    name,
    nextPublished: button.dataset.nextPublished === "true",
  };

  openConfirmDialog(pendingAction);
}

function handleAddImageClick() {
  if (imageEntries.length >= MAX_IMAGE_COUNT) {
    setStatus("A product can have at most 6 images.", "bad");
    return;
  }
  renderImageInputs([...imageEntries, { url: "" }]);
}

function renderImageInputs(images) {
  if (!imageList) return;
  imageEntries = images
    .slice(0, MAX_IMAGE_COUNT)
    .map((image) => typeof image === "string" ? { url: image, alt: "", existing: true } : {
      url: image.url || "",
      alt: image.alt || "",
      previewUrl: image.previewUrl || "",
      file: image.file || null,
      name: image.name || "",
      existing: image.existing !== false,
    });

  imageList.innerHTML = imageEntries
    .map(
      (image, index) => `
        <article class="image-entry-card">
          <div class="image-entry-preview ${image.url || image.previewUrl ? "has-image" : ""}" ${(image.url || image.previewUrl) ? `style="--product-image: url('${escapeAttribute(image.url || image.previewUrl)}')"` : ""}>
            <span>${index === 0 ? "Hero" : `Image ${index + 1}`}</span>
          </div>
          <div class="image-entry-meta">
            <label class="setting-row">
              <span>Image URL ${index + 1}</span>
              <input type="url" value="${escapeAttribute(image.url)}" data-image-url data-index="${index}" placeholder="https://..." ${image.file ? "disabled" : ""} />
            </label>
            <div class="image-entry-actions">
              <label class="image-hero-toggle">
                <input type="radio" name="hero_image" data-image-hero value="${index}" ${index === 0 ? "checked" : ""} />
                <span>Hero image</span>
              </label>
              ${image.file ? `<span>${escapeHtml(image.name || "Uploaded image")}</span>` : ""}
              <button type="button" data-remove-image="${index}">Remove</button>
            </div>
          </div>
        </article>
      `,
    )
    .join("");
}

async function handleImageFilesChange() {
  const selectedFiles = Array.from(imageFilesInput.files || []);
  const existingCount = imageEntries.length;

  if (existingCount + selectedFiles.length > MAX_IMAGE_COUNT) {
    setStatus(`A product can have at most ${MAX_IMAGE_COUNT} images.`, "bad");
    imageFilesInput.value = "";
    return;
  }

  try {
    setStatus("Optimizing selected images...");

    for (const file of selectedFiles) {
      if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
        throw new Error("Use JPG, PNG, WebP, or AVIF images.");
      }

      if (file.size > MAX_SOURCE_IMAGE_SIZE) {
        throw new Error("Image must be 5MB or smaller.");
      }

      const optimizedFile = await optimizeImage(file);
      imageEntries.push({
        url: "",
        alt: "",
        name: file.name,
        previewUrl: URL.createObjectURL(optimizedFile),
        file: optimizedFile,
      });
    }

    imageFilesInput.value = "";
    renderImageInputs(imageEntries);
    setStatus("Images optimized. Save product to upload.", "good");
  } catch (error) {
    setStatus(error.message, "bad");
  }
}

function handleImageListInput(event) {
  const input = event.target.closest("[data-image-url]");
  if (!input) return;

  const index = Number(input.dataset.index);
  if (!Number.isInteger(index) || !imageEntries[index]) return;

  imageEntries[index].url = input.value.trim();
  const card = input.closest(".image-entry-card");
  const preview = card?.querySelector(".image-entry-preview");
  if (!preview) return;

  preview.classList.toggle("has-image", Boolean(imageEntries[index].url));
  if (imageEntries[index].url) {
    preview.style.setProperty("--product-image", `url('${imageEntries[index].url.replace(/'/g, "\\'")}')`);
  } else {
    preview.style.removeProperty("--product-image");
  }
}

function handleImageListChange(event) {
  const hero = event.target.closest("[data-image-hero]");
  if (hero) {
    const index = Number(hero.value);
    if (Number.isInteger(index) && imageEntries[index]) {
      const [selected] = imageEntries.splice(index, 1);
      imageEntries.unshift(selected);
      renderImageInputs(imageEntries);
    }
    return;
  }

  const input = event.target.closest("[data-image-url]");
  if (!input) return;

  const index = Number(input.dataset.index);
  if (!Number.isInteger(index) || !imageEntries[index]) return;
  imageEntries[index].url = input.value.trim();
  renderImageInputs(imageEntries);
}

function handleImageListClick(event) {
  const button = event.target.closest("[data-remove-image]");
  if (!button) return;

  const index = Number(button.dataset.removeImage);
  if (!Number.isInteger(index)) return;

  if (imageEntries[index]?.previewUrl) {
    URL.revokeObjectURL(imageEntries[index].previewUrl);
  }
  imageEntries.splice(index, 1);
  renderImageInputs(imageEntries);
}

function handleTagPickerClick(event) {
  const button = event.target.closest("[data-tag-option]");
  if (!button) return;

  const slug = button.dataset.tagOption;
  if (!slug) return;

  if (selectedTags.includes(slug)) {
    selectedTags = selectedTags.filter((item) => item !== slug);
  } else {
    selectedTags = [...selectedTags, slug];
  }

  syncTagInput();
  renderTagPicker();
}

function populateProductForm(product) {
  editingProductId = product.id;
  clearFetchedState();
  releaseLocalImagePreviews();
  setValue("supplier_url", product.supplier_url || "");
  setValue("name", product.name || "");
  setValue("slug", product.slug || "");
  setValue("brand", product.brand || "");
  setValue("origin_country", product.origin_country || "");
  setValue("category", product.category || "pocket");
  renderCategoryOptions(product.category || "pocket");
  setValue("weight_grams", Math.round(Number(product.weight_grams)));
  setValue("price_gbp", product.price_gbp || "");
  setValue("compare_at_price_gbp", product.compare_at_price_gbp || "");
  setValue("stock_quantity", product.stock_quantity || 0);
  setValue("badge", product.badge || "");
  setValue("short_description", product.short_description || "");
  setValue("editorial_description", product.editorial_description || "");
  selectedTags = Array.isArray(product.tags) ? [...product.tags] : [];
  syncTagInput();
  renderTagPicker();
  setValue("materials", (product.materials || []).join(", "));
  productForm.elements.namedItem("is_published").checked = Boolean(product.is_published);
  productForm.elements.namedItem("is_featured").checked = Boolean(product.is_featured);
  productForm.elements.namedItem("include_in_newsletter").checked = Boolean(product.include_in_newsletter);
  renderImageInputs((product.product_images || []).sort((a, b) => a.sort_order - b.sort_order).map((image) => ({
    url: image.url,
    alt: image.alt || "",
    previewUrl: "",
    file: null,
    name: "",
    existing: true,
  })));
  clearPendingUploads();
  updateFormMode(product.name);
  rememberSnapshot();
}

function setValue(name, value) {
  const field = productForm?.elements.namedItem(name);
  if (field) field.value = value;
}

function updateFormMode(name = "") {
  if (formModeNode) {
    formModeNode.textContent = editingProductId ? `Editing / ${name}` : "New product";
  }
  if (formSubmitButton) {
    formSubmitButton.textContent = editingProductId ? "Save changes" : "Save product";
  }
  if (cancelEditButton) {
    cancelEditButton.hidden = !editingProductId;
  }
  if (formSummaryNode) {
    formSummaryNode.textContent = editingProductId
      ? "You are editing a saved product. Update copy, reorder images, choose the hero image, then save changes."
      : "Save drafts freely. List only when copy, weight, price, stock, and at least one image are ready.";
  }
}

async function optimizeImage(file) {
  const bitmap = await createImageBitmap(file);
  const maxDimension = 1600;
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { alpha: false });
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  const blob = await new Promise((resolve) => {
    canvas.toBlob(resolve, "image/webp", 0.82);
  });

  if (!blob) throw new Error("Could not optimize image.");

  return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.webp`, {
    type: "image/webp",
  });
}

function clearPendingUploads() {
  if (imageFilesInput) imageFilesInput.value = "";
  if (uploadPreview) uploadPreview.innerHTML = "";
}

function resetProductEditor() {
  editingProductId = null;
  clearFetchedState();
  productForm?.reset();
  fetchForm?.reset();
  selectedTags = [];
  syncTagInput();
  renderTagPicker();
  releaseLocalImagePreviews();
  renderImageInputs([]);
  clearPendingUploads();
  renderCategoryOptions(currentCategories[0]?.slug || "pocket");
  updateFormMode();
  rememberSnapshot();
}

function serializeEditorState() {
  if (!productForm) return "";

  const data = Object.fromEntries(new FormData(productForm).entries());
  data.is_published = productForm.elements.namedItem("is_published")?.checked || false;
  data.is_featured = productForm.elements.namedItem("is_featured")?.checked || false;
  data.include_in_newsletter = productForm.elements.namedItem("include_in_newsletter")?.checked || false;

  return JSON.stringify({
    editingProductId,
    data,
    images: imageEntries.map((entry) => ({
      url: entry.url || "",
      fileName: entry.file?.name || "",
      localName: entry.name || "",
    })),
  });
}

function rememberSnapshot() {
  lastSavedSnapshot = serializeEditorState();
}

function isEditorDirty() {
  if (!editingProductId && !hasMeaningfulEditorContent()) return false;
  return serializeEditorState() !== lastSavedSnapshot;
}

function hasMeaningfulEditorContent() {
  if (!productForm) return false;

  const fields = ["name", "slug", "brand", "origin_country", "short_description", "editorial_description", "tags", "materials", "supplier_url", "price_gbp", "compare_at_price_gbp", "weight_grams", "stock_quantity"];
  const hasText = fields.some((name) => formValue(productForm, name) !== "");
  const category = formValue(productForm, "category");
  const badge = formValue(productForm, "badge");
  const published = productForm.elements.namedItem("is_published")?.checked;
  const featured = productForm.elements.namedItem("is_featured")?.checked;
  const newsletter = productForm.elements.namedItem("include_in_newsletter")?.checked;

  return hasText || imageEntries.length > 0 || badge !== "" || published || featured || newsletter || (category !== "" && category !== (currentCategories[0]?.slug || "pocket"));
}

function attemptEditorExit(onDiscard) {
  if (!isEditorDirty()) {
    onDiscard();
    return;
  }

  openDirtyDialog(onDiscard);
}

function openDirtyDialog(onDiscard) {
  document.querySelector("[data-confirm-dialog]")?.remove();

  document.body.insertAdjacentHTML(
    "beforeend",
    `
      <div class="confirm-backdrop" data-confirm-dialog>
        <section class="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="dirty-title">
          <p class="eyebrow">Unsaved changes</p>
          <h2 id="dirty-title">Leave the editor?</h2>
          <p>Save this draft first, discard your changes, or keep editing.</p>
          <div class="confirm-actions confirm-actions-wide">
            <button type="button" data-dirty-cancel>Keep editing</button>
            <button type="button" data-dirty-discard>Discard</button>
            <button type="button" data-dirty-save>Save draft</button>
          </div>
        </section>
      </div>
    `,
  );

  pendingAction = {
    action: "dirty-exit",
    onDiscard,
  };
}

function releaseLocalImagePreviews() {
  imageEntries.forEach((item) => {
    if (item.file && item.previewUrl) URL.revokeObjectURL(item.previewUrl);
  });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
  });
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}

function formatDate(value) {
  try {
    return new Date(value).toLocaleDateString("en-GB", { dateStyle: "medium" });
  } catch {
    return "recently";
  }
}

let catalogAdminBound = false;

function bindCatalogAdminEvents() {
  if (!productForm || !productTable) return;

  if (fetchForm && !fetchForm.dataset.bound) {
    fetchForm.addEventListener("submit", handleFetchSubmit);
    fetchForm.dataset.bound = "true";
  }
  if (!productForm.dataset.bound) {
    productForm.addEventListener("submit", handleProductSubmit);
    productForm.dataset.bound = "true";
  }
  if (!productTable.dataset.bound) {
    productTable.addEventListener("click", handleProductTableClick);
    productTable.dataset.bound = "true";
  }

  const addImageButton = document.querySelector("[data-add-image]");
  if (addImageButton && !addImageButton.dataset.bound) {
    addImageButton.addEventListener("click", handleAddImageClick);
    addImageButton.dataset.bound = "true";
  }
  if (imageFilesInput && !imageFilesInput.dataset.bound) {
    imageFilesInput.addEventListener("change", handleImageFilesChange);
    imageFilesInput.dataset.bound = "true";
  }
  if (imageList && !imageList.dataset.bound) {
    imageList.addEventListener("input", handleImageListInput);
    imageList.addEventListener("change", handleImageListChange);
    imageList.addEventListener("click", handleImageListClick);
    imageList.dataset.bound = "true";
  }
  if (tagPickerList && !tagPickerList.dataset.bound) {
    tagPickerList.addEventListener("click", handleTagPickerClick);
    tagPickerList.dataset.bound = "true";
  }

  const startBlankButton = document.querySelector("[data-start-blank]");
  if (startBlankButton && !startBlankButton.dataset.bound) {
    startBlankButton.addEventListener("click", () => {
      attemptEditorExit(() => {
        resetProductEditor();
        setStatus("Blank draft ready.", "good");
        productForm?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
    startBlankButton.dataset.bound = "true";
  }
  if (cancelEditButton && !cancelEditButton.dataset.bound) {
    cancelEditButton.addEventListener("click", () => {
      attemptEditorExit(() => {
        resetProductEditor();
        setStatus("Returned to a new blank draft.", "good");
      });
    });
    cancelEditButton.dataset.bound = "true";
  }
  if (editorBackButton && !editorBackButton.dataset.bound) {
    editorBackButton.addEventListener("click", () => {
      attemptEditorExit(() => {
        resetProductEditor();
        setStatus("Returned to catalogue.", "good");
        document.querySelector("#product-table")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
    editorBackButton.dataset.bound = "true";
  }
}

function initCatalogAdmin() {
  bindCatalogAdminNodes();
  if (!productTable || !productForm) return;

  updateFormMode();
  renderCategoryOptions("pocket");
  renderTagPicker();
  rememberSnapshot();

  if (!catalogAdminBound) catalogAdminBound = true;
  bindCatalogAdminEvents();

  if (localStorage.getItem("shkeeno-admin-key")) {
    loadProducts();
  } else {
    renderProducts([]);
    setStatus("Open Access in admin and save the key first.", "bad");
  }
}

function openConfirmDialog(action) {
  const existing = document.querySelector("[data-confirm-dialog]");
  existing?.remove();

  const verb = action.action === "delete"
    ? "Delete"
    : action.nextPublished
      ? "List"
      : "Unlist";
  const detail = action.action === "delete"
    ? "This cannot be undone."
    : action.nextPublished
      ? "This product will appear in the public shop as soon as the catalogue refreshes."
      : "This product will be removed from the public shop as soon as the catalogue refreshes.";

  document.body.insertAdjacentHTML(
    "beforeend",
    `
      <div class="confirm-backdrop" data-confirm-dialog>
        <section class="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
          <p class="eyebrow">Confirm action</p>
          <h2 id="confirm-title">${verb} ${escapeHtml(action.name)}?</h2>
          <p>${detail}</p>
          <p class="confirm-error" data-confirm-error hidden></p>
          <div class="confirm-actions">
            <button type="button" data-confirm-cancel>Cancel</button>
            <button type="button" data-confirm-accept>${verb}</button>
          </div>
        </section>
      </div>
    `,
  );
}

document.addEventListener("click", async (event) => {
  if (event.target.closest("[data-confirm-cancel]")) {
    document.querySelector("[data-confirm-dialog]")?.remove();
    pendingAction = null;
    return;
  }

  if (event.target.closest("[data-dirty-cancel]")) {
    document.querySelector("[data-confirm-dialog]")?.remove();
    pendingAction = null;
    return;
  }

  if (event.target.closest("[data-dirty-discard]")) {
    const action = pendingAction;
    document.querySelector("[data-confirm-dialog]")?.remove();
    pendingAction = null;
    action?.onDiscard?.();
    return;
  }

  if (event.target.closest("[data-dirty-save]")) {
    document.querySelector("[data-confirm-dialog]")?.remove();
    const action = pendingAction;
    pendingAction = null;
    pendingAfterSave = action?.onDiscard || null;
    formSubmitButton?.click();
    return;
  }

  if (!event.target.closest("[data-confirm-accept]") || !pendingAction) return;

  const action = pendingAction;
  const button = event.target.closest("[data-confirm-accept]");
  const errorNode = document.querySelector("[data-confirm-error]");

  try {
    button.disabled = true;
    if (errorNode) {
      errorNode.hidden = true;
      errorNode.textContent = "";
    }

    if (action.action === "toggle") {
      setStatus(action.nextPublished ? "Listing product..." : "Unlisting product...");
      await api(`/api/catalog/products/${action.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_published: action.nextPublished }),
      });
    }

    if (action.action === "delete") {
      setStatus("Deleting product...");
      await api(`/api/catalog/products/${action.id}`, { method: "DELETE" });
    }

    document.querySelector("[data-confirm-dialog]")?.remove();
    pendingAction = null;
    await loadProducts();
    setStatus("Catalogue updated.", "good");
    showToast(action.action === "delete"
      ? "Product deleted."
      : action.nextPublished
        ? "Product listed."
        : "Product unlisted.");
  } catch (error) {
    if (errorNode) {
      errorNode.textContent = error.message;
      errorNode.hidden = false;
    }
    setStatus("Action needs attention.", "bad");
    showToast(error.message, "bad");
    button.disabled = false;
  }
});

function formatPrice(value) {
  return Number(value || 0).toFixed(2);
}

initCatalogAdmin();
document.addEventListener("astro:page-load", initCatalogAdmin);

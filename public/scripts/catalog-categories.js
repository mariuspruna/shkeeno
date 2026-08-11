let currentCategories = [];
let editingSlug = null;
let slugTouched = false;

function getCategoryNodes() {
  const formNode = document.querySelector("[data-category-form]");
  return {
    statusNode: document.querySelector("[data-category-status]"),
    tableNode: document.querySelector("[data-categories-table]"),
    formNode,
    modeNode: document.querySelector("[data-category-form-mode]"),
    submitNode: document.querySelector("[data-category-submit]"),
    cancelNode: document.querySelector("[data-category-cancel]"),
    nameInput: formNode?.elements.namedItem("name"),
    slugInput: formNode?.elements.namedItem("slug"),
  };
}

function setStatus(message, tone = "neutral") {
  const { statusNode } = getCategoryNodes();
  if (!statusNode) return;
  statusNode.textContent = message;
  statusNode.dataset.tone = tone;
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

function setValue(name, value) {
  const { formNode } = getCategoryNodes();
  const field = formNode?.elements.namedItem(name);
  if (field) field.value = value;
}

function renderCategories(categories) {
  const { tableNode } = getCategoryNodes();
  if (!tableNode) return;

  if (categories.length === 0) {
    tableNode.innerHTML = localStorage.getItem("shkeeno-admin-key")
      ? '<p class="empty-copy">No categories yet.</p>'
      : '<p class="empty-copy">Save the admin key in Access, then return here.</p>';
    return;
  }

  tableNode.innerHTML = `
    <table class="catalog-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Slug</th>
          <th>Status</th>
          <th>Order</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${categories.map((category) => `
          <tr>
            <td data-label="Category">
              <strong>${escapeHtml(category.name)}</strong>
              <span>${escapeHtml(category.description || "No description")}</span>
              <dl class="catalog-mobile-details">
                <div><dt>Slug</dt><dd>${escapeHtml(category.slug)}</dd></div>
                <div><dt>Status</dt><dd>${category.is_active === false ? "Hidden" : "Active"}</dd></div>
                <div><dt>Order</dt><dd>${category.sort_order ?? 0}</dd></div>
              </dl>
            </td>
            <td data-label="Slug">${escapeHtml(category.slug)}</td>
            <td data-label="Status">${category.is_active === false ? "Hidden" : "Active"}</td>
            <td data-label="Order">${category.sort_order ?? 0}</td>
            <td data-label="Actions" class="table-actions">
              <button type="button" data-action="edit" data-slug="${escapeAttribute(category.slug)}">Edit</button>
              <button type="button" data-action="delete" data-slug="${escapeAttribute(category.slug)}">Delete</button>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

async function loadCategories() {
  try {
    if (!localStorage.getItem("shkeeno-admin-key")) {
      renderCategories([]);
      setStatus("Open Access in admin and save the key first.", "bad");
      return;
    }
    setStatus("Loading categories...");
    const data = await api("/api/catalog/categories");
    currentCategories = data.categories || [];
    renderCategories(currentCategories);
    setStatus("Categories loaded.", "good");
  } catch (error) {
    currentCategories = [];
    renderCategories([]);
    setStatus(error.message, "bad");
  }
}

function updateFormMode(name = "") {
  const { modeNode, submitNode, cancelNode } = getCategoryNodes();
  if (modeNode) modeNode.textContent = editingSlug ? `Editing / ${name}` : "New category";
  if (submitNode) submitNode.textContent = editingSlug ? "Save changes" : "Save category";
  if (cancelNode) cancelNode.hidden = !editingSlug;
}

function resetForm() {
  const { formNode } = getCategoryNodes();
  editingSlug = null;
  slugTouched = false;
  formNode?.reset();
  setValue("sort_order", 0);
  setValue("is_active", "true");
  updateFormMode();
}

function initCategoriesPage() {
  if (!document.querySelector("[data-category-form]")) return;
  resetForm();
  if (localStorage.getItem("shkeeno-admin-key")) {
    loadCategories();
  }
}

document.addEventListener("submit", async (event) => {
  const formNode = event.target.closest("[data-category-form]");
  if (!formNode) return;
  event.preventDefault();

  try {
    setStatus(editingSlug ? "Saving category..." : "Creating category...");
    const body = Object.fromEntries(new FormData(formNode).entries());
    body.is_active = body.is_active === "true";

    await api(editingSlug ? `/api/catalog/categories/${editingSlug}` : "/api/catalog/categories", {
      method: editingSlug ? "PUT" : "POST",
      body: JSON.stringify(body),
    });

    resetForm();
    await loadCategories();
    setStatus("Category saved.", "good");
  } catch (error) {
    setStatus(error.message, "bad");
  }
});

document.addEventListener("click", async (event) => {
  if (event.target.closest("[data-category-cancel]")) {
    resetForm();
    setStatus("Returned to a new category.", "good");
    return;
  }

  const button = event.target.closest("[data-categories-table] button[data-action]");
  if (!button) return;

  const slug = button.dataset.slug;
  if (!slug) return;

  if (button.dataset.action === "edit") {
    const category = currentCategories.find((item) => item.slug === slug);
    const { formNode } = getCategoryNodes();
    if (!category || !formNode) return;
    editingSlug = category.slug;
    slugTouched = true;
    setValue("name", category.name || "");
    setValue("slug", category.slug || "");
    setValue("description", category.description || "");
    setValue("sort_order", category.sort_order ?? 0);
    setValue("is_active", String(category.is_active !== false));
    updateFormMode(category.name);
    formNode.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  if (button.dataset.action === "delete") {
    const confirmed = window.confirm(`Delete ${slug}?`);
    if (!confirmed) return;

    try {
      setStatus("Deleting category...");
      await api(`/api/catalog/categories/${slug}`, { method: "DELETE" });
      await loadCategories();
      setStatus("Category deleted.", "good");
    } catch (error) {
      setStatus(error.message, "bad");
    }
  }
});

document.addEventListener("input", (event) => {
  const { nameInput, slugInput } = getCategoryNodes();
  if (event.target === nameInput) {
    if (slugTouched) return;
    setValue("slug", slugify(nameInput.value));
    return;
  }

  if (event.target === slugInput) {
    slugTouched = Boolean(slugInput.value.trim());
  }
});

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
  });
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

document.addEventListener("astro:page-load", initCategoriesPage);

initCategoriesPage();

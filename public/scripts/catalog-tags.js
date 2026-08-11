let currentTags = [];
let editingSlug = null;
let slugTouched = false;

function getTagNodes() {
  const formNode = document.querySelector("[data-tag-form]");
  return {
    statusNode: document.querySelector("[data-tag-status]"),
    tableNode: document.querySelector("[data-tags-table]"),
    formNode,
    modeNode: document.querySelector("[data-tag-form-mode]"),
    submitNode: document.querySelector("[data-tag-submit]"),
    cancelNode: document.querySelector("[data-tag-cancel]"),
    nameInput: formNode?.elements.namedItem("name"),
    slugInput: formNode?.elements.namedItem("slug"),
  };
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

function setStatus(message, tone = "neutral") {
  const { statusNode } = getTagNodes();
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
  const { formNode } = getTagNodes();
  const field = formNode?.elements.namedItem(name);
  if (field) field.value = value;
}

function renderTags(tags) {
  const { tableNode } = getTagNodes();
  if (!tableNode) return;

  if (tags.length === 0) {
    tableNode.innerHTML = localStorage.getItem("shkeeno-admin-key")
      ? '<p class="empty-copy">No tags yet.</p>'
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
        ${tags.map((tag) => `
          <tr>
            <td data-label="Tag">
              <strong>${escapeHtml(tag.name)}</strong>
              <span>${escapeHtml(tag.description || "No description")}</span>
              <dl class="catalog-mobile-details">
                <div><dt>Slug</dt><dd>${escapeHtml(tag.slug)}</dd></div>
                <div><dt>Status</dt><dd>${tag.is_active === false ? "Hidden" : "Active"}</dd></div>
                <div><dt>Order</dt><dd>${tag.sort_order ?? 0}</dd></div>
              </dl>
            </td>
            <td data-label="Slug">${escapeHtml(tag.slug)}</td>
            <td data-label="Status">${tag.is_active === false ? "Hidden" : "Active"}</td>
            <td data-label="Order">${tag.sort_order ?? 0}</td>
            <td data-label="Actions" class="table-actions">
              <button type="button" data-action="edit" data-slug="${escapeAttribute(tag.slug)}">Edit</button>
              <button type="button" data-action="delete" data-slug="${escapeAttribute(tag.slug)}">Delete</button>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

async function loadTags() {
  try {
    if (!localStorage.getItem("shkeeno-admin-key")) {
      renderTags([]);
      setStatus("Open Access in admin and save the key first.", "bad");
      return;
    }
    setStatus("Loading tags...");
    const data = await api("/api/catalog/tags");
    currentTags = data.tags || [];
    renderTags(currentTags);
    setStatus("Tags loaded.", "good");
  } catch (error) {
    currentTags = [];
    renderTags([]);
    setStatus(error.message, "bad");
  }
}

function updateFormMode(name = "") {
  const { modeNode, submitNode, cancelNode } = getTagNodes();
  if (modeNode) modeNode.textContent = editingSlug ? `Editing / ${name}` : "New tag";
  if (submitNode) submitNode.textContent = editingSlug ? "Save changes" : "Save tag";
  if (cancelNode) cancelNode.hidden = !editingSlug;
}

function resetForm() {
  const { formNode } = getTagNodes();
  editingSlug = null;
  slugTouched = false;
  formNode?.reset();
  setValue("sort_order", 0);
  setValue("is_active", "true");
  updateFormMode();
}

function initTagsPage() {
  if (!document.querySelector("[data-tag-form]")) return;
  resetForm();
  if (localStorage.getItem("shkeeno-admin-key")) {
    loadTags();
  }
}

document.addEventListener("submit", async (event) => {
  const formNode = event.target.closest("[data-tag-form]");
  if (!formNode) return;
  event.preventDefault();

  try {
    const wasEditing = Boolean(editingSlug);
    setStatus(editingSlug ? "Saving tag..." : "Creating tag...");
    const body = Object.fromEntries(new FormData(formNode).entries());
    body.is_active = body.is_active === "true";

    await api(editingSlug ? `/api/catalog/tags/${editingSlug}` : "/api/catalog/tags", {
      method: editingSlug ? "PUT" : "POST",
      body: JSON.stringify(body),
    });

    resetForm();
    await loadTags();
    setStatus("Tag saved.", "good");
    showToast(wasEditing ? "Tag updated." : "Tag saved.");
  } catch (error) {
    setStatus(error.message, "bad");
    showToast(error.message, "bad");
  }
});

document.addEventListener("click", async (event) => {
  if (event.target.closest("[data-tag-cancel]")) {
    resetForm();
    setStatus("Returned to a new tag.", "good");
    return;
  }

  const button = event.target.closest("[data-tags-table] button[data-action]");
  if (!button) return;

  const slug = button.dataset.slug;
  if (!slug) return;

  if (button.dataset.action === "edit") {
    const tag = currentTags.find((item) => item.slug === slug);
    const { formNode } = getTagNodes();
    if (!tag || !formNode) return;
    editingSlug = tag.slug;
    slugTouched = true;
    setValue("name", tag.name || "");
    setValue("slug", tag.slug || "");
    setValue("description", tag.description || "");
    setValue("sort_order", tag.sort_order ?? 0);
    setValue("is_active", String(tag.is_active !== false));
    updateFormMode(tag.name);
    formNode.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  if (button.dataset.action === "delete") {
    const confirmed = window.confirm(`Delete ${slug}?`);
    if (!confirmed) return;

    try {
      setStatus("Deleting tag...");
      await api(`/api/catalog/tags/${slug}`, { method: "DELETE" });
      await loadTags();
      setStatus("Tag deleted.", "good");
      showToast("Tag deleted.");
    } catch (error) {
      setStatus(error.message, "bad");
      showToast(error.message, "bad");
    }
  }
});

document.addEventListener("input", (event) => {
  const { nameInput, slugInput } = getTagNodes();
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

document.addEventListener("astro:page-load", initTagsPage);

initTagsPage();

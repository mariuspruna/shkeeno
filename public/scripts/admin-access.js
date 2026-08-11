function getAccessNodes() {
  return {
    statusNode: document.querySelector("[data-access-status]"),
    accessForm: document.querySelector("[data-access-form]"),
    adminKeyInput: document.querySelector("[data-admin-key]"),
    adminKeyButton: document.querySelector("[data-admin-key-submit]"),
  };
}

function setStatus(message, tone = "neutral") {
  const { statusNode } = getAccessNodes();
  if (!statusNode) return;
  statusNode.textContent = message;
  statusNode.dataset.tone = tone;
}

function updateAdminKeyState() {
  const { adminKeyInput, adminKeyButton } = getAccessNodes();
  if (!adminKeyInput || !adminKeyButton) return;
  const savedKey = localStorage.getItem("shkeeno-admin-key") || "";
  const currentKey = adminKeyInput.value.trim();
  const isSaved = Boolean(savedKey) && savedKey === currentKey;
  adminKeyButton.textContent = isSaved ? "Key saved" : "Save key";
  adminKeyButton.disabled = isSaved;
}

function initAccessPage() {
  const { adminKeyInput } = getAccessNodes();
  if (!adminKeyInput) return;
  adminKeyInput.value = localStorage.getItem("shkeeno-admin-key") || "";
  updateAdminKeyState();
}

document.addEventListener("input", (event) => {
  if (!event.target.matches("[data-admin-key]")) return;
  updateAdminKeyState();
});

document.addEventListener("submit", (event) => {
  const form = event.target.closest("[data-access-form]");
  if (!form) return;

  event.preventDefault();
  const { adminKeyInput } = getAccessNodes();
  const key = adminKeyInput?.value.trim() || "";

  if (!key) {
    setStatus("Paste the admin key first.", "bad");
    return;
  }

  localStorage.setItem("shkeeno-admin-key", key);
  updateAdminKeyState();
  setStatus("Admin key saved.", "good");
});

document.addEventListener("astro:page-load", initAccessPage);

initAccessPage();

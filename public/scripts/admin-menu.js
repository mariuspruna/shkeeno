function getAdminMenuElements() {
  return {
    toggle: document.querySelector("[data-admin-menu-toggle]"),
    menu: document.querySelector("[data-admin-mobile-menu]"),
    backdrop: document.querySelector("[data-admin-menu-backdrop]"),
    sidebar: document.querySelector(".admin-sidebar"),
  };
}

function syncAdminMenuTop() {
  const { menu, backdrop, sidebar } = getAdminMenuElements();
  if (!menu || !backdrop || !sidebar) return;
  const rect = sidebar.getBoundingClientRect();
  const top = Math.max(0, Math.round(rect.bottom));
  document.documentElement.style.setProperty("--admin-mobile-nav-top", `${top}px`);
}

function setAdminMenuOpen(isOpen) {
  const { toggle, menu, backdrop } = getAdminMenuElements();
  if (!toggle || !menu || !backdrop) return;
  syncAdminMenuTop();
  toggle.setAttribute("aria-expanded", String(isOpen));
  menu.hidden = !isOpen;
  backdrop.hidden = !isOpen;
  document.documentElement.classList.toggle("admin-menu-open", isOpen);
  document.body.classList.toggle("admin-menu-open", isOpen);
}

document.addEventListener("click", (event) => {
  const toggle = event.target.closest("[data-admin-menu-toggle]");
  if (toggle) {
    setAdminMenuOpen(toggle.getAttribute("aria-expanded") !== "true");
    return;
  }

  if (event.target.closest("[data-admin-menu-backdrop]")) {
    setAdminMenuOpen(false);
    return;
  }

  if (event.target.closest("[data-admin-mobile-menu] a")) {
    setAdminMenuOpen(false);
  }
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") setAdminMenuOpen(false);
});

window.addEventListener("resize", syncAdminMenuTop);

document.addEventListener("astro:page-load", () => {
  setAdminMenuOpen(false);
  syncAdminMenuTop();
});

syncAdminMenuTop();

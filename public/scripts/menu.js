function getMenuElements() {
  return {
    menuToggle: document.querySelector("[data-menu-toggle]"),
    mobileMenu: document.querySelector("[data-mobile-menu]"),
    menuBackdrop: document.querySelector("[data-menu-backdrop]"),
  };
}

function initPublicMenu() {
  const { menuToggle, mobileMenu, menuBackdrop } = getMenuElements();
  if (!menuToggle || !mobileMenu) return;
  menuToggle.setAttribute("aria-expanded", "false");
  mobileMenu.hidden = true;
  if (menuBackdrop) menuBackdrop.hidden = true;
  document.documentElement.classList.remove("menu-open");
  document.body.classList.remove("menu-open");
}

function setMenuOpen(isOpen) {
  const { menuToggle, mobileMenu, menuBackdrop } = getMenuElements();
  if (!menuToggle || !mobileMenu) return;
  mobileMenu.hidden = !isOpen;
  if (menuBackdrop) menuBackdrop.hidden = !isOpen;
  menuToggle.setAttribute("aria-expanded", String(isOpen));
  document.documentElement.classList.toggle("menu-open", isOpen);
  document.body.classList.toggle("menu-open", isOpen);
}

document.addEventListener("click", (event) => {
  const toggle = event.target.closest("[data-menu-toggle]");
  if (toggle) {
    setMenuOpen(toggle.getAttribute("aria-expanded") !== "true");
    return;
  }

  if (event.target.closest("[data-menu-backdrop]")) {
    setMenuOpen(false);
    return;
  }

  if (event.target.closest("[data-mobile-menu] a")) {
    setMenuOpen(false);
  }
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") setMenuOpen(false);
});

function syncHeaderCurrent() {
  const path = window.location.pathname;
  const current = path.startsWith("/shop")
    ? "/shop"
    : path.startsWith("/about")
      ? "/about"
      : path.startsWith("/contact")
        ? "/contact"
        : path.startsWith("/account")
          ? "/account"
          : path.startsWith("/cart")
            ? "/cart"
            : "";

  document.querySelectorAll(".site-header a[aria-current='page']").forEach((link) => {
    link.removeAttribute("aria-current");
  });
  if (!current) return;
  document.querySelectorAll(`.site-header a[href="${current}"]`).forEach((link) => {
    link.setAttribute("aria-current", "page");
  });
}

document.addEventListener("astro:page-load", () => {
  initPublicMenu();
  syncHeaderCurrent();
});

initPublicMenu();
syncHeaderCurrent();

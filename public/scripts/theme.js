const modeButtons = document.querySelectorAll("[data-theme-mode]");
const toggleButtons = document.querySelectorAll("[data-theme-toggle]");
const SUN_ICON = `
  <svg viewBox="0 0 24 24" role="presentation" focusable="false">
    <circle cx="12" cy="12" r="4.5" fill="none" stroke="currentColor" stroke-width="1.8"></circle>
    <path d="M12 2.75v3.1M12 18.15v3.1M21.25 12h-3.1M5.85 12H2.75M18.54 5.46l-2.19 2.19M7.65 16.35l-2.19 2.19M18.54 18.54l-2.19-2.19M7.65 7.65L5.46 5.46" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="square"></path>
  </svg>
`;
const MOON_ICON = `
  <svg viewBox="0 0 24 24" role="presentation" focusable="false">
    <path d="M15.8 2.85a8.6 8.6 0 1 0 5.35 15.38 8.95 8.95 0 0 1-2.82.45A8.7 8.7 0 0 1 9.65 9.96a8.96 8.96 0 0 1 6.15-7.11Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"></path>
  </svg>
`;
const COLOR_TOKENS = new Set([
  "--color-primary",
  "--color-secondary",
  "--color-accent",
  "--color-background",
  "--color-surface",
  "--color-line",
]);

function reapplySavedTokens(mode) {
  const saved = localStorage.getItem("shkeeno-theme-tokens");
  if (!saved) return;

  try {
    const tokens = JSON.parse(saved);
    Object.entries(tokens).forEach(([key, value]) => {
      if (mode === "dark" && COLOR_TOKENS.has(key)) {
        document.documentElement.style.removeProperty(key);
      } else {
        document.documentElement.style.setProperty(key, value);
      }
    });
  } catch {
    localStorage.removeItem("shkeeno-theme-tokens");
  }
}

function setMode(mode) {
  localStorage.setItem("shkeeno-theme-mode", mode);
  document.documentElement.dataset.theme = mode;
  reapplySavedTokens(mode);
  modeButtons.forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.themeMode === mode));
  });
  toggleButtons.forEach((button) => {
    const isDark = mode === "dark";
    button.setAttribute("aria-pressed", String(isDark));
    button.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
    button.setAttribute("title", isDark ? "Switch to light mode" : "Switch to dark mode");
    const icon = button.querySelector("[data-theme-icon]");
    if (icon) icon.innerHTML = isDark ? MOON_ICON : SUN_ICON;
  });
}

const currentMode = localStorage.getItem("shkeeno-theme-mode") || "light";
setMode(currentMode);

modeButtons.forEach((button) => {
  button.addEventListener("click", () => setMode(button.dataset.themeMode));
});

toggleButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const current = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
    setMode(current === "dark" ? "light" : "dark");
  });
});

const themeForm = document.querySelector("[data-theme-form]");

if (themeForm) {
  const resetButton = document.querySelector("[data-theme-reset]");
  const fields = Array.from(themeForm.querySelectorAll("[data-token]"));

  function syncToken(name, value) {
    const mode = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
    if (mode === "dark" && COLOR_TOKENS.has(name)) {
      document.documentElement.style.removeProperty(name);
    } else {
      document.documentElement.style.setProperty(name, value);
    }
    fields
      .filter((field) => field.dataset.token === name)
      .forEach((field) => {
        if (field.value !== value) field.value = value;
      });
  }

  function persist() {
    const tokens = {};
    fields.forEach((field) => {
      tokens[field.dataset.token] = field.value;
    });
    localStorage.setItem("shkeeno-theme-tokens", JSON.stringify(tokens));
  }

  fields.forEach((field) => {
    field.addEventListener("input", () => {
      syncToken(field.dataset.token, field.value);
      persist();
    });
  });

  resetButton?.addEventListener("click", () => {
    localStorage.removeItem("shkeeno-theme-tokens");
    window.location.reload();
  });
}

const BRAND_KEY = "shkeeno-brand-svg";
const BRAND_SETTINGS_KEY = "shkeeno-brand-settings";

const DEFAULT_BRAND_SETTINGS = {
  name: "Shkeeno",
  wordmark: "SHKEENO",
  domain: "shkeeno.com",
  svg: "",
  displayFont: "Peace Sans, Arial Black, sans-serif",
  displayLetterSpacing: "0",
  bodyFont: "\"Space Grotesk\", Helvetica, Arial, sans-serif",
};

let currentBrandSettings = { ...DEFAULT_BRAND_SETTINGS };
let saveTimer = null;
let hasPendingBrandSettingsEdit = false;
let brandSettingsEditVersion = 0;

function setBrandStatus(message, tone = "neutral", visible = true) {
  const brandStatus = document.querySelector("[data-brand-status]");
  if (!brandStatus) return;
  brandStatus.hidden = !visible;
  brandStatus.textContent = message;
  brandStatus.dataset.tone = tone;
}

function getLocalBrandSettings() {
  const raw = localStorage.getItem(BRAND_SETTINGS_KEY);
  if (!raw) return { ...DEFAULT_BRAND_SETTINGS };

  try {
    const parsed = JSON.parse(raw);
    return {
      name: parsed.name || DEFAULT_BRAND_SETTINGS.name,
      wordmark: parsed.wordmark || DEFAULT_BRAND_SETTINGS.wordmark,
      domain: parsed.domain || DEFAULT_BRAND_SETTINGS.domain,
      svg: parsed.svg || "",
      displayFont: parsed.displayFont || DEFAULT_BRAND_SETTINGS.displayFont,
      displayLetterSpacing: normaliseDisplayLetterSpacing(parsed.displayLetterSpacing),
      bodyFont: parsed.bodyFont || DEFAULT_BRAND_SETTINGS.bodyFont,
    };
  } catch {
    localStorage.removeItem(BRAND_SETTINGS_KEY);
    return { ...DEFAULT_BRAND_SETTINGS };
  }
}

function persistLocalBrandSettings(settings = currentBrandSettings) {
  localStorage.setItem(BRAND_SETTINGS_KEY, JSON.stringify(settings));
  if (settings.svg) {
    localStorage.setItem(BRAND_KEY, settings.svg);
  } else {
    localStorage.removeItem(BRAND_KEY);
  }
}

function normaliseDisplayLetterSpacing(value) {
  const number = Number(value || 0);
  if (!Number.isInteger(number) || number > 0 || number < -30 || number % 5 !== 0) return "0";
  return String(number);
}

function displayLetterSpacingToCss(value) {
  return `${Number(normaliseDisplayLetterSpacing(value)) / 100}em`;
}

function escapeAttribute(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
  });
}

function normaliseBrandSvg(svgMarkup = "") {
  const raw = String(svgMarkup || "").trim();
  if (!raw || !raw.includes("<svg")) return "";

  try {
    const parser = new DOMParser();
    const documentNode = parser.parseFromString(raw, "image/svg+xml");
    const svg = documentNode.querySelector("svg");
    if (!svg) return raw;

    svg.querySelectorAll("*").forEach((node) => {
      if (node.hasAttribute("fill") && node.getAttribute("fill") !== "none") {
        node.setAttribute("fill", "currentColor");
      }

      if (node.hasAttribute("stroke") && node.getAttribute("stroke") !== "none") {
        node.setAttribute("stroke", "currentColor");
      }

      const style = node.getAttribute("style");
      if (style) {
        const cleaned = style
          .replace(/fill\s*:\s*[^;]+;?/gi, "")
          .replace(/stroke\s*:\s*[^;]+;?/gi, "")
          .trim()
          .replace(/;;+/g, ";")
          .replace(/^;|;$/g, "");

        if (cleaned) {
          node.setAttribute("style", cleaned);
        } else {
          node.removeAttribute("style");
        }
      }
    });

    svg.removeAttribute("fill");
    svg.removeAttribute("stroke");

    return new XMLSerializer().serializeToString(svg);
  } catch {
    return raw;
  }
}

function applyBrandSettings(settings = DEFAULT_BRAND_SETTINGS) {
  currentBrandSettings = {
    name: settings.name || DEFAULT_BRAND_SETTINGS.name,
    wordmark: settings.wordmark || DEFAULT_BRAND_SETTINGS.wordmark,
    domain: settings.domain || DEFAULT_BRAND_SETTINGS.domain,
    svg: settings.svg || "",
    displayFont: settings.displayFont || DEFAULT_BRAND_SETTINGS.displayFont,
    displayLetterSpacing: normaliseDisplayLetterSpacing(settings.displayLetterSpacing),
    bodyFont: settings.bodyFont || DEFAULT_BRAND_SETTINGS.bodyFont,
  };

  document.documentElement.style.setProperty("--font-brand", currentBrandSettings.displayFont);
  document.documentElement.style.setProperty("--display-letter-spacing", displayLetterSpacingToCss(currentBrandSettings.displayLetterSpacing));
  document.documentElement.style.setProperty("--font-body", currentBrandSettings.bodyFont);

  document.querySelectorAll("[data-brand-copy]").forEach((node) => {
    const kind = node.dataset.brandCopy || "name";
    node.textContent = currentBrandSettings[kind] || DEFAULT_BRAND_SETTINGS[kind] || DEFAULT_BRAND_SETTINGS.name;
  });

  document.querySelectorAll(".brand-mark").forEach((mark) => {
    mark.dataset.brandFallback = currentBrandSettings.wordmark || DEFAULT_BRAND_SETTINGS.wordmark;

    if (!mark.classList.contains("has-custom-logo")) {
      mark.textContent = currentBrandSettings.wordmark;
    }
  });

  document.querySelectorAll("[data-brand-setting]").forEach((field) => {
    const key = field.dataset.brandSetting;
    if (!key) return;
    if (field.value !== currentBrandSettings[key]) field.value = currentBrandSettings[key];
  });
}

function applyBrandSvg(svgMarkup = "") {
  const marks = document.querySelectorAll(".brand-mark");
  const normalisedSvg = normaliseBrandSvg(svgMarkup);

  marks.forEach((mark) => {
    if (!mark.dataset.brandFallback) {
      mark.dataset.brandFallback = currentBrandSettings.wordmark || DEFAULT_BRAND_SETTINGS.wordmark;
    }

    if (!normalisedSvg.trim()) {
      mark.innerHTML = mark.dataset.brandFallback;
      mark.classList.remove("has-custom-logo");
      return;
    }

    mark.classList.add("has-custom-logo");
    mark.innerHTML = `
      <span class="brand-mark-logo" aria-hidden="true">${normalisedSvg}</span>
      <span class="sr-only">${escapeAttribute(currentBrandSettings.name || DEFAULT_BRAND_SETTINGS.name)}</span>
    `;
  });
}

async function fetchBrandSettings() {
  const response = await fetch(`/api/brand/settings?ts=${Date.now()}`, { cache: "no-store" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Could not load brand settings.");
  return data.settings || { ...DEFAULT_BRAND_SETTINGS };
}

async function saveBrandSettings(settings) {
  const adminKey = localStorage.getItem("shkeeno-admin-key") || "";
  if (!adminKey) {
    throw new Error("Save the admin key in Access before changing the shared logo.");
  }

  const response = await fetch("/api/brand/settings", {
    method: "PUT",
    cache: "no-store",
    headers: {
      "content-type": "application/json",
      "x-admin-key": adminKey,
    },
    body: JSON.stringify(settings),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Could not save brand settings.");
  return data.settings || settings;
}

function queueRemoteSave(message = "Brand settings saved.") {
  if (!document.querySelector("[data-brand-setting]")) return;
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(async () => {
    const saveVersion = brandSettingsEditVersion;
    try {
      setBrandStatus("Saving brand settings...");
      const settingsToSave = { ...currentBrandSettings };
      const saved = await saveBrandSettings(settingsToSave);
      if (saveVersion !== brandSettingsEditVersion) return;

      hasPendingBrandSettingsEdit = false;
      applyBrandSettings(saved);
      applyBrandSvg(saved.svg || "");
      persistLocalBrandSettings(saved);
      setBrandStatus(message, "good");
    } catch (error) {
      setBrandStatus(error.message || "Could not save brand settings.", "bad");
    }
  }, 250);
}

function initialiseLocalBrandState() {
  const localSettings = getLocalBrandSettings();
  applyBrandSettings(localSettings);
  applyBrandSvg(localSettings.svg || localStorage.getItem(BRAND_KEY) || "");
}

async function initialiseRemoteBrandState() {
  try {
    const remoteSettings = await fetchBrandSettings();
    if (hasPendingBrandSettingsEdit) return;

    const localSettings = getLocalBrandSettings();
    if (!remoteSettings.svg && localSettings.svg && localStorage.getItem("shkeeno-admin-key")) {
      const merged = {
        ...remoteSettings,
        svg: normaliseBrandSvg(localSettings.svg),
      };
      const saved = await saveBrandSettings(merged);
      applyBrandSettings(saved);
      applyBrandSvg(saved.svg || "");
      persistLocalBrandSettings(saved);
      setBrandStatus("Shared logo synced.", "good");
      return;
    }
    applyBrandSettings(remoteSettings);
    applyBrandSvg(remoteSettings.svg || "");
    persistLocalBrandSettings(remoteSettings);
    if (document.querySelector("[data-brand-status]") && remoteSettings.svg) {
      setBrandStatus("Custom logo loaded.", "good");
    }
  } catch {
    if (document.querySelector("[data-brand-status]") && currentBrandSettings.svg) {
      setBrandStatus("Using the logo saved in this browser.", "neutral");
    }
  }
}

initialiseLocalBrandState();
initialiseRemoteBrandState();

document.addEventListener("astro:page-load", () => {
  applyBrandSettings(currentBrandSettings);
  applyBrandSvg(currentBrandSettings.svg || localStorage.getItem(BRAND_KEY) || "");
});

async function syncBrandSvgUpload(brandUpload) {
  const file = brandUpload?.files?.[0];
  if (!file) return;

  if (!file.name.toLowerCase().endsWith(".svg") && file.type !== "image/svg+xml") {
    setBrandStatus("Please choose an SVG file.", "bad");
    return;
  }

  try {
    const svgMarkup = await file.text();
    if (!svgMarkup.includes("<svg")) {
      throw new Error("That file does not look like an SVG.");
    }

    const normalisedSvg = normaliseBrandSvg(svgMarkup);

    currentBrandSettings = {
      ...currentBrandSettings,
      svg: normalisedSvg,
    };
    applyBrandSvg(normalisedSvg);
    persistLocalBrandSettings(currentBrandSettings);
    setBrandStatus("Saving logo...");
    const saved = await saveBrandSettings(currentBrandSettings);
    applyBrandSettings(saved);
    applyBrandSvg(saved.svg || "");
    persistLocalBrandSettings(saved);
    setBrandStatus("Logo uploaded.", "good");
  } catch (error) {
    setBrandStatus(error.message || "Could not read that SVG.", "bad");
  } finally {
    brandUpload.value = "";
  }
}

async function clearBrandSvg() {
  currentBrandSettings = {
    ...currentBrandSettings,
    svg: "",
  };
  applyBrandSvg("");
  persistLocalBrandSettings(currentBrandSettings);

  try {
    setBrandStatus("Clearing custom logo...");
    const saved = await saveBrandSettings(currentBrandSettings);
    applyBrandSettings(saved);
    applyBrandSvg(saved.svg || "");
    persistLocalBrandSettings(saved);
    setBrandStatus("Custom logo cleared.", "good");
  } catch (error) {
    setBrandStatus(error.message || "Could not clear the custom logo.", "bad");
  }
}

function syncBrandSettingField(field) {
  const key = field.dataset.brandSetting;
  if (!key) return;
  currentBrandSettings = {
    ...currentBrandSettings,
    [key]: key === "displayLetterSpacing"
      ? normaliseDisplayLetterSpacing(field.value)
      : field.value.trim() || DEFAULT_BRAND_SETTINGS[key],
  };
  hasPendingBrandSettingsEdit = true;
  brandSettingsEditVersion += 1;
  applyBrandSettings(currentBrandSettings);
  applyBrandSvg(currentBrandSettings.svg || "");
  persistLocalBrandSettings(currentBrandSettings);
  queueRemoteSave(
    key === "displayFont" || key === "bodyFont" || key === "displayLetterSpacing" ? "Typography updated." : "Brand labels updated.",
  );
}

document.addEventListener("input", (event) => {
  const field = event.target.closest?.("[data-brand-setting]");
  if (field?.tagName === "SELECT") return;
  if (field) syncBrandSettingField(field);
});

document.addEventListener("change", (event) => {
  const brandUpload = event.target.closest?.("[data-brand-svg-upload]");
  if (brandUpload) {
    syncBrandSvgUpload(brandUpload);
    return;
  }

  const field = event.target.closest?.("[data-brand-setting]");
  if (field) syncBrandSettingField(field);
});

document.addEventListener("click", (event) => {
  const clearButton = event.target.closest?.("[data-brand-clear]");
  if (clearButton) clearBrandSvg();
});

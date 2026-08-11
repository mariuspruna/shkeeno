function closeAllCustomSelects(except = null) {
  document.querySelectorAll("[data-custom-select-ui].is-open").forEach((root) => {
    if (root === except) return;
    root.classList.remove("is-open");
    const trigger = root.querySelector("[data-custom-select-trigger]");
    const panel = root.querySelector("[data-custom-select-panel]");
    if (trigger) trigger.setAttribute("aria-expanded", "false");
    if (panel) panel.hidden = true;
  });
}

function buildOptionMarkup(option, isSelected) {
  return `
    <button
      type="button"
      class="custom-select-option${isSelected ? " is-selected" : ""}"
      role="option"
      aria-selected="${isSelected ? "true" : "false"}"
      data-custom-select-option
      data-value="${option.value}"
    >
      <span>${option.textContent || ""}</span>
    </button>
  `;
}

function syncCustomSelect(select, root) {
  const triggerLabel = root.querySelector("[data-custom-select-label]");
  const panel = root.querySelector("[data-custom-select-panel]");
  const selected = select.options[select.selectedIndex] || select.options[0];

  if (triggerLabel) {
    triggerLabel.textContent = selected?.textContent || "";
  }

  if (panel) {
    panel.innerHTML = Array.from(select.options)
      .map((option) => buildOptionMarkup(option, option.value === select.value))
      .join("");
  }
}

function enhanceSelect(select) {
  if (!(select instanceof HTMLSelectElement)) return;
  if (select.dataset.customSelectReady === "true") return;

  select.dataset.customSelectReady = "true";
  select.classList.add("custom-select-native");
  select.setAttribute("tabindex", "-1");

  const root = document.createElement("div");
  root.className = "custom-select";
  root.dataset.customSelectUi = "true";

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "custom-select-trigger";
  trigger.dataset.customSelectTrigger = "true";
  trigger.setAttribute("aria-haspopup", "listbox");
  trigger.setAttribute("aria-expanded", "false");

  const label = document.createElement("span");
  label.dataset.customSelectLabel = "true";
  const chevron = document.createElement("span");
  chevron.className = "custom-select-chevron";
  chevron.setAttribute("aria-hidden", "true");

  trigger.append(label, chevron);

  const panel = document.createElement("div");
  panel.className = "custom-select-panel";
  panel.dataset.customSelectPanel = "true";
  panel.setAttribute("role", "listbox");
  panel.hidden = true;

  root.append(trigger, panel);
  select.insertAdjacentElement("afterend", root);

  const open = () => {
    closeAllCustomSelects(root);
    root.classList.add("is-open");
    trigger.setAttribute("aria-expanded", "true");
    panel.hidden = false;
  };

  const close = () => {
    root.classList.remove("is-open");
    trigger.setAttribute("aria-expanded", "false");
    panel.hidden = true;
  };

  trigger.addEventListener("click", () => {
    if (root.classList.contains("is-open")) {
      close();
    } else {
      open();
    }
  });

  trigger.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      open();
      panel.querySelector(".is-selected")?.focus();
    }
  });

  panel.addEventListener("click", (event) => {
    const option = event.target instanceof Element
      ? event.target.closest("[data-custom-select-option]")
      : null;
    if (!option) return;

    const nextValue = option.getAttribute("data-value") || "";
    if (select.value !== nextValue) {
      select.value = nextValue;
      select.dispatchEvent(new Event("input", { bubbles: true }));
      select.dispatchEvent(new Event("change", { bubbles: true }));
    } else {
      syncCustomSelect(select, root);
    }

    close();
    trigger.focus();
  });

  panel.addEventListener("keydown", (event) => {
    const options = Array.from(panel.querySelectorAll("[data-custom-select-option]"));
    const currentIndex = options.indexOf(document.activeElement);
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      trigger.focus();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      options[(currentIndex + 1 + options.length) % options.length]?.focus();
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      options[(currentIndex - 1 + options.length) % options.length]?.focus();
    }
  });

  select.addEventListener("change", () => syncCustomSelect(select, root));

  const observer = new MutationObserver(() => syncCustomSelect(select, root));
  observer.observe(select, { childList: true, subtree: true, attributes: true, attributeFilter: ["selected", "label", "value"] });

  syncCustomSelect(select, root);
}

function initCustomSelects() {
  closeAllCustomSelects();
  document.querySelectorAll("select[data-custom-select]").forEach(enhanceSelect);
}

document.addEventListener("click", (event) => {
  const target = event.target instanceof Element ? event.target : null;
  if (!target?.closest("[data-custom-select-ui]")) {
    closeAllCustomSelects();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeAllCustomSelects();
});

document.addEventListener("astro:page-load", initCustomSelects);
initCustomSelects();

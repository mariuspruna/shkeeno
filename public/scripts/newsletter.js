const newsletterForms = Array.from(document.querySelectorAll("[data-newsletter-form]"));

function setNewsletterStatus(formNode, message, tone = "neutral", visible = true) {
  const statusNode = formNode?.querySelector("[data-newsletter-status]");
  if (!statusNode) return;
  statusNode.hidden = !visible;
  statusNode.textContent = message;
  statusNode.dataset.tone = tone;
}

function showNewsletterToast(message, tone = "good") {
  const existing = document.querySelector("[data-toast]");
  existing?.remove();
  document.body.insertAdjacentHTML(
    "beforeend",
    `<p class="action-toast" data-toast data-tone="${escapeHtml(tone)}">${escapeHtml(message)}</p>`,
  );
  window.setTimeout(() => document.querySelector("[data-toast]")?.remove(), 3600);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]
  ));
}

newsletterForms.forEach((formNode) => {
  if (formNode.dataset.bound === "true") return;
  formNode.dataset.bound = "true";

  formNode.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitNode = formNode.querySelector("[data-newsletter-submit]");
    const originalLabel = submitNode?.textContent || "Notify me";

    try {
      setNewsletterStatus(formNode, "Sending confirmation email...");
      if (submitNode) {
        submitNode.disabled = true;
        submitNode.textContent = "Sending...";
      }

      const formData = new FormData(formNode);
      const body = Object.fromEntries(formData.entries());
      body.source = "footer";

      const response = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Could not start the subscription.");
      }

      formNode.reset();
      setNewsletterStatus(formNode, data.message || "Check your inbox to confirm the subscription.", "good");
      showNewsletterToast(data.message || "You're in the first step. Check your inbox to confirm.", "good");
    } catch (error) {
      const message = error.message || "Could not start the subscription.";
      setNewsletterStatus(formNode, message, "bad");
      showNewsletterToast(message, "bad");
    } finally {
      if (submitNode) {
        submitNode.disabled = false;
        submitNode.textContent = originalLabel;
      }
    }
  });
});

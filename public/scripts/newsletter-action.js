const actionShell = document.querySelector("[data-newsletter-action]");

if (actionShell) {
  const statusNode = actionShell.querySelector("[data-newsletter-action-status]");
  const type = actionShell.dataset.newsletterActionType || "";
  const token = new URLSearchParams(window.location.search).get("token") || "";

  function setStatus(message, tone = "neutral") {
    if (!statusNode) return;
    statusNode.textContent = message;
    statusNode.dataset.tone = tone;
  }

  async function run() {
    if (!token) {
      setStatus("This link is missing its token. Try opening the email again.", "bad");
      return;
    }

    try {
      setStatus(type === "unsubscribe" ? "Removing this email from the list..." : "Confirming your subscription...");
      const response = await fetch(`/api/newsletter/${type}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ token }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "This link could not be completed.");
      }

      if (type === "unsubscribe") {
        setStatus(data.alreadyUnsubscribed ? "This email was already unsubscribed." : "You have been unsubscribed.", "good");
      } else {
        setStatus(data.alreadyConfirmed ? "This subscription was already confirmed." : "Subscription confirmed. You are on the list.", "good");
      }
    } catch (error) {
      setStatus(error.message || "This link could not be completed.", "bad");
    }
  }

  run();
}

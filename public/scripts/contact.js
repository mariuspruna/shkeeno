const contactForm = document.querySelector("[data-contact-form]");

if (contactForm) {
  const statusNode = document.querySelector("[data-contact-status]");
  const submitButton = document.querySelector("[data-contact-submit]");

  function setStatus(message, tone = "neutral", visible = true) {
    if (!statusNode) return;
    statusNode.hidden = !visible;
    statusNode.textContent = message;
    statusNode.dataset.tone = tone;
  }

  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    submitButton?.setAttribute("disabled", "true");
    setStatus("Sending message...");

    const formData = new FormData(contactForm);
    const payload = Object.fromEntries(formData.entries());

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not send message.");

      contactForm.reset();
      setStatus("Message sent. We will reply by email.", "good");
    } catch (error) {
      setStatus(error.message || "Could not send message.", "bad");
    } finally {
      submitButton?.removeAttribute("disabled");
    }
  });
}

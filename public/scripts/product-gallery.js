document.addEventListener("click", (event) => {
  const prevButton = event.target.closest("[data-gallery-prev]");
  const nextButton = event.target.closest("[data-gallery-next]");
  const thumb = event.target.closest("[data-gallery-thumb]");

  if (!prevButton && !nextButton && !thumb) return;

  const gallery = event.target.closest("[data-gallery]");
  if (!gallery) return;

  const images = Array.from(gallery.querySelectorAll("[data-gallery-image]"));
  if (images.length <= 1) return;

  const activeIndex = Math.max(0, images.findIndex((image) => !image.hidden));
  let nextIndex = activeIndex;

  if (prevButton) nextIndex = (activeIndex - 1 + images.length) % images.length;
  if (nextButton) nextIndex = (activeIndex + 1) % images.length;
  if (thumb) nextIndex = Number(thumb.dataset.galleryIndex || 0);

  images.forEach((image, index) => {
    const isActive = index === nextIndex;
    image.hidden = !isActive;
    image.classList.toggle("is-hidden", !isActive);
  });

  Array.from(gallery.querySelectorAll("[data-gallery-thumb]")).forEach((node, index) => {
    node.classList.toggle("is-active", index === nextIndex);
  });
});

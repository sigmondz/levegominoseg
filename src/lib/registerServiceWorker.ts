/** Dev (HMR) alatt ne regisztráljunk; production bundle-ben igen. */
export function shouldRegisterServiceWorker(
  options: { hasHot?: boolean; hasServiceWorker?: boolean } = {},
): boolean {
  const hasHot = options.hasHot ?? Boolean(import.meta.hot);
  const hasServiceWorker =
    options.hasServiceWorker ??
    (typeof navigator !== "undefined" && "serviceWorker" in navigator);
  return !hasHot && hasServiceWorker;
}

/** Production PWA service worker regisztráció. Dev (HMR) alatt kihagyjuk. */
export function registerServiceWorker(): void {
  // Ne process.env.NODE_ENV-re támaszkodjunk: a Bun HTML `--define` értéke
  // unreliable, és build idején kidobhatja a regisztrációt.
  if (!shouldRegisterServiceWorker()) return;

  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.warn("Service worker regisztráció sikertelen:", error);
    });
  });
}

/* ── Service Worker Registration ──────────────────────────── */

/** Register the service worker in production only. */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD) return;
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');

      // Check for updates periodically (every 60 seconds)
      setInterval(() => {
        registration.update().catch(() => {
          /* ignore update check failures */
        });
      }, 60_000);

      // Detect waiting service worker (new version available)
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (
            newWorker.state === 'installed' &&
            navigator.serviceWorker.controller
          ) {
            // New version waiting — dispatch custom event for UI to pick up
            window.dispatchEvent(new CustomEvent('sw-update-available'));
          }
        });
      });
    } catch (err) {
      console.error('[sw] Registration failed:', err);
    }
  });
}

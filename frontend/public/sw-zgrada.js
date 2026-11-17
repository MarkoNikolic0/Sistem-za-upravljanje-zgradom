importScripts('./ngsw-worker.js');

self.addEventListener('push', (dogadjaj) => {
  let broj;
  try {
    broj = dogadjaj.data?.json()?.notification?.data?.neprocitano;
  } catch {
    return;
  }
  if (typeof broj !== 'number' || !('setAppBadge' in self.navigator)) {
    return;
  }
  dogadjaj.waitUntil(
    (broj > 0 ? self.navigator.setAppBadge(broj) : self.navigator.clearAppBadge()).catch(
      () => undefined,
    ),
  );
});

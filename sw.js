const CACHE_NAME = 'weathernow-v1';
const ASSETS_TO_CACHE = [
  '/',                 // root
  '/index.html',
  '/manifest.json',
  '/script.js',

  // Design CSS
  '/design1/style.css',
  '/design2/style.css',

  // Common weather icons
  '/icons/01d.png','/icons/01n.png','/icons/02d.png','/icons/02n.png',
  '/icons/03d.png','/icons/03n.png','/icons/04d.png','/icons/04n.png',
  '/icons/09d.png','/icons/09n.png','/icons/10d.png','/icons/11d.png',
  '/icons/11n.png','/icons/50d.png','/icons/50n.png','/icons/snowfall.png',
  '/icons/moon.png','/icons/sun.png',

  // Uncommon icons
  '/design1/icons/location-icon.png','/design1/icons/humidity.png','/design1/icons/wind.png',
  '/design1/icons/pressure.png','/design1/icons/uvi.png','/design1/icons/sunrise.png',
  '/design1/icons/sunset.png','/design1/icons/high-temperature.png','/design1/icons/low-temperature.png',
  '/design1/icons/visibility.png','/design1/icons/thinking.png',

  '/design2/icons/location-icon.png','/design2/icons/humidity.png','/design2/icons/wind.png',
  '/design2/icons/pressure.png','/design2/icons/uvi.png','/design2/icons/sunrise.png',
  '/design2/icons/sunset.png','/design2/icons/high-temperature.png','/design2/icons/low-temperature.png',
  '/design2/icons/visibility.png','/design2/icons/thinking.png',

  // Location icons (shared)
  '/icons/location-icon.png','/icons/location.png',

  // PWA icons
  '/icons/192.png','/icons/512.png'
];

// Install: cache all assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

// Activate: remove old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => 
      Promise.all(keys.map(key => {
        if (key !== CACHE_NAME) return caches.delete(key);
      }))
    ).then(() => self.clients.claim())
  );
});

// Fetch: respond with cache first, fallback to network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(cached => cached || fetch(event.request).catch(() => {
        // Fallback for navigation requests (offline page)
        if (event.request.destination === 'document') return caches.match('/index.html');
      }))
  );
});

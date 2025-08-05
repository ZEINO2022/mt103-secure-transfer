/**
 * Service Worker for MT103 Transfer Form
 * Provides caching and offline functionality
 */

const CACHE_NAME = 'mt103-form-v1.0.0';
const STATIC_CACHE_NAME = 'mt103-static-v1.0.0';

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/form_optimized.html',
  '/assets/styles.css',
  '/assets/script.js',
  '/manifest.json'
];

// Runtime caching patterns
const RUNTIME_CACHE = {
  fonts: {
    pattern: /\.(?:woff|woff2|ttf|eot)$/,
    strategy: 'CacheFirst',
    maxAge: 30 * 24 * 60 * 60 // 30 days
  },
  images: {
    pattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
    strategy: 'CacheFirst', 
    maxAge: 7 * 24 * 60 * 60 // 7 days
  },
  api: {
    pattern: /\/api\//,
    strategy: 'NetworkFirst',
    maxAge: 5 * 60 // 5 minutes
  }
};

// Install event - cache static assets
self.addEventListener('install', event => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then(cache => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        // Skip waiting to activate immediately
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('Failed to cache static assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName => {
              // Delete old cache versions
              return cacheName.startsWith('mt103-') && 
                     cacheName !== CACHE_NAME && 
                     cacheName !== STATIC_CACHE_NAME;
            })
            .map(cacheName => {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        // Claim all clients
        return self.clients.claim();
      })
  );
});

// Fetch event - handle requests with caching strategies
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip Chrome extensions and other protocols
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  // Handle different types of requests
  if (isStaticAsset(request)) {
    event.respondWith(handleStaticAsset(request));
  } else if (isAPIRequest(request)) {
    event.respondWith(handleAPIRequest(request));
  } else if (isRuntimeCacheable(request)) {
    event.respondWith(handleRuntimeCache(request));
  } else {
    event.respondWith(handleDefault(request));
  }
});

// Check if request is for static assets
function isStaticAsset(request) {
  const url = new URL(request.url);
  return STATIC_ASSETS.some(asset => url.pathname.endsWith(asset));
}

// Check if request is for API
function isAPIRequest(request) {
  return RUNTIME_CACHE.api.pattern.test(request.url);
}

// Check if request should be runtime cached
function isRuntimeCacheable(request) {
  return RUNTIME_CACHE.fonts.pattern.test(request.url) ||
         RUNTIME_CACHE.images.pattern.test(request.url);
}

// Handle static assets with Cache First strategy
async function handleStaticAsset(request) {
  try {
    const cache = await caches.open(STATIC_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      await cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Static asset fetch failed:', error);
    
    // Return offline fallback if available
    const cache = await caches.open(STATIC_CACHE_NAME);
    return await cache.match('/offline.html') || new Response('Offline');
  }
}

// Handle API requests with Network First strategy
async function handleAPIRequest(request) {
  const cacheName = CACHE_NAME;
  
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      await cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Network failed for API request, trying cache:', error);
    
    // Fall back to cache
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return error response if no cache available
    return new Response(
      JSON.stringify({ 
        error: 'Network unavailable and no cached data available',
        offline: true 
      }), 
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Handle runtime cacheable assets (fonts, images)
async function handleRuntimeCache(request) {
  const cacheName = CACHE_NAME;
  
  try {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      // Check if cache is still fresh
      const cacheDate = new Date(cachedResponse.headers.get('date'));
      const maxAge = getRuntimeCacheMaxAge(request);
      
      if (Date.now() - cacheDate.getTime() < maxAge * 1000) {
        return cachedResponse;
      }
    }
    
    // Fetch from network
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      await cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Runtime cache fetch failed:', error);
    
    // Return cached version even if stale
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

// Get max age for runtime cache
function getRuntimeCacheMaxAge(request) {
  if (RUNTIME_CACHE.fonts.pattern.test(request.url)) {
    return RUNTIME_CACHE.fonts.maxAge;
  }
  if (RUNTIME_CACHE.images.pattern.test(request.url)) {
    return RUNTIME_CACHE.images.maxAge;
  }
  return 24 * 60 * 60; // Default 1 day
}

// Handle default requests
async function handleDefault(request) {
  try {
    return await fetch(request);
  } catch (error) {
    console.error('Default fetch failed:', error);
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      const cache = await caches.open(STATIC_CACHE_NAME);
      return await cache.match('/offline.html') || 
             new Response('You are offline', { status: 503 });
    }
    
    throw error;
  }
}

// Handle background sync for form submissions
self.addEventListener('sync', event => {
  if (event.tag === 'mt103-transfer') {
    event.waitUntil(handleBackgroundSync());
  }
});

// Handle background sync
async function handleBackgroundSync() {
  console.log('Handling background sync for MT103 transfers');
  
  try {
    // Get queued transfers from IndexedDB
    const queuedTransfers = await getQueuedTransfers();
    
    for (const transfer of queuedTransfers) {
      try {
        const response = await fetch('/api/send_mt103', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(transfer.data)
        });
        
        if (response.ok) {
          await removeQueuedTransfer(transfer.id);
          console.log('Queued transfer submitted successfully');
        }
      } catch (error) {
        console.error('Failed to submit queued transfer:', error);
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Placeholder functions for IndexedDB operations
async function getQueuedTransfers() {
  // Implementation would use IndexedDB to store offline form submissions
  return [];
}

async function removeQueuedTransfer(id) {
  // Implementation would remove completed transfers from IndexedDB
  console.log('Removing queued transfer:', id);
}

// Performance monitoring
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'PERFORMANCE_METRICS') {
    console.log('Performance metrics received:', event.data.metrics);
    
    // Could send metrics to analytics service
    // sendMetricsToAnalytics(event.data.metrics);
  }
});

console.log('Service Worker loaded successfully');
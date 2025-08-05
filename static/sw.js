// Service Worker للتخزين المؤقت وتحسين الأداء
const CACHE_NAME = 'mt103-cache-v1';
const STATIC_CACHE = 'mt103-static-v1';
const DYNAMIC_CACHE = 'mt103-dynamic-v1';

// الملفات التي سيتم تخزينها مؤقتاً
const STATIC_FILES = [
    '/',
    '/static/css/styles.css',
    '/static/js/app.js',
    '/templates/form.html'
];

// استراتيجية التخزين المؤقت
const CACHE_STRATEGIES = {
    STATIC_FIRST: 'static-first',
    NETWORK_FIRST: 'network-first',
    CACHE_ONLY: 'cache-only'
};

// تثبيت Service Worker
self.addEventListener('install', (event) => {
    console.log('Service Worker installing...');
    
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => {
                console.log('Caching static files...');
                return cache.addAll(STATIC_FILES);
            })
            .then(() => {
                console.log('Service Worker installed successfully');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('Service Worker installation failed:', error);
            })
    );
});

// تفعيل Service Worker
self.addEventListener('activate', (event) => {
    console.log('Service Worker activating...');
    
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
                            console.log('Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('Service Worker activated successfully');
                return self.clients.claim();
            })
    );
});

// اعتراض الطلبات
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // تجاهل طلبات POST والطلبات غير GET
    if (request.method !== 'GET') {
        return;
    }
    
    // استراتيجية مختلفة حسب نوع الملف
    if (isStaticFile(url.pathname)) {
        event.respondWith(staticFirstStrategy(request));
    } else if (isAPIRequest(url.pathname)) {
        event.respondWith(networkFirstStrategy(request));
    } else {
        event.respondWith(networkFirstStrategy(request));
    }
});

// تحديد نوع الملف
function isStaticFile(pathname) {
    return pathname.includes('/static/') || 
           pathname.includes('.css') || 
           pathname.includes('.js') || 
           pathname.includes('.png') || 
           pathname.includes('.jpg') || 
           pathname.includes('.svg');
}

function isAPIRequest(pathname) {
    return pathname.startsWith('/api/');
}

// استراتيجية الملفات الثابتة - التخزين المؤقت أولاً
async function staticFirstStrategy(request) {
    try {
        // محاولة الحصول من التخزين المؤقت أولاً
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // إذا لم يوجد في التخزين المؤقت، جلب من الشبكة
        const networkResponse = await fetch(request);
        
        // تخزين الاستجابة في التخزين المؤقت
        if (networkResponse.ok) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.error('Static first strategy failed:', error);
        
        // محاولة الحصول من التخزين المؤقت كحل أخير
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // إرجاع صفحة خطأ بسيطة
        return new Response('Offline - Please check your connection', {
            status: 503,
            statusText: 'Service Unavailable'
        });
    }
}

// استراتيجية الشبكة أولاً - للطلبات الديناميكية
async function networkFirstStrategy(request) {
    try {
        // محاولة الحصول من الشبكة أولاً
        const networkResponse = await fetch(request);
        
        // تخزين الاستجابة في التخزين المؤقت
        if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.error('Network first strategy failed:', error);
        
        // محاولة الحصول من التخزين المؤقت
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // إرجاع صفحة خطأ بسيطة
        return new Response('Offline - Please check your connection', {
            status: 503,
            statusText: 'Service Unavailable'
        });
    }
}

// استراتيجية التخزين المؤقت فقط
async function cacheOnlyStrategy(request) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
        return cachedResponse;
    }
    
    return new Response('Not found in cache', {
        status: 404,
        statusText: 'Not Found'
    });
}

// معالجة رسائل الخلفية
self.addEventListener('message', (event) => {
    const { type, payload } = event.data;
    
    switch (type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;
        case 'CLEAR_CACHE':
            clearCache();
            break;
        case 'GET_CACHE_INFO':
            getCacheInfo().then(info => {
                event.ports[0].postMessage(info);
            });
            break;
        default:
            console.log('Unknown message type:', type);
    }
});

// مسح التخزين المؤقت
async function clearCache() {
    try {
        const cacheNames = await caches.keys();
        await Promise.all(
            cacheNames.map(cacheName => caches.delete(cacheName))
        );
        console.log('Cache cleared successfully');
    } catch (error) {
        console.error('Failed to clear cache:', error);
    }
}

// الحصول على معلومات التخزين المؤقت
async function getCacheInfo() {
    try {
        const cacheNames = await caches.keys();
        const cacheInfo = {};
        
        for (const cacheName of cacheNames) {
            const cache = await caches.open(cacheName);
            const keys = await cache.keys();
            cacheInfo[cacheName] = keys.length;
        }
        
        return cacheInfo;
    } catch (error) {
        console.error('Failed to get cache info:', error);
        return {};
    }
}

// تحديث التخزين المؤقت في الخلفية
self.addEventListener('sync', (event) => {
    if (event.tag === 'background-sync') {
        event.waitUntil(backgroundSync());
    }
});

async function backgroundSync() {
    try {
        console.log('Performing background sync...');
        
        // تحديث التخزين المؤقت للملفات الثابتة
        const cache = await caches.open(STATIC_CACHE);
        const requests = await cache.keys();
        
        for (const request of requests) {
            try {
                const response = await fetch(request);
                if (response.ok) {
                    await cache.put(request, response);
                }
            } catch (error) {
                console.warn('Failed to update cache for:', request.url);
            }
        }
        
        console.log('Background sync completed');
    } catch (error) {
        console.error('Background sync failed:', error);
    }
}
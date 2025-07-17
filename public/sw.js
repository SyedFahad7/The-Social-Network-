// Service Worker for Push Notifications
const CACHE_NAME = 'academic-portal-v1';
const API_BASE_URL = 'http://192.168.1.218:5000';

// Store VAPID key (will be set by main app)
let vapidPublicKey = null;

// Install event
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(self.clients.claim());
});

// Push event - Handle incoming push notifications
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data.json();
  } catch (e) {
    data = { title: 'Social Network', body: event.data.text() };
  }
  console.log('Push data:', data);

  // Fix: Use data.data if present (FCM web push puts your payload here)
  let payload = data.data || data;
  let priorityLabel = '';
  if (payload.priority === 'urgent') priorityLabel = '🚨 Urgent';
  else if (payload.priority === 'high') priorityLabel = '⚠️ High';
  else if (payload.priority === 'low') priorityLabel = 'Low';

  // Compose notification content: sender name/role, title, body
  let senderLine = payload.senderName
    ? `From: ${payload.senderName}${payload.senderRole ? ' (' + payload.senderRole.charAt(0).toUpperCase() + payload.senderRole.slice(1) + ')' : ''}`
    : '';

  // Notification layout: sender, title, body
  let notifBody = [
    senderLine,
    payload.title || '',
    payload.body || payload.message || 'You have a new notification'
  ].filter(Boolean).join('\n');

  // Use the senderLine as the notification title if you want it bold/larger (browser support is limited for rich text)
  let title = senderLine || 'Social Network';
  let body = [
    payload.title || '',
    payload.body || payload.message || 'You have a new notification'
  ].filter(Boolean).join('\n');

  // Use the senderLine as the notification title, and the rest as body
  const options = {
    body: body,
    icon: '/icon.png',
    badge: '/badge.png',
    image: payload.image, // Optional
    timestamp: Date.now(),
    tag: payload.notificationId || Date.now().toString(),
    data: payload,
    actions: [
      { action: 'open', title: 'Open', icon: '/icon.png' },
      { action: 'close', title: 'Close', icon: '/icon.png' }
    ],
    requireInteraction: payload.priority === 'high' || payload.priority === 'urgent',
    renotify: true,
    silent: false,
    vibrate: [200, 100, 200]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  const notificationId = event.notification.data && event.notification.data.notificationId;
  // Optionally get userId from event.notification.data.userId if available
  if (notificationId) {
    fetch(`${API_BASE_URL}/api/notifications/track-click`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationId })
    });
  }
  event.notification.close();
  
  if (event.action === 'close') {
    return;
  }
  
  // Open the app when notification is clicked
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Check if there's already a window/tab open
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      
      // If no window/tab is open, open a new one
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});

// Background sync for offline functionality
self.addEventListener('sync', (event) => {
  console.log('Background sync event:', event);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

// Handle FCM token refresh
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('Push subscription changed:', event);
  
  event.waitUntil(
    self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapidPublicKey
    }).then((subscription) => {
      // Send new token to server
      return fetch(`${API_BASE_URL}/api/notifications/fcm-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getStoredToken()}`
        },
        body: JSON.stringify({
          fcmToken: subscription.toJSON()?.keys?.p256dh
        })
      });
    })
  );
});

// Helper function to get stored auth token
function getStoredToken() {
  // This would need to be implemented based on how you store the token
  // For now, we'll return null and handle it in the main app
  return null;
}

// Background sync function
async function doBackgroundSync() {
  try {
    // Implement background sync logic here
    console.log('Performing background sync...');
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Message event - Handle messages from main app
self.addEventListener('message', (event) => {
  console.log('Service Worker received message:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  // Handle VAPID key setting
  if (event.data && event.data.type === 'SET_VAPID_KEY') {
    vapidPublicKey = event.data.vapidKey;
    console.log('VAPID key set in service worker');
  }
});

// Fetch event - Cache API responses
self.addEventListener('fetch', (event) => {
  // Only cache GET API requests
  if (event.request.url.includes('/api/') && event.request.method === 'GET') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Clone the response before caching
          const responseClone = response.clone();
          
          // Cache successful responses
          if (response.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          
          return response;
        })
        .catch(() => {
          // Return cached response if network fails
          return caches.match(event.request);
        })
    );
  }
}); 
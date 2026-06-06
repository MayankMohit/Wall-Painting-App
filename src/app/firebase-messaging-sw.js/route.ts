export const dynamic = 'force-dynamic';

// Serves the Firebase Messaging service worker with env vars injected at request
// time, since public/ static files can't access process.env.
export function GET() {
  const config = {
    apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY             ?? '',
    authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN         ?? '',
    projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID          ?? '',
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
    appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID              ?? '',
  };

  const sw = `
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');

firebase.initializeApp(${JSON.stringify(config)});
var messaging = firebase.messaging();

// Firebase Web SDK v9+ does NOT auto-display when onBackgroundMessage is
// registered — we must call showNotification ourselves. Server sends title/body
// in the 'notification' field (see lib/fcm.ts), so read from payload.notification.
messaging.onBackgroundMessage(function(payload) {
  var n     = payload.notification || {};
  var title = n.title || 'Wallo';
  var body  = n.body  || '';
  self.registration.showNotification(title, {
    body:     body,
    icon:     '/app-icon.png',
    badge:    '/app-icon.png',
    tag:      'wallo-notif',
    renotify: true,
    data:     { url: self.location.origin },
  });
});

// Click on OS notification → focus existing tab or open new one
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  var targetUrl = (event.notification.data && event.notification.data.url) || self.location.origin;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(windowClients) {
      // Find an existing app tab and focus + navigate it
      for (var i = 0; i < windowClients.length; i++) {
        var client = windowClients[i];
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          client.focus();
          if ('navigate' in client) return client.navigate(targetUrl);
          return;
        }
      }
      // No existing tab — open a new one
      return clients.openWindow(targetUrl);
    })
  );
});
`.trimStart();

  return new Response(sw, {
    headers: {
      'Content-Type':  'application/javascript',
      'Cache-Control': 'no-cache',
    },
  });
}

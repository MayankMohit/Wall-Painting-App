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

messaging.onBackgroundMessage(function(payload) {
  var title = (payload.notification && payload.notification.title) || 'New notification';
  var body  = (payload.notification && payload.notification.body)  || '';
  self.registration.showNotification(title, {
    body: body,
    icon: '/icon-192.png',
  });
});
`.trimStart();

  return new Response(sw, {
    headers: {
      'Content-Type':  'application/javascript',
      'Cache-Control': 'no-cache',
    },
  });
}

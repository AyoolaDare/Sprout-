
// Standard Service Worker for Sprout Track
self.addEventListener('push', function(event) {
    const data = event.data ? event.data.json() : { title: 'Notification', body: 'New update from Sprout Track' };

    const options = {
        body: data.body,
        icon: '/icons/apple-touch-icon.png', // Fallback icon
        badge: '/icons/apple-touch-icon.png',
        data: data.options?.data || {}
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    const urlToOpen = event.notification.data.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
            for (var i = 0; i < clientList.length; i++) {
                var client = clientList[i];
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});

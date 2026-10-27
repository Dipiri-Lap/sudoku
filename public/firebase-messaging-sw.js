/* 오늘의 퍼즐 웹 푸시 수신용 서비스 워커.
 *
 * 서버(functions/src/dailyPushSender.ts)가 data 전용 메시지를 보내므로,
 * 알림 표시는 여기서 직접 한다. Firebase SDK 를 불러오지 않아서 CDN 버전과 맞출 일이 없다.
 * 앱의 메인 서비스 워커(vite-plugin-pwa)와는 범위가 달라서 서로 충돌하지 않는다.
 */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
    let payload = {};
    try {
        payload = event.data ? event.data.json() : {};
    } catch (e) {
        payload = {};
    }
    // data 전용 메시지({ data: {...} })와 notification 메시지({ notification: {...} }) 둘 다 받는다.
    const data = payload.data || {};
    const note = payload.notification || {};
    const title = data.title || note.title || '퍼즐 가든';
    const body = data.body || note.body || '';
    const link = data.link || (payload.fcmOptions && payload.fcmOptions.link) || '/daily';
    const tag = data.tag || 'daily-puzzle';

    event.waitUntil(
        self.registration.showNotification(title, {
            body,
            icon: '/app_icon.png',
            badge: '/app_icon.png',
            tag, // 같은 종류의 알림은 쌓이지 않고 갈아끼운다
            data: { link },
        })
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const link = (event.notification.data && event.notification.data.link) || '/daily';
    const url = new URL(link, self.location.origin).href;

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
            for (const client of clients) {
                if (client.url.startsWith(self.location.origin) && 'focus' in client) {
                    client.navigate(url);
                    return client.focus();
                }
            }
            return self.clients.openWindow(url);
        })
    );
});

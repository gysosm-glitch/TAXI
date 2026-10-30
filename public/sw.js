// 같이타 서비스 워커: 알림 표시와 알림 클릭 시 앱 열기
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

// 서버 푸시(추후 Supabase Edge Function + VAPID 연동) 수신
self.addEventListener('push', (e) => {
  const data = e.data ? e.data.json() : { title: '같이타', body: '새 알림이 있어요' }
  e.waitUntil(self.registration.showNotification(data.title, { body: data.body, icon: '/icon.svg', badge: '/icon.svg', vibrate: [120, 60, 120] }))
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  e.waitUntil(self.clients.matchAll({ type: 'window' }).then((list) => (list[0] ? list[0].focus() : self.clients.openWindow('/'))))
})

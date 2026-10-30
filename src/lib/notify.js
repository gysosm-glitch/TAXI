// 휴대폰 알림: 서비스 워커로 표시해야 안드로이드·iOS(홈 화면에 추가한 경우)에서 뜬다
export async function registerSW() {
  if (!('serviceWorker' in navigator)) return null
  try { return await navigator.serviceWorker.register('/sw.js') } catch { return null }
}

export function notifyStatus() {
  if (!('Notification' in window)) return 'unsupported'
  return Notification.permission          // 'default' | 'granted' | 'denied'
}

export async function enableNotify() {
  if (!('Notification' in window)) return 'unsupported'
  return Notification.requestPermission()
}

export async function notify(title, body) {
  try { navigator.vibrate?.([120, 60, 120]) } catch { /* 진동 미지원 */ }
  if (notifyStatus() !== 'granted') return false
  const reg = await navigator.serviceWorker?.getRegistration()
  if (reg) { await reg.showNotification(title, { body, icon: '/icon.svg', badge: '/icon.svg', tag: title }); return true }
  new Notification(title, { body, icon: '/icon.svg' })
  return true
}

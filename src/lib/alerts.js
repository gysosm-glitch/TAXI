// 같이타기 알림: 참여·나감·모집 완료·출발 10분 전
// 앱 화면 위 알림 띠 + (허용했다면) 휴대폰 알림
import { useEffect, useRef, useState } from 'react'
import { supabase } from './supabase.js'
import { myRides } from './rides.js'

export const notifyPermission = () => ('Notification' in window ? Notification.permission : 'unsupported')
export const askNotify = async () => ('Notification' in window && Notification.permission === 'default' ? Notification.requestPermission() : notifyPermission())

async function pushNotify(title, body) {
  try { navigator.vibrate?.([120, 60, 120]) } catch { /* 진동 미지원 */ }
  if (notifyPermission() !== 'granted') return
  try {
    const reg = await navigator.serviceWorker?.getRegistration()
    if (reg) await reg.showNotification(title, { body, icon: '/icon-192.png', badge: '/icon-192.png', tag: `${title}-${body}` })
    else new Notification(title, { body, icon: '/icon-192.png' })
  } catch { /* 알림 표시 실패는 무시 */ }
}

export function useRideAlerts(userId) {
  const [toast, setToast] = useState(null)
  const prev = useRef(null)          // ride_id → { members: Set, status }
  const sent = useRef(new Set())     // 출발 10분 전 알림 보낸 모집

  const say = (title, body) => {
    setToast({ title, body, at: Date.now() })
    pushNotify(title, body)
  }

  useEffect(() => {
    if (!supabase || !userId) { prev.current = null; return }
    let alive = true

    const check = async () => {
      const rides = (await myRides(userId)).filter((r) => r.status !== 'done')
      if (!alive) return
      const now = {}
      for (const r of rides) now[r.id] = { members: new Map(r.ride_members.map((m) => [m.user_id, m.nickname])), status: r.status, r }
      const before = prev.current
      if (before) {
        for (const [id, cur] of Object.entries(now)) {
          const old = before[id]
          const r = cur.r
          if (!old) continue
          for (const [uid, nick] of cur.members) if (uid !== userId && !old.members.has(uid)) say('쉐어택 · 새 동승자', `${nick}님이 참여했어요 (${cur.members.size}/${r.max_people}명)`)
          for (const [uid, nick] of old.members) if (!cur.members.has(uid)) say('쉐어택 · 동승자 변경', `${nick}님이 나갔어요 (${cur.members.size}/${r.max_people}명)`)
          if (old.status !== 'full' && cur.status === 'full') say('쉐어택 · 모집 완료', `${r.spot_name} 택시 승차장에서 만나요. ${r.dest_name}행`)
        }
        for (const [id, old] of Object.entries(before)) {
          if (now[id] || old.r.host_id === userId) continue
          // 목록에서 사라진 이유가 '취소'일 때만 알린다 (내가 나간 경우는 제외)
          const { data } = await supabase.from('rides').select('status').eq('id', id).maybeSingle()
          if (data?.status === 'cancelled') say('쉐어택 · 모집 취소', `${old.r.spot_name} → ${old.r.dest_name} 모집이 취소됐어요`)
        }
      }
      // 출발 10분 전
      for (const { r } of Object.values(now)) {
        const left = (new Date(r.depart_at) - Date.now()) / 60000
        if (left <= 10 && left > -5 && !sent.current.has(r.id)) {
          sent.current.add(r.id)
          say('쉐어택 · 곧 출발', `${Math.max(0, Math.round(left))}분 뒤 ${r.spot_name}에서 출발해요`)
        }
      }
      prev.current = now
    }

    check()
    const ch = supabase.channel(`alerts-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ride_members' }, check)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rides' }, check)
      .subscribe()
    const timer = setInterval(check, 30000)
    return () => { alive = false; supabase.removeChannel(ch); clearInterval(timer) }
  }, [userId])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 5000)
    return () => clearTimeout(t)
  }, [toast])

  return { toast, close: () => setToast(null) }
}

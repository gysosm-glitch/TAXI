// 실시간 버스 도착 (Vercel 서버 함수 api/bus) 불러오기 + 1분마다 갱신
import { useEffect, useState } from 'react'
import { HOUR_PROFILE } from './simulate.js'

async function getJSON(url) {
  try {
    const res = await fetch(url)
    if (!res.ok || !(res.headers.get('content-type') || '').includes('json')) return { ok: false, reason: 'no_server' }
    return await res.json()
  } catch { return { ok: false, reason: 'no_server' } }
}

export function useLive(spot) {
  const [bus, setBus] = useState(null)
  const [at, setAt] = useState(null)
  useEffect(() => {
    let alive = true
    const load = async () => {
      let b = await getJSON(`/api/bus?lat=${spot.lat}&lon=${spot.lon}`)
      // 도착정보 API 키가 아직 승인 전이면 '버스 없음'이 아니라 '준비 중'으로 보여 준다
      if (b?.ok && b.stations.length && b.stations.every((s) => String(s.status).includes('SERVICE_KEY'))) b = { ok: false, reason: 'key_pending' }
      if (alive) { setBus(b); setAt(new Date()) }
    }
    setBus(null); load()
    const t = setInterval(load, 60000)
    return () => { alive = false; clearInterval(t) }
  }, [spot.id])
  return { bus, at }
}

// 가장 빨리 오는 버스 1대
export function nextBus(bus) {
  if (!bus?.ok) return null
  const all = bus.stations.flatMap((s) => s.arrivals.map((a) => ({ ...a, station: s.name })))
  return all.sort((a, b) => a.min - b.min)[0] ?? null
}

// 지금 시각 이 스팟의 평소 택시 수요 (하루 승차 × 시간대 비중)
const PROFILE_SUM = HOUR_PROFILE.reduce((a, b) => a + b, 0)
export function taxiDemandNow(spot, hour = new Date().getHours()) {
  const perHour = Math.round(spot.pickups_per_day * HOUR_PROFILE[hour] / PROFILE_SUM)
  const avg = spot.pickups_per_day / 24
  return { perHour, level: perHour >= avg * 1.15 ? '많음' : perHour >= avg * 0.7 ? '보통' : '적음' }
}

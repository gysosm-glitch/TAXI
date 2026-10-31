// 실시간 교통 (Vercel 서버 함수 api/bus, api/traffic) 불러오기 + 1분마다 갱신
import { useEffect, useState } from 'react'

async function getJSON(url) {
  try {
    const res = await fetch(url)
    if (!res.ok || !(res.headers.get('content-type') || '').includes('json')) return { ok: false, reason: 'no_server' }
    return await res.json()
  } catch { return { ok: false, reason: 'no_server' } }
}

export function useLive(spot) {
  const [bus, setBus] = useState(null)
  const [road, setRoad] = useState(null)
  const [at, setAt] = useState(null)
  useEffect(() => {
    let alive = true
    const load = async () => {
      const q = `lat=${spot.lat}&lon=${spot.lon}`
      let [b, r] = await Promise.all([getJSON(`/api/bus?${q}`), getJSON(`/api/traffic?${q}`)])
      // 도착정보 API 키가 아직 승인 전이면 '버스 없음'이 아니라 '준비 중'으로 보여 준다
      if (b?.ok && b.stations.length && b.stations.every((s) => String(s.status).includes('SERVICE_KEY'))) b = { ok: false, reason: 'key_pending' }
      if (alive) { setBus(b); setRoad(r); setAt(new Date()) }
    }
    setBus(null); setRoad(null); load()
    const t = setInterval(load, 60000)
    return () => { alive = false; clearInterval(t) }
  }, [spot.id])
  return { bus, road, at }
}

// 가장 빨리 오는 버스 1대
export function nextBus(bus) {
  if (!bus?.ok) return null
  const all = bus.stations.flatMap((s) => s.arrivals.map((a) => ({ ...a, station: s.name })))
  return all.sort((a, b) => a.min - b.min)[0] ?? null
}

// 가장 많이 수집된 도로 1개
export function mainRoad(road) {
  return road?.ok ? road.roads[0] ?? null : null
}

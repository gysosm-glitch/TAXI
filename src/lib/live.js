// 실시간 버스 도착 (Vercel 서버 함수 api/bus) 불러오기 + 1분마다 갱신
import { useEffect, useState } from 'react'
import { HOUR_PROFILE } from './hours.js'

async function getJSON(url, ms = 8000) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout?.(ms) })   // 공공 API가 느려도 화면이 멈추지 않게
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

// 막차: 스팟 주변 노선의 막차 시간 (시간표라 한 번만 불러온다)
export function useLastBus(spot) {
  const [data, setData] = useState(null)
  useEffect(() => {
    let alive = true
    setData(null)
    getJSON(`/api/lastbus?lat=${(+spot.lat).toFixed(3)}&lon=${(+spot.lon).toFixed(3)}`, 15000)   // 좌표를 100m 단위로 맞춰 서버 캐시(6시간)를 같이 쓴다.then((d) => { if (alive) setData(d) })
    return () => { alive = false }
  }, [spot.id])
  return data
}

// 지금 기준 막차 상태: 가장 늦은 막차까지 남은 분, 끝났는지
export function lastBusState(data, now = new Date()) {
  if (!data?.ok || !data.routes.length) return null
  const toMin = (t) => { const [h, m] = t.split(':').map(Number); return (h < 4 ? h + 24 : h) * 60 + m }
  const cur = (now.getHours() < 4 ? now.getHours() + 24 : now.getHours()) * 60 + now.getMinutes()
  const latest = data.routes.reduce((a, r) => (toMin(r.last) > toMin(a.last) ? r : a), data.routes[0])
  const left = toMin(latest.last) - cur
  const firstMin = Math.min(...data.routes.map((r) => toMin(r.first)))
  const ended = left < 0 || cur < firstMin
  return { latest, left, ended, soon: !ended && left <= 60 }
}

// 오송역 KTX·열차 도착 (5분마다 갱신)
export function useTrains(enabled) {
  const [data, setData] = useState(null)
  useEffect(() => {
    if (!enabled) { setData(null); return }
    let alive = true
    const load = () => getJSON('/api/train').then((d) => { if (alive) setData(d) })
    load()
    const t = setInterval(load, 300000)
    return () => { alive = false; clearInterval(t) }
  }, [enabled])
  return data
}

// "17:42" → 지금부터 몇 분 뒤
export function minutesUntil(hhmm, now = new Date()) {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m - (now.getHours() * 60 + now.getMinutes())
}

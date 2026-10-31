// 앱 전체에서 쓰는 데이터와 공용 계산
import fareRules from '../data/web/02_fare_rules/fare_rules.json'
import zoneList from '../data/web/01_zones/zones.json'
import pairs from '../data/web/03_demand/taxi_od_pairs.min.json'
import tims from '../data/web/10_tims/tims_app.json'
import spots from '../data/web/13_spots/spots.json'
import matching from '../data/web/05_matching/matching_rules.json'
import { quote, splitFare, haversineM } from './lib/fare.js'

export { pairs, tims, spots, matching }
export const rules = fareRules.regions.cheongju
export const zones = [...zoneList].sort((a, b) => a.name.localeCompare(b.name, 'ko'))
export const zoneById = Object.fromEntries(zones.map((z) => [z.zone_id, z]))
export const zoneByName = Object.fromEntries(zones.map((z) => [z.name, z]))
export const CHEONGJU_CENTER = [36.642, 127.45]

export const won = (n) => `${Math.round(n).toLocaleString('ko-KR')}원`
export const eok = (n) => `${(n / 1e8).toFixed(1)}억`
export const pct = (r, d = 1) => `${(r * 100).toFixed(d)}%`

// 좌표 → 존 (가장 가까운 존 중심, 데모용 근사)
export function nearestZone(lat, lon) {
  let best = zones[0], bd = Infinity
  for (const z of zones) {
    const d = haversineM(lon, lat, z.centroid_lon, z.centroid_lat)
    if (d < bd) { bd = d; best = z }
  }
  return best
}

// 목적지 후보: 스팟 + 읍면동 (검색용)
export const places = [
  ...spots.map((s) => ({ id: `spot:${s.id}`, name: s.name, sub: `${s.zone} · 매칭 스팟`, lat: s.lat, lon: s.lon, zone: zoneByName[s.zone]?.zone_id ?? nearestZone(s.lat, s.lon).zone_id })),
  ...zones.map((z) => ({ id: `zone:${z.zone_id}`, name: z.name, sub: `${z.gu} · ${z.type_ko}`, lat: z.centroid_lat, lon: z.centroid_lon, zone: z.zone_id })),
]

// 스팟별 지금 같이 타기 대기 현황 (시범: 합성 요청 중 현재 시각 ±1시간 출발분)
import synthetic from '../data/web/05_matching/synthetic_ride_requests.json'
export const spotZoneId = (s) => zoneByName[s.zone]?.zone_id ?? nearestZone(s.lat, s.lon).zone_id
export function waitingBySpot(now = new Date()) {
  const h = now.getHours()
  const near = synthetic.filter((r) => {
    const rh = Number(r.depart_at.slice(11, 13))
    return Math.min(Math.abs(rh - h), 24 - Math.abs(rh - h)) <= 1
  })
  return spots.map((s) => {
    const z = spotZoneId(s)
    const list = near.filter((r) => r.origin_zone === z)
    const dests = {}
    for (const r of list) dests[r.dest_zone] = (dests[r.dest_zone] || 0) + 1
    const top = Object.entries(dests).sort((a, b) => b[1] - a[1])[0]
    // 대기자가 없으면 이 스팟에서 할증 붙는 이동 중 가장 많은 목적지를 대표로 보여 준다
    const usual = pairs.filter((p) => p.o === z && p.d !== z && p.cat !== 'dong_to_dong').sort((a, b) => b.taxi - a.taxi)[0]
      ?? pairs.filter((p) => p.o === z && p.d !== z).sort((a, b) => b.taxi - a.taxi)[0]
    return { spot: s, zone: z, waiting: Math.min(list.length, 3), destZone: top ? Number(top[0]) : usual?.d ?? null }
  }).sort((a, b) => b.waiting - a.waiting || b.spot.pickups_per_day - a.spot.pickups_per_day)
}

export function estKm(o, d) {
  const p = pairs.find((x) => x.o === o && x.d === d)
  return p ? p.km : 5
}

// 한 번의 이동에 대한 요금·할증·합승 분담
export function tripQuote(originZone, destZone, people = 1, km) {
  const q = quote({ origin: zoneById[originZone], dest: zoneById[destZone], distanceM: (km ?? estKm(originZone, destZone)) * 1000, rules })
  const share = splitFare(q.fare, Array(people).fill(1))[0]
  return { ...q, km: km ?? estKm(originZone, destZone), share, saving: q.fare - share }
}

// 출발지: 추천 스팟 또는 직접 고른 읍면동 ('zone:143' 형식)을 같은 모양으로
export function placeFromId(id) {
  const s = spots.find((x) => x.id === id)
  if (s) return s
  const zid = Number(String(id).replace('zone:', ''))
  const z = zoneById[zid]
  if (!z) return null
  const t = tims.zones.find((x) => x.zone_id === zid)
  return {
    id: `zone:${zid}`, name: z.name, zone: z.name, lat: z.centroid_lat, lon: z.centroid_lon, custom: true,
    pickups_per_day: Math.round(t?.rides_per_day ?? 0), avg_fare: t?.avg_fare ?? 0,
    surcharge_trip_ratio: 0, surcharge_trips_per_day: 0, bus_stops_500m: 0, tier: '직접 선택',
    why: `${z.gu} ${z.name}에서 직접 고른 출발지`,
  }
}

// 현재 위치(위도·경도) → 가장 가까운 읍면동 id
export const nearestZoneId = (lat, lon) => `zone:${nearestZone(lat, lon).zone_id}`

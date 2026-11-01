// 앱 전체에서 쓰는 데이터와 공용 계산
import fareRules from '../data/web/02_fare_rules/fare_rules.json'
import zoneList from '../data/web/01_zones/zones.json'
import shapes from '../data/web/01_zones/zone_shapes.json'
import topDest from '../data/web/03_demand/zone_top_dest.json'
import tims from '../data/web/10_tims/tims_app.json'
import spots from '../data/web/13_spots/spots.json'
import { quote, splitFare, haversineM } from './lib/fare.js'

export { tims, spots }
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

export const spotZoneId = (s) => zoneByName[s.zone]?.zone_id ?? nearestZone(s.lat, s.lon).zone_id
// 그 지역에서 택시로 가장 많이 가는 다른 지역 (할증 구간 우선, 순위만 공개)
export const usualDest = (zoneId) => topDest[zoneId]?.[0] ?? null
// 귀로 목적지: 상위 목적지 중 첫 번째 동(시내)
export const cityDest = (zoneId) => topDest[zoneId]?.find((d) => !zoneById[d]?.is_eupmyeon) ?? null

// 추천 스팟 목록 (실제 대기 인원은 로그인 시 서버 모집으로 채운다)
export function waitingBySpot() {
  return spots.map((s) => {
    const z = spotZoneId(s)
    return { spot: s, zone: z, waiting: 0, destZone: usualDest(z) }
  }).sort((a, b) => b.spot.pickups_per_day - a.spot.pickups_per_day)
}

// 구간 거리(추정): 같은 지역 안은 평균 이동거리, 다른 지역은 중심점 직선거리 × 1.35(도로 우회)
const INTRA_KM = { dong: 2.5, eup: 3.5, myeon: 4.0 }
export function estKm(o, d) {
  const a = zoneById[o], b = zoneById[d]
  if (!a || !b) return 5
  if (o === d) return INTRA_KM[a.type] ?? 3
  return Math.round(haversineM(a.centroid_lon, a.centroid_lat, b.centroid_lon, b.centroid_lat) * 1.35 / 10) / 100
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

// 좌표가 들어 있는 읍면동 (경계 다각형 판정). 청주 밖이면 null
function inRing(x, y, ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j]
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside
  }
  return inside
}
export function zoneAt(lat, lon) {
  for (const [id, rings] of Object.entries(shapes)) if (rings.some((r) => inRing(lon, lat, r))) return Number(id)
  return null
}

// 좌표 → 출발지: 추천 스팟이 걸어갈 거리(800m) 안이면 그 스팟, 아니면 그 읍면동
export const WALK_M = 800
export function locate(lat, lon) {
  const zoneId = zoneAt(lat, lon)
  if (!zoneId) return null
  const near = spots.map((s) => ({ s, d: haversineM(lon, lat, s.lon, s.lat) })).sort((a, b) => a.d - b.d)[0]
  return { zoneId, id: near.d <= WALK_M ? near.s.id : `zone:${zoneId}`, nearSpot: near.s, nearM: Math.round(near.d) }
}
export const walkMin = (m) => Math.max(1, Math.round(m / 70))

// 그 지역에서 기본으로 보여 줄 목적지: 읍·면이면 시내(귀로), 동이면 가장 많이 가는 곳
export const defaultDest = (zoneId) => (zoneById[zoneId]?.is_eupmyeon && cityDest(zoneId)) || usualDest(zoneId)
export const destChoices = (zoneId) => [...new Set([defaultDest(zoneId), ...(topDest[zoneId] ?? [])])].filter((d) => d && d !== zoneId)

// 귀로 매칭 대상: 읍·면에서 출발해 시내(동)로 가는 이동 = 읍·면에 손님을 내려준 택시가 돌아가는 방향
export const isReturnRoute = (originZoneId, destZoneId) =>
  !!(zoneById[originZoneId]?.is_eupmyeon && zoneById[destZoneId] && !zoneById[destZoneId].is_eupmyeon)

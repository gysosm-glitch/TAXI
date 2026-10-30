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

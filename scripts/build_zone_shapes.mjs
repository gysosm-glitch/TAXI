// 앱용 가벼운 읍면동 경계: 좌표를 소수 3자리(약 100m)로 줄이고 겹치는 점을 뺀다 (GPS 위치 → 읍면동 판정용)
// 입력: data/web/01_zones/zones.geojson  출력: data/web/01_zones/zone_shapes.json  { 존번호: [[[lon,lat],...] 외곽선들] }
// Usage: node scripts/build_zone_shapes.mjs
import { readFileSync, writeFileSync } from 'node:fs'

const geo = JSON.parse(readFileSync(new URL('../data/web/01_zones/zones.geojson', import.meta.url)))
const r3 = (v) => Math.round(v * 1000) / 1000
const out = {}
for (const f of geo.features) {
  const polys = f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [f.geometry.coordinates]
  out[f.properties.zone_id] = polys.map((p) => {
    const ring = []
    for (const [x, y] of p[0]) {
      const pt = [r3(x), r3(y)]
      const last = ring.at(-1)
      if (!last || last[0] !== pt[0] || last[1] !== pt[1]) ring.push(pt)
    }
    return ring
  }).filter((ring) => ring.length >= 4)
}
const file = new URL('../data/web/01_zones/zone_shapes.json', import.meta.url)
writeFileSync(file, JSON.stringify(out))
console.log('zones', Object.keys(out).length, 'bytes', JSON.stringify(out).length)

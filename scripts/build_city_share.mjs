// 읍·면별 '시내(동)행 비율': 그 읍·면에서 타는 택시 중 시내로 가는 비율 (귀로 손님 확률 계산용)
// 입력: private/derived/taxi_od_pairs.min.json (KTDB 파생, 비공개)  출력: data/web/03_demand/zone_city_share.json (비율만)
// Usage: node scripts/build_city_share.mjs
import { readFileSync, writeFileSync } from 'node:fs'

const read = (p) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url)))
const pairs = read('private/derived/taxi_od_pairs.min.json')
const zones = read('data/web/01_zones/zones.json')
const isDong = Object.fromEntries(zones.map((z) => [z.zone_id, !z.is_eupmyeon]))
const tot = {}, city = {}
for (const p of pairs) {
  if (isDong[p.o] || !p.taxi) continue
  tot[p.o] = (tot[p.o] || 0) + p.taxi
  if (isDong[p.d]) city[p.o] = (city[p.o] || 0) + p.taxi
}
const out = Object.fromEntries(Object.keys(tot).map((z) => [z, +((city[z] || 0) / tot[z]).toFixed(3)]))
writeFileSync(new URL('../data/web/03_demand/zone_city_share.json', import.meta.url), JSON.stringify(out))
console.log(out)

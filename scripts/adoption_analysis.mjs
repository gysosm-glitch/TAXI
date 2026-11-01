// 보급 전략 분석: (1) 앱을 쓰는 기사만 본 수입 변화 (2) 오송 거점 집중 vs 청주 전체에 얇게
// 입력: private/derived/taxi_od_pairs.min.json (비공개)  출력: data/web/12_simulation/adoption.json (합계·비율만)
// Usage: node scripts/adoption_analysis.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { runDay } from '../src/lib/agents.js'

const read = (p) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url)))
const pairs = read('private/derived/taxi_od_pairs.min.json')
const zones = read('data/web/01_zones/zones.json')
const tims = read('data/web/10_tims/tims_app.json')
const pickups = Object.fromEntries(tims.zones.map((z) => [z.zone_id, z.rides_per_day]))
const SEEDS = [20261030, 20261101]
const OSONG = 131
const avg = (rs, f) => rs.reduce((a, r) => a + f(r), 0) / rs.length
const run = (params) => SEEDS.map((seed) => runDay(pairs, zones, pickups, { scale: 1, inducedDemand: 0, ...params, seed }))
const pct = (a, b) => +(100 * (a / b - 1)).toFixed(2)

// (1) 참여 기사 수입: 같은 기사 집단을 귀로 매칭 전후로 비교
const drivers = [0.1, 0.3].map((a) => {
  const base = run({ appShare: a }), ret = run({ appShare: a, returnMatching: true })
  return {
    appShare: a,
    appDriverRevChangePct: pct(avg(ret, (r) => r.appDrivers.revenuePerVehicleDay), avg(base, (r) => r.appDrivers.revenuePerVehicleDay)),
    otherDriverRevChangePct: pct(avg(ret, (r) => r.otherDrivers.revenuePerVehicleDay), avg(base, (r) => r.otherDrivers.revenuePerVehicleDay)),
    appDriverWonPerDay: Math.round(avg(ret, (r) => r.appDrivers.revenuePerVehicleDay) - avg(base, (r) => r.appDrivers.revenuePerVehicleDay)),
  }
})
console.log('참여 기사', JSON.stringify(drivers))

// (2) 같은 기사 10%로: 승객 앱을 청주 전체 10% vs 오송 출발 승객 50%에만
const spread = run({ appShare: 0.1, returnMatching: true })
const focus = run({ appZones: [OSONG], appZoneShare: 0.5, driverAppShare: 0.1, returnMatching: true })
const at = (rs) => ({
  osongReturnPerDay: Math.round(avg(rs, (r) => r.returnByZone[OSONG] || 0)),
  osongReturnSharePct: +(100 * avg(rs, (r) => r.returnShareByZone[OSONG] || 0)).toFixed(1),
  cityReturnPerDay: Math.round(avg(rs, (r) => r.returnMatchedPerDay)),
})
const strategy = { spread: at(spread), focus: at(focus) }
console.log('거점 집중', JSON.stringify(strategy))

writeFileSync(new URL('../data/web/12_simulation/adoption.json', import.meta.url), JSON.stringify({
  generatedAt: new Date().toISOString(), seeds: SEEDS, drivers, strategy,
  notes: ['참여 기사: 앱을 쓰는 기사 집단의 차량당 하루 수입을 귀로 매칭 전후로 비교 (할증 그대로)',
    '거점 집중: 기사 앱 이용 10%는 같고, 승객 앱 이용을 청주 전체 10% 대신 오송읍 출발 승객 50%에만 둔 경우'],
}, null, 1))

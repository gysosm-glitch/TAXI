// 귀로 매칭 손익분기 분석: 할증을 얼마나 면제하면 기사 수입이 줄고, 그 손실을 귀로 1건당 얼마로 메울 수 있나
// 입력: private/derived/taxi_od_pairs.min.json (KTDB 파생, 비공개)  출력: data/web/12_simulation/return_matching.json (합계·비율만)
// Usage: node scripts/return_matching_analysis.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { runDay } from '../src/lib/agents.js'

const read = (p) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url)))
const pairs = read('private/derived/taxi_od_pairs.min.json')
const zones = read('data/web/01_zones/zones.json')
const tims = read('data/web/10_tims/tims_app.json')
const pickups = Object.fromEntries(tims.zones.map((z) => [z.zone_id, z.rides_per_day]))
const SEEDS = [20261030, 20261101]

// 같은 조건을 시드별로 돌려 평균
function run(params) {
  const rs = SEEDS.map((seed) => runDay(pairs, zones, pickups, { scale: 1, inducedDemand: 0, ...params, seed }))
  const avg = (f) => rs.reduce((a, r) => a + f(r), 0) / rs.length
  return {
    revDay: avg((r) => r.driverRevenuePerDay), revHour: avg((r) => r.driverRevenuePerHour),
    empty: avg((r) => r.emptyKmRatio), returnPerDay: avg((r) => r.returnMatchedPerDay), returnShare: avg((r) => r.returnMatchShare),
    exemptedPerDay: avg((r) => r.exemptedWonPerDay), surchargePerDay: avg((r) => r.surchargePaidPerDay),
    served: avg((r) => r.servedPerDay), abandon: avg((r) => r.abandonRate), wait: avg((r) => r.avgWaitMin),
  }
}

const t0 = Date.now()
const base = run({})
const fmt = (r) => ({
  revHour: Math.round(r.revHour), revChangePct: +(100 * (r.revDay / base.revDay - 1)).toFixed(2),
  emptyPct: +(100 * r.empty).toFixed(1), returnPerDay: Math.round(r.returnPerDay), returnSharePct: +(100 * r.returnShare).toFixed(1),
  exemptPerTrip: r.returnPerDay ? Math.round(r.exemptedPerDay / r.returnPerDay) : 0,
  // 기사 손실을 귀로 매칭 1건당 얼마로 메우면 현행 수입과 같아지나
  breakEvenFeePerTrip: r.returnPerDay ? Math.max(0, Math.round((base.revDay - r.revDay) / r.returnPerDay)) : 0,
  surchargeCutPct: +(100 * (1 - r.surchargePerDay / base.surchargePerDay)).toFixed(1),
  abandonPct: +(100 * r.abandon).toFixed(2),
})

const APP = [0.1, 0.3, 0.5, 1]
const EXEMPT = [0, 0.25, 0.5, 0.75, 1]
const grid = []
for (const a of APP) for (const e of EXEMPT) {
  const r = run({ returnMatching: true, appShare: a, returnExempt: e > 0, exemptRatio: e })
  grid.push({ appShare: a, exemptRatio: e, ...fmt(r) })
  console.log(`앱 ${a * 100}% 면제 ${e * 100}% → 수입 ${fmt(r).revChangePct}% 공차 ${fmt(r).emptyPct}% 귀로 ${fmt(r).returnPerDay}건(${fmt(r).returnSharePct}%) 손익분기 ${fmt(r).breakEvenFeePerTrip}원/건  (${Math.round((Date.now() - t0) / 1000)}s)`)
}

// 기사 손해 없이 가능한 최대 면제율 (수입 변화가 0이 되는 지점, 선형 보간)
const maxExempt = APP.map((a) => {
  const row = grid.filter((g) => g.appShare === a).sort((x, y) => x.exemptRatio - y.exemptRatio)
  for (let i = 1; i < row.length; i++) {
    const [p, q] = [row[i - 1], row[i]]
    if (p.revChangePct >= 0 && q.revChangePct < 0) return { appShare: a, maxExemptRatio: +(p.exemptRatio + (q.exemptRatio - p.exemptRatio) * p.revChangePct / (p.revChangePct - q.revChangePct)).toFixed(2) }
  }
  return { appShare: a, maxExemptRatio: row.at(-1).revChangePct >= 0 ? 1 : 0 }
})

// 면제로 수요가 늘 때 (가격탄력성 가정)
const induced = [0.1, 0.2].map((d) => ({ inducedDemand: d, ...fmt(run({ returnMatching: true, appShare: 0.3, returnExempt: true, exemptRatio: 1, inducedDemand: d })) }))

const out = {
  generatedAt: new Date().toISOString(),
  seeds: SEEDS,
  base: { revHour: Math.round(base.revHour), emptyPct: +(100 * base.empty).toFixed(1), servedPerDay: Math.round(base.served) },
  grid, maxExempt, induced,
  notes: [
    '기준(현행): TIMS 2025 청주 실측(차량당 하루 19.5회, 공차거리 46.5%)에 맞춰 보정한 하루 시뮬레이션',
    '귀로 매칭은 기사·승객이 모두 앱을 쓸 때만 성립. 면제는 그 운행에만 적용(정책 제안)',
    '금액은 운행 1건당·비율로만 해석. 연간 총액은 OD 규모 보정 불확실성 때문에 쓰지 않음',
    '수요 증가 효과는 기본 0%(보수적). 10·20% 가정은 induced 항목',
  ],
}
writeFileSync(new URL('../data/web/12_simulation/return_matching.json', import.meta.url), JSON.stringify(out, null, 1))
console.log('최대 면제율(기사 손해 없음):', JSON.stringify(maxExempt))
console.log('수요 증가 가정:', JSON.stringify(induced))
console.log('완료', Math.round((Date.now() - t0) / 1000), 's')

// 실제 규모(scale 1)로 시나리오·민감도 시뮬레이션을 미리 계산해 data/web/12_simulation/agent_results.json에 저장한다.
// Usage: node scripts/precompute_agents.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { runDay, SCENARIOS } from '../src/lib/agents.js'

const read = (p) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url)))
const pairs = read('private/derived/taxi_od_pairs.min.json')   // KTDB 파생, 비공개
const zones = read('data/web/01_zones/zones.json')
const tims = read('data/web/10_tims/tims_app.json')
const pickups = Object.fromEntries(tims.zones.map((z) => [z.zone_id, z.rides_per_day]))

const pick = (r) => ({
  requestsPerDay: r.requestsPerDay, servedPerDay: r.servedPerDay, abandonRate: r.abandonRate, avgWaitMin: r.avgWaitMin,
  taxiTripsPerDay: r.taxiTripsPerDay, emptyKmRatio: r.emptyKmRatio, driverRevenuePerDay: r.driverRevenuePerDay,
  driverRevenuePerHour: r.driverRevenuePerHour, tripsPerVehicleDay: r.tripsPerVehicleDay, passengerAvgPaid: r.passengerAvgPaid,
  passengerSavingPerDay: r.passengerSavingPerDay, surchargePaidPerDay: r.surchargePaidPerDay, sharedRiderRate: r.sharedRiderRate,
  returnMatchedPerDay: r.returnMatchedPerDay, returnByZone: r.returnByZone, sharedByZone: r.sharedByZone, exemptedWonPerDay: r.exemptedWonPerDay, corridor: r.corridor,
})
const run = (params) => pick(runDay(pairs, zones, pickups, { scale: 1, ...params }))

const t0 = Date.now()
const scenarios = SCENARIOS.map((s) => ({ id: s.id, label: s.label, params: s.params, result: run(s.params) }))
const base = scenarios[0].result
console.log('시나리오 완료', Date.now() - t0, 'ms')

const sensitivity = {
  shareParticipation: [0.05, 0.1, 0.2, 0.3].map((v) => ({ value: v, result: run({ sharing: true, shareParticipation: v }) })),
  returnWaitMin: [15, 25, 35].map((v) => ({ value: v, result: run({ returnMatching: true, returnWaitMin: v }) })),
  inducedDemand: [0, 0.1, 0.2, 0.3].map((v) => ({ value: v, result: run({ returnMatching: true, returnExempt: true, inducedDemand: v }) })),
  shareFeeWon: [0, 500, 1000].map((v) => ({ value: v, result: run({ sharing: true, shareParticipation: 0.2, shareFeeWon: v }) })),
}
console.log('민감도 완료', Date.now() - t0, 'ms')

// 기사 손익분기: 귀로 할증 면제(S3)로 줄어드는 기사 매출을 시가 보전해야 하는 금액
const s3 = scenarios.find((s) => s.id === 'S3').result
const breakEven = {
  baseRevenuePerDay: base.driverRevenuePerDay,
  s3RevenuePerDay: s3.driverRevenuePerDay,
  compensationPerYear: Math.max(0, base.driverRevenuePerDay - s3.driverRevenuePerDay) * 365,
  exemptedPerYear: s3.exemptedWonPerDay * 365,
  inducedDemandForBreakEven: (() => {
    for (const s of sensitivity.inducedDemand) if (s.result.driverRevenuePerDay >= base.driverRevenuePerDay) return s.value
    return null
  })(),
}

const out = {
  generatedAt: new Date().toISOString(),
  calibration: {
    target: { tripsPerVehicleDay: tims.cheongju_per_vehicle_day_2025.trips, emptyKmRatio: tims.cheongju_per_vehicle_day_2025.empty_km_ratio,
      pickupsPerDay: tims.calibration.tims_pickups_per_day },
    model: { tripsPerVehicleDay: base.tripsPerVehicleDay, emptyKmRatio: base.emptyKmRatio, requestsPerDay: base.requestsPerDay },
  },
  assumptions: [
    '수요: 2024 평일 OD 택시통행 × 0.2994(TIMS 2025 실측 승차량 보정) × 시간대 비중(가정)',
    '차량: TIMS 2025 청주 하루 영업대수 2,956대, 1대당 운행 8.9시간',
    '이동속도 24km/h, 존 간 거리는 중심점 직선거리 × 1.35',
    '읍·면 하차 후 대기: 현행 8분, 귀로 매칭 시 25분까지(대기 추천), 이후 가장 가까운 동으로 빈 차 복귀',
    '합승: 같은 출발 읍면동·동성·목적지 3km 이내·10분 안, 최대 3명, 단독요금 비례 분담',
    '할증 면제는 정책 모드(시 고시 변경 전제). 면제 구간 수요 증가율은 가정값',
  ],
  scenarios, sensitivity, breakEven,
}
mkdirSync(new URL('../data/web/12_simulation/', import.meta.url), { recursive: true })
writeFileSync(new URL('../data/web/12_simulation/agent_results.json', import.meta.url), JSON.stringify(out))
for (const s of scenarios) {
  const r = s.result
  console.log(s.id, s.label, '| 공차', (r.emptyKmRatio * 100).toFixed(1), '| 시간당', Math.round(r.driverRevenuePerHour),
    '| 포기', (r.abandonRate * 100).toFixed(1), '| 할증/일', Math.round(r.surchargePaidPerDay / 1e4), '만 | 귀로', r.returnMatchedPerDay,
    '| 구간 평균', Math.round(r.corridor.avgPaid), '| 구간 합승', (r.corridor.sharedRate * 100).toFixed(1), '| 승객절감/일', Math.round(r.passengerSavingPerDay / 1e4), '만')
}
for (const [k, arr] of Object.entries(sensitivity)) console.log(k, arr.map((a) => `${a.value}: 매출/일 ${Math.round(a.result.driverRevenuePerDay / 1e6)}M, 합승 ${(a.result.sharedRiderRate * 100).toFixed(1)}%, 구간합승 ${(a.result.corridor.sharedRate * 100).toFixed(1)}%, 공차 ${(a.result.emptyKmRatio * 100).toFixed(1)}%`).join(' / '))
console.log('손익분기', JSON.stringify(breakEven))

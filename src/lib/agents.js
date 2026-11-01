// 택시·승객 행위자 기반 하루 시뮬레이션 (1분 단위).
// 기준 시나리오는 TIMS 실측(청주 하루 승차 약 5.8만 건, 공차거리 비율 46.5%)을 재현하도록 보정한다.
import { HOUR_PROFILE } from './hours.js'

const SURCHARGED = new Set(['dong_to_eupmyeon', 'eupmyeon_to_other_eupmyeon'])
const SPEED_KM_PER_MIN = 0.4          // 평균 24km/h (가정)
const INTRA_PICKUP_KM = 1.0           // 같은 존 안 배차 이동거리 (가정)
const MAX_PICKUP_MIN = 15             // 이보다 멀면 배차하지 않음
const MAX_WAIT_MIN = 20               // 승객이 이보다 오래 기다리면 포기
const SHIFT_HOURS = 8.9               // TIMS 1대당 1일 운행시간 31,992초

function rng(seed) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function poisson(lambda, rand) {
  if (lambda > 30) {
    const g = Math.sqrt(-2 * Math.log(rand() || 1e-9)) * Math.cos(2 * Math.PI * rand())
    return Math.max(0, Math.round(lambda + Math.sqrt(lambda) * g))
  }
  const l = Math.exp(-lambda)
  let k = 0, p = 1
  do { k++; p *= rand() } while (p > l)
  return k - 1
}

export const DEFAULT_PARAMS = {
  scale: 0.1,                 // 실제 규모의 10%로 계산 후 결과를 10배
  odFactor: 0.2994,           // OD 택시통행 → TIMS 실측 승차량 보정계수
  fleetPerDay: 2956,          // TIMS 2025 청주 하루 영업대수
  cruiseKmPerMin: 0.62,       // 빈 차 배회 거리 (기준 시나리오가 TIMS 공차거리 비율 46.5%를 재현하도록 보정)
  sharing: false,             // 합승 매칭
  shareParticipation: 0.1,    // 합승 의향 승객 비율 (스팟 밖)
  spotZones: [],              // 매칭 스팟이 있는 존: 이곳 출발 승객은 스팟에 모여 매칭
  spotParticipation: 0.3,     // 스팟 출발 승객 중 앱 매칭 이용 비율 (가정)
  shareWindowMin: 10,         // 합승 상대를 기다리는 최대 시간
  shareDestKm: 3,             // 목적지가 이 거리 안이면 순차 하차로 합승
  maxParty: 3,
  returnMatching: false,      // 귀로 매칭 (읍·면 하차 후 귀로 콜 연결 + 대기 추천)
  returnWaitMin: 25,          // 귀로 매칭 시 읍·면 대기 상한 (현행 기사 감각 대기 8분)
  baseReturnWaitMin: 8,
  returnExempt: false,        // 정책 모드: 귀로 매칭 승객은 할증 면제
  inducedDemand: 0.1,         // 할증 면제 구간의 수요 증가율 (가격탄력성 가정)
  shareFeeWon: 0,             // 합승 추가 승객 1인당 기사 몫 수수료
  seed: 20261030,
}

/**
 * @param pairs  [{o,d,cat,taxi,km,fd,fe}]
 * @param zones  [{zone_id,type,centroid_lon,centroid_lat}]
 * @param pickupsByZone {zone_id: TIMS 하루 승차}  — 초기 차량 배치 가중치
 */
export function runDay(pairs, zones, pickupsByZone, params = {}) {
  const P = { ...DEFAULT_PARAMS, ...params }
  const rand = rng(P.seed)
  const zoneById = Object.fromEntries(zones.map((z) => [z.zone_id, z]))
  const isEM = (z) => zoneById[z].type !== 'dong'
  const km = new Map(pairs.map((p) => [`${p.o}-${p.d}`, p.km]))
  const dist = (a, b) => (a === b ? INTRA_PICKUP_KM : km.get(`${a}-${b}`) ?? 10)
  const pairByKey = new Map(pairs.map((p) => [`${p.o}-${p.d}`, p]))

  // 읍·면에서 빈 차로 돌아갈 때의 목적지: 가장 가까운 동
  const dongs = zones.filter((z) => z.type === 'dong').map((z) => z.zone_id)
  const hubOf = {}
  for (const z of zones) {
    if (z.type === 'dong') continue
    hubOf[z.zone_id] = dongs.reduce((best, d) => (dist(z.zone_id, d) < dist(z.zone_id, best) ? d : best), dongs[0])
  }

  // ---------------------------------------------------------------- 수요 생성
  const profileSum = HOUR_PROFILE.reduce((a, b) => a + b, 0)
  const requests = []
  for (const p of pairs) {
    if (!p.taxi) continue
    const exemptable = P.returnExempt && P.returnMatching && isEM(p.o) && !isEM(p.d)
    const daily = p.taxi * P.odFactor * P.scale * (exemptable ? 1 + P.inducedDemand : 1)
    for (let h = 0; h < 24; h++) {
      const n = poisson((daily * HOUR_PROFILE[h]) / profileSum, rand)
      for (let i = 0; i < n; i++) {
        requests.push({
          o: p.o, d: p.d, cat: p.cat, t: h * 60 + Math.floor(rand() * 60),
          gender: rand() < 0.5 ? 'F' : 'M',
          share: P.sharing && rand() < (P.spotZones.includes(p.o) ? P.spotParticipation : P.shareParticipation),
          induced: exemptable && rand() < P.inducedDemand / (1 + P.inducedDemand),
        })
      }
    }
  }
  requests.sort((a, b) => a.t - b.t)

  // ---------------------------------------------------------------- 차량
  const fleetTotal = Math.round(P.fleetPerDay * P.scale)
  const weights = zones.map((z) => pickupsByZone[z.zone_id] || 1)
  const wsum = weights.reduce((a, b) => a + b, 0)
  const taxis = []
  for (let i = 0; i < fleetTotal; i++) {
    let r = rand() * wsum, k = 0
    while (r > weights[k]) { r -= weights[k]; k++ }
    taxis.push({ id: i, zone: zones[k].zone_id, state: 'off', until: 0, idleSince: 0, arrivedLoaded: false,
      busyKm: 0, emptyKm: 0, revenue: 0, trips: 0, onMin: 0 })
  }
  const activeTarget = (h) => Math.round((fleetTotal * SHIFT_HOURS / 24) * (HOUR_PROFILE[h] / (profileSum / 24)))

  // ---------------------------------------------------------------- 집계
  const M = { requests: 0, served: 0, abandoned: 0, waitSum: 0, paid: 0, surchargePaid: 0, riders: 0,
    sharedRiders: 0, soloSum: 0, returnMatched: 0, returnByZone: {}, sharedByZone: {}, exemptedWon: 0, corridor: { requests: 0, served: 0, paid: 0, shared: 0, solo: 0 } }
  const waiting = []                  // 배차 대기 중인 파티
  let ri = 0

  const farePair = (o, d) => pairByKey.get(`${o}-${d}`)

  for (let t = 0; t < 1440; t++) {
    const h = Math.floor(t / 60)

    // 근무 차량 수 조정 (빈 차 중에서 켜고 끔)
    if (t % 60 === 0) {
      const target = activeTarget(h)
      let on = taxis.filter((x) => x.state !== 'off').length
      for (const x of taxis) {
        if (on < target && x.state === 'off') { x.state = 'idle'; x.idleSince = t; on++ }
        else if (on > target && x.state === 'idle') { x.state = 'off'; on-- }
      }
    }

    // 운행 완료 처리
    for (const x of taxis) {
      if ((x.state === 'busy' || x.state === 'returning') && x.until <= t) {
        x.arrivedLoaded = x.state === 'busy'
        x.state = 'idle'; x.idleSince = t
      }
    }

    // 새 요청 → 파티 구성 (합승 의향이 있으면 같은 출발·도착·성별 파티에 합류)
    while (ri < requests.length && requests[ri].t <= t) {
      const r = requests[ri++]
      M.requests++
      const corridor = isEM(r.o) !== isEM(r.d) && ['오송읍', '오창읍'].some((n) => n === zoneById[r.o].name || n === zoneById[r.d].name)
      r.corridor = corridor
      if (corridor) M.corridor.requests++
      const join = r.share && waiting.find((p) => p.share && p.o === r.o && p.gender === r.gender &&
        (p.d === r.d || dist(p.d, r.d) <= P.shareDestKm) && p.members.length < P.maxParty && t - p.t0 <= P.shareWindowMin)
      if (join) join.members.push(r)
      else waiting.push({ o: r.o, d: r.d, gender: r.gender, share: r.share, t0: t, members: [r] })
    }

    // 배차: 오래 기다린 파티부터, 같은 존 빈 차 우선 → 가까운 빈 차
    for (let i = 0; i < waiting.length; i++) {
      const party = waiting[i]
      const full = party.members.length >= P.maxParty
      if (party.share && !full && t - party.t0 < P.shareWindowMin) continue   // 합승 상대 기다리는 중
      let best = null, bestKm = Infinity
      for (const x of taxis) {
        if (x.state !== 'idle') continue
        const d = dist(x.zone, party.o)
        if (d < bestKm) { bestKm = d; best = x }
      }
      const pickupMin = bestKm / SPEED_KM_PER_MIN
      if (best && pickupMin <= MAX_PICKUP_MIN) {
        const far = party.members.reduce((a, r) => (farePair(r.o, r.d).km > farePair(a.o, a.d).km ? r : a), party.members[0])
        const fp = farePair(far.o, far.d)
        const surcharged = SURCHARGED.has(fp.cat)
        const isReturn = P.returnMatching && best.arrivedLoaded && best.zone === party.o && isEM(party.o) && !isEM(party.d)
        const exempt = isReturn && P.returnExempt && surcharged
        const fare = surcharged && !exempt ? fp.fe : fp.fd
        const n = party.members.length
        best.emptyKm += party.o === best.zone ? 0.3 : bestKm
        best.busyKm += fp.km
        best.revenue += fare + (n - 1) * P.shareFeeWon
        best.trips++
        best.state = 'busy'
        best.until = t + Math.ceil(pickupMin + fp.km / SPEED_KM_PER_MIN)
        best.zone = far.d
        const solo = party.members.map((r) => { const q = farePair(r.o, r.d); return SURCHARGED.has(q.cat) && !exempt ? q.fe : q.fd })
        const soloSum = solo.reduce((a, b) => a + b, 0)
        party.members.forEach((r, k) => {
          const each = n > 1 ? Math.ceil((fare * solo[k]) / soloSum / 100) * 100 + P.shareFeeWon : fare
          M.served++; M.riders++; M.waitSum += t - r.t + pickupMin; M.paid += each
          if (surcharged && !exempt) M.surchargePaid += (fp.fe - fp.fd) / n
          if (n > 1) M.sharedRiders++
          if (r.corridor) { M.corridor.served++; M.corridor.paid += each; M.corridor.solo += solo[k]; if (n > 1) M.corridor.shared++ }
          M.soloSum += solo[k]
        })
        if (isReturn) { M.returnMatched++; M.returnByZone[party.o] = (M.returnByZone[party.o] || 0) + 1 }
        if (n > 1) M.sharedByZone[party.o] = (M.sharedByZone[party.o] || 0) + n
        if (exempt) M.exemptedWon += fp.fe - fp.fd
        waiting.splice(i, 1); i--
      } else if (t - party.t0 > MAX_WAIT_MIN) {
        M.abandoned += party.members.length
        waiting.splice(i, 1); i--
      }
    }

    // 빈 차 행동: 동은 배회, 읍·면은 대기 후 빈 차로 동 복귀
    for (const x of taxis) {
      if (x.state === 'off') continue
      x.onMin++
      if (x.state !== 'idle') continue
      if (isEM(x.zone)) {
        const limit = P.returnMatching && x.arrivedLoaded ? P.returnWaitMin : P.baseReturnWaitMin
        if (t - x.idleSince >= limit) {
          const hub = hubOf[x.zone]
          const d = dist(x.zone, hub)
          x.emptyKm += d; x.state = 'returning'; x.until = t + Math.ceil(d / SPEED_KM_PER_MIN); x.zone = hub
        }
      } else {
        x.emptyKm += P.cruiseKmPerMin
      }
    }
  }

  // ---------------------------------------------------------------- 결과 (실제 규모로 환산)
  const up = 1 / P.scale
  const busyKm = taxis.reduce((a, x) => a + x.busyKm, 0)
  const emptyKm = taxis.reduce((a, x) => a + x.emptyKm, 0)
  const revenue = taxis.reduce((a, x) => a + x.revenue, 0)
  const onHours = taxis.reduce((a, x) => a + x.onMin, 0) / 60
  const trips = taxis.reduce((a, x) => a + x.trips, 0)
  return {
    params: P,
    requestsPerDay: Math.round(M.requests * up),
    servedPerDay: Math.round(M.served * up),
    abandonRate: M.requests ? M.abandoned / M.requests : 0,
    avgWaitMin: M.served ? M.waitSum / M.served : 0,
    taxiTripsPerDay: Math.round(trips * up),
    emptyKmRatio: emptyKm / (emptyKm + busyKm),
    driverRevenuePerDay: revenue * up,
    driverRevenuePerHour: onHours ? revenue / onHours : 0,
    tripsPerVehicleDay: trips / (fleetTotal || 1),
    passengerAvgPaid: M.served ? M.paid / M.served : 0,
    passengerSavingPerDay: (M.soloSum - M.paid) * up,
    surchargePaidPerDay: M.surchargePaid * up,
    sharedRiderRate: M.served ? M.sharedRiders / M.served : 0,
    returnMatchedPerDay: Math.round(M.returnMatched * up),
    returnByZone: Object.fromEntries(Object.entries(M.returnByZone).map(([k, v]) => [k, Math.round(v * up)])),
    sharedByZone: Object.fromEntries(Object.entries(M.sharedByZone).map(([k, v]) => [k, Math.round(v * up)])),
    exemptedWonPerDay: M.exemptedWon * up,
    corridor: {
      requestsPerDay: Math.round(M.corridor.requests * up),
      servedRate: M.corridor.requests ? M.corridor.served / M.corridor.requests : 0,
      avgPaid: M.corridor.served ? M.corridor.paid / M.corridor.served : 0,
      sharedRate: M.corridor.served ? M.corridor.shared / M.corridor.served : 0,
      savingPerDay: (M.corridor.solo - M.corridor.paid) * up,
    },
  }
}

// 시나리오 묶음: 현행 / 합승 / 귀로 매칭 / 귀로+면제 / 합승+귀로+면제
export const SCENARIOS = [
  { id: 'S0', label: '현행', params: {} },
  { id: 'S1', label: '합승 매칭', params: { sharing: true } },
  { id: 'S2', label: '귀로 매칭', params: { returnMatching: true } },
  { id: 'S3', label: '귀로 매칭 + 할증 면제(정책)', params: { returnMatching: true, returnExempt: true } },
  { id: 'S4', label: '합승 + 귀로 + 면제', params: { sharing: true, returnMatching: true, returnExempt: true } },
  { id: 'S5', label: '스팟 매칭 (오송역·터미널·공항·오창·충북대) + 귀로', params: { sharing: true, shareParticipation: 0.02, spotZones: [131, 137, 142, 143, 130], spotParticipation: 0.3, returnMatching: true } },
]

// 합승 수요 시뮬레이션: OD 택시통행 × 시간대 비중 × 앱 참여율로 가상 요청을 만들고 규칙 기반으로 매칭한다.

// 시간대별 택시 이용 비중 (가정: 일반적인 택시 시간대 분포. TIMS 격자 영업통계로 교체 예정)
export const HOUR_PROFILE = [4.5, 3, 2, 1.2, 0.8, 1, 2, 4.5, 6, 5, 4.5, 4.5, 5, 4.5, 4.5, 4.5, 5, 5.5, 6.5, 5.5, 5, 5, 5.5, 5.5]
const PROFILE_SUM = HOUR_PROFILE.reduce((a, b) => a + b, 0)

// 재현 가능한 난수 (같은 시드 → 같은 결과, 발표 중 숫자가 바뀌지 않게)
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
  if (lambda > 30) return Math.max(0, Math.round(lambda + Math.sqrt(lambda) * gauss(rand)))
  const l = Math.exp(-lambda)
  let k = 0, p = 1
  do { k++; p *= rand() } while (p > l)
  return k - 1
}

function gauss(rand) {
  return Math.sqrt(-2 * Math.log(rand() || 1e-9)) * Math.cos(2 * Math.PI * rand())
}

const SURCHARGED = new Set(['dong_to_eupmyeon', 'eupmyeon_to_other_eupmyeon'])

/**
 * @param pairs   taxi_od_pairs.min.json 행 {o,d,on,dn,cat,taxi,km,fd,fe}
 * @param opts    { hour, participation(0~1), windowMin, maxParty, filter(pair)=>bool, seed }
 */
export function simulateHour(pairs, { hour, participation, windowMin = 15, maxParty = 3, filter = () => true, seed = 1 }) {
  const rand = rng(seed * 1000 + hour)
  const share = HOUR_PROFILE[hour] / PROFILE_SUM
  const riders = []
  for (const p of pairs) {
    if (!p.taxi || !filter(p)) continue
    const n = poisson(p.taxi * share * participation, rand)
    const fare = SURCHARGED.has(p.cat) ? p.fe : p.fd
    for (let i = 0; i < n; i++) {
      riders.push({ o: p.o, d: p.d, minute: rand() * 60, gender: rand() < 0.5 ? 'F' : 'M',
        fare, fareDong: p.fd, surcharged: SURCHARGED.has(p.cat) })
    }
  }

  // 같은 출발·도착 존 + 동성 + 대기시간 이내인 요청끼리 묶는다 (중형택시 기준, 보수적 규칙)
  const groups = new Map()
  for (const r of riders) {
    const key = `${r.o}-${r.d}-${r.gender}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(r)
  }
  const parties = []
  for (const list of groups.values()) {
    list.sort((a, b) => a.minute - b.minute)
    let party = null
    for (const r of list) {
      if (party && party.members.length < maxParty && r.minute - party.start <= windowMin) {
        party.members.push(r)
      } else {
        party = { start: r.minute, members: [r] }
        parties.push(party)
      }
    }
  }

  let matched = 0, waitSum = 0, soloSum = 0, paidSum = 0, surchargedRiders = 0, surchargedBeatDong = 0
  for (const party of parties) {
    const size = party.members.length
    const depart = size === maxParty ? party.members[size - 1].minute : party.start + windowMin
    for (const r of party.members) {
      const paid = size > 1 ? Math.ceil(r.fare / size / 100) * 100 : r.fare
      soloSum += r.fare
      paidSum += paid
      if (size > 1) { matched++; waitSum += depart - r.minute }
      if (r.surcharged) {
        surchargedRiders++
        if (paid < r.fareDong) surchargedBeatDong++
      }
    }
  }
  const n = riders.length
  return {
    requests: n,
    matched,
    matchRate: n ? matched / n : 0,
    avgWaitMin: matched ? waitSum / matched : 0,
    avgSoloFare: n ? soloSum / n : 0,
    avgPaid: n ? paidSum / n : 0,
    savingTotal: soloSum - paidSum,
    surchargedRiders,
    surchargedBeatDongRate: surchargedRiders ? surchargedBeatDong / surchargedRiders : 0,
    partySizes: parties.reduce((acc, p) => { acc[p.members.length] = (acc[p.members.length] || 0) + 1; return acc }, {}),
  }
}

// 하루 전체(24시간) 합계
export function simulateDay(pairs, opts) {
  const tot = { requests: 0, matched: 0, savingTotal: 0, waitSum: 0 }
  for (let h = 0; h < 24; h++) {
    const r = simulateHour(pairs, { ...opts, hour: h })
    tot.requests += r.requests
    tot.matched += r.matched
    tot.savingTotal += r.savingTotal
    tot.waitSum += r.avgWaitMin * r.matched
  }
  return { ...tot, matchRate: tot.requests ? tot.matched / tot.requests : 0, avgWaitMin: tot.matched ? tot.waitSum / tot.matched : 0 }
}

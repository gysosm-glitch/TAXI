// 청주 택시 요금·할증 엔진 (순수 함수). 요율은 data/web/02_fare_rules/fare_rules.json에서 주입.

export function meterFare(distanceM, rate) {
  const extra = Math.max(0, distanceM - rate.base_distance_m)
  return rate.base_fare + Math.ceil(extra / rate.unit_distance_m) * rate.unit_fare
}

// 출발·도착 존으로 할증 구분 판정 (2026-09-28 1단계 개편 반영)
export function surchargeCategory(origin, dest) {
  if (!origin.is_eupmyeon && !dest.is_eupmyeon) return 'dong_to_dong'
  if (origin.zone_id === dest.zone_id) return 'same_eupmyeon_internal'
  if (origin.is_eupmyeon && dest.is_eupmyeon) return 'eupmyeon_to_other_eupmyeon'
  return 'dong_to_eupmyeon'
}

export const CATEGORY_LABEL = {
  dong_to_dong: '동↔동 (할증 없음)',
  same_eupmyeon_internal: '같은 읍·면 내부 (9/28부터 해제)',
  dong_to_eupmyeon: '동↔읍·면 (35% 할증 유지)',
  eupmyeon_to_other_eupmyeon: '읍·면↔다른 읍·면 (35% 할증 유지)',
}

// ratePct: 할증률 시나리오(0~35). 35 = 현행 읍·면 요율, 0 = 동 요율, 그 사이는 선형 보간(가정)
export function quote({ origin, dest, distanceM, rules, ratePct = 35 }) {
  const category = surchargeCategory(origin, dest)
  const dong = meterFare(distanceM, rules.dong_rate)
  const eupmyeon = meterFare(distanceM, rules.eupmyeon_rate)
  const surcharged = rules.surcharge_applies[category]
  const nominal = rules.eupmyeon_rate.nominal_surcharge_pct
  const fare = surcharged ? Math.round(dong + ((eupmyeon - dong) * ratePct) / nominal) : dong
  return { category, surcharged, fare, fareDongRate: dong, surchargeWon: fare - dong }
}

// 합승 분담: 같은 목적지면 균등, 순차 하차면 단독요금 비례. 100원 단위 올림.
export function splitFare(total, soloFares) {
  const sum = soloFares.reduce((a, b) => a + b, 0)
  return soloFares.map((s) => Math.ceil((total * s) / sum / 100) * 100)
}

export function haversineM(lon1, lat1, lon2, lat2) {
  const r = 6371000
  const toRad = (d) => (d * Math.PI) / 180
  const dp = toRad(lat2 - lat1)
  const dl = toRad(lon2 - lon1)
  const a = Math.sin(dp / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dl / 2) ** 2
  return 2 * r * Math.asin(Math.sqrt(a))
}

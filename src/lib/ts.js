// 한국교통안전공단 정보공개 자료(2026.4~9, 청주 행정동 간 시간대별 택시 승하차) 요약
// 만드는 법: python scripts/build_ts_od.py → data/web/15_ts_od/ts_od_app.json
import ts from '../../data/web/15_ts_od/ts_od_app.json'

export { ts }
export const TS_SOURCE = '한국교통안전공단 2026.4~9 실측'
export const tsZone = (zoneId) => ts.eupmyeon.find((z) => z.zone_id === zoneId) ?? null

// 그 읍·면의 지금 시간대 하루 평균 (승차·시내행 손님·시내에서 들어온 택시)
export function tsNow(zoneId, hour = new Date().getHours()) {
  const z = tsZone(zoneId)
  if (!z) return null
  return {
    zone: z,
    pickups: z.pickups_by_hour[hour],
    toCity: z.to_city_by_hour[hour],
    fromCity: z.from_city_by_hour[hour],
    // 지금 시간대 중 시내행 손님 비율 (전체 승차 대비)
    cityShare: z.pickups_by_hour[hour] ? z.to_city_by_hour[hour] / z.pickups_by_hour[hour] : z.city_share,
  }
}

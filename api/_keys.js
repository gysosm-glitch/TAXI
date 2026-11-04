// 서버 함수 공용: 환경변수에서 API 키 찾기 (이름이 조금 달라도 찾는다). '_'로 시작해 API 주소로 노출되지 않는다.
// 붙여넣을 때 섞여 들어간 앞뒤 공백·줄바꿈은 지운다 (열차 키가 65자로 들어가 인증에 실패했던 사례)
const clean = (v) => (typeof v === 'string' ? v.trim() : v) || undefined
const find = (exact, pattern) =>
  exact.map((n) => clean(process.env[n])).find(Boolean) ??
  clean(process.env[Object.keys(process.env).find((n) => pattern.test(n) && !/^VITE_/.test(n))])

export const tagoKey = () => find(['TAGO_API_KEY'], /^TAGO.*KEY$/i)
export const arrivalKey = () => find(['TAGO_ARRIVAL_API_KEY'], /ARRIV/i) ?? tagoKey()
export const routeKey = () => find(['TAGO_ROUTE_API_KEY'], /ROUTE/i) ?? tagoKey()
export const trainKey = () => find(['TAGO_TRAIN_API_KEY'], /TRAIN|KTX|RAIL/i) ?? tagoKey()
// 고속버스 도착정보·시외버스정보 키. 없으면 같은 계정의 TAGO 키로 시도한다
export const expressKey = () => find(['TAGO_SPPEDBUS_API', 'TAGO_SPEEDBUS_API', 'TAGO_EXPRESS_API_KEY'], /SP+EEDBUS|EXPRESS|EXP_?BUS|GOSOK/i) ?? tagoKey()
export const suburbKey = () => find(['TAGO_BUS_API', 'TAGO_SUBURB_API_KEY'], /SUBURB|SUBERB|INTERCITY|SIOE/i) ?? tagoKey()
export const vworldKey = () => find(['VWORLD_API_KEY'], /VWORLD/i)

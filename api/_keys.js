// 서버 함수 공용: 환경변수에서 API 키 찾기 (이름이 조금 달라도 찾는다). '_'로 시작해 API 주소로 노출되지 않는다.
const find = (exact, pattern) =>
  exact.map((n) => process.env[n]).find(Boolean) ??
  process.env[Object.keys(process.env).find((n) => pattern.test(n) && !/^VITE_/.test(n))]

export const tagoKey = () => find(['TAGO_API_KEY'], /^TAGO.*KEY$/i)
export const arrivalKey = () => find(['TAGO_ARRIVAL_API_KEY'], /ARRIV/i) ?? tagoKey()
export const routeKey = () => find(['TAGO_ROUTE_API_KEY'], /ROUTE/i) ?? tagoKey()
export const trainKey = () => find(['TAGO_TRAIN_API_KEY'], /TRAIN|KTX|RAIL/i) ?? tagoKey()

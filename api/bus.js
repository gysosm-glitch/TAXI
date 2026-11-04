// Vercel 서버 함수: 스팟 주변 버스 정류장의 실시간 도착 정보 (국토교통부 TAGO)
// 환경변수 (공공데이터포털 일반 인증키 Decoding)
//   TAGO_API_KEY          버스정류소정보 15098534
//   TAGO_ARRIVAL_API_KEY  버스도착정보 15098530 (없으면 TAGO_API_KEY를 같이 씀)
import { tagoKey, arrivalKey, routeKey } from './_keys.js'
const BASE = 'https://apis.data.go.kr/1613000'

const items = (json) => {
  const it = json?.response?.body?.items?.item
  return it ? (Array.isArray(it) ? it : [it]) : []
}
const header = (json) => json?.response?.header ?? null

// 노선별 정류소 순서: 잘 바뀌지 않으므로 함수 인스턴스가 살아 있는 동안 재사용한다
const routeStops = new Map()
async function stopsOf(key, city, routeId) {
  if (routeStops.has(routeId)) return routeStops.get(routeId)
  const json = await fetch(`${BASE}/BusRouteInfoInqireService/getRouteAcctoThrghSttnList?serviceKey=${key}&cityCode=${city}&routeId=${routeId}&numOfRows=300&pageNo=1&_type=json`, { signal: AbortSignal.timeout(5000) }).then((r) => r.json())
  const list = items(json).sort((a, b) => Number(a.nodeord) - Number(b.nodeord))
  if (list.length) routeStops.set(routeId, list)
  return list
}
// 이 정류장 다음에 서는 곳. 같은 정류장을 두 번 지나면 방향을 정할 수 없어 비운다
function nextStop(list, nodeId) {
  const hits = list.map((s, i) => (s.nodeid === nodeId ? i : -1)).filter((i) => i >= 0)
  if (hits.length !== 1) return null
  return list[hits[0] + 1]?.nodenm ?? '종점'
}

export default async function handler(req, res) {
  const key = tagoKey()
  if (!key) return res.status(200).json({ ok: false, reason: 'no_key' })
  const { lat, lon } = req.query
  if (!lat || !lon) return res.status(400).json({ ok: false, reason: 'lat, lon 필요' })
  const k = encodeURIComponent(key)
  const ka = encodeURIComponent(arrivalKey())
  const kr = encodeURIComponent(routeKey())
  try {
    const near = await fetch(`${BASE}/BusSttnInfoInqireService/getCrdntPrxmtSttnList?serviceKey=${k}&gpsLati=${lat}&gpsLong=${lon}&numOfRows=12&pageNo=1&_type=json`).then((r) => r.json())
    // 같은 이름 정류장이 시 경계(청주·세종)에 겹치므로 청주(CJB) 정류장을 먼저, 같은 이름은 하나만
    const seen = new Set()
    const stations = items(near)
      .sort((a, b) => (String(b.nodeid).startsWith('CJB') ? 1 : 0) - (String(a.nodeid).startsWith('CJB') ? 1 : 0))
      .filter((s) => (seen.has(s.nodenm) ? false : seen.add(s.nodenm)))
      .slice(0, 4)
    const result = await Promise.all(stations.map(async (s) => {
      // 키 미승인 등 오류는 JSON이 아닌 XML로 오므로 원문 앞부분을 상태로 남긴다
      const raw = await fetch(`${BASE}/ArvlInfoInqireService/getSttnAcctoArvlPrearngeInfoList?serviceKey=${ka}&cityCode=${s.citycode}&nodeId=${s.nodeid}&numOfRows=30&pageNo=1&_type=json`)
        .then((r) => r.text()).catch((e) => `요청 실패: ${e}`)
      let arr = null
      try { arr = JSON.parse(raw) } catch { /* XML 오류 응답 */ }
      const h = header(arr)
      const arrivals = items(arr).map((a) => ({ id: a.routeid, route: String(a.routeno), min: Math.round(Number(a.arrtime) / 60), stops: Number(a.arrprevstationcnt) }))
        .sort((a, b) => a.min - b.min)
      // 도착 정보는 지금 오는 버스만 알려 주므로, 정류장을 지나는 노선 전체와 합친다
      const through = await fetch(`${BASE}/BusSttnInfoInqireService/getSttnThrghRouteList?serviceKey=${k}&cityCode=${s.citycode}&nodeid=${s.nodeid}&numOfRows=60&pageNo=1&_type=json`)
        .then((r) => r.json()).catch(() => null)
      const routes = new Map()
      for (const it of items(through)) routes.set(it.routeid, { id: it.routeid, route: String(it.routeno), next: null, min: null, stops: null })
      for (const a of arrivals) {
        const cur = routes.get(a.id)
        if (!cur || cur.min === null) routes.set(a.id, { id: a.id, route: a.route, next: null, min: a.min, stops: a.stops })
      }
      // 진행 방향: 노선 순서에서 이 정류장의 다음 정류장을 찾는다 (실패해도 나머지는 그대로 보여 준다)
      await Promise.all([...routes.values()].map(async (r) => {
        try { r.next = nextStop(await stopsOf(kr, s.citycode, r.id), s.nodeid) } catch { /* 방향만 비운다 */ }
      }))
      return {
        name: s.nodenm, id: s.nodeid, city: s.citycode, lat: Number(s.gpslati), lon: Number(s.gpslong),
        status: h ? `${h.resultCode} ${h.resultMsg}` : raw.replace(/\s+/g, ' ').slice(0, 160),
        arrivals,
        routes: [...routes.values()].sort((a, b) => (a.min ?? 9999) - (b.min ?? 9999) || a.route.localeCompare(b.route, 'ko', { numeric: true })),
      }
    }))
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=30')
    return res.status(200).json({ ok: true, at: new Date().toISOString(), stations: result })
  } catch (e) {
    return res.status(200).json({ ok: false, reason: 'api_error', message: String(e) })
  }
}

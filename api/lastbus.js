// Vercel 서버 함수: 스팟 주변 정류장을 지나는 버스 노선의 첫차·막차 시간 (국토교통부 TAGO)
// 환경변수: TAGO_API_KEY(정류소정보 15098534), TAGO_ROUTE_API_KEY(버스노선정보 15098529, 없으면 TAGO_API_KEY)
const BASE = 'https://apis.data.go.kr/1613000'

const items = (json) => {
  const it = json?.response?.body?.items?.item
  return it ? (Array.isArray(it) ? it : [it]) : []
}
async function getJSON(url) {
  const raw = await fetch(url).then((r) => r.text())
  try { return { json: JSON.parse(raw) } } catch { return { error: raw.replace(/\s+/g, ' ').slice(0, 160) } }
}
// "2250" → "22:50", 새벽 0~3시는 다음 날로 보고 정렬값 +2400
const hhmm = (v) => { const s = String(v ?? '').padStart(4, '0'); return /^\d{4}$/.test(s) ? `${s.slice(0, 2)}:${s.slice(2)}` : null }
const order = (v) => { const n = Number(v); return n < 400 ? n + 2400 : n }

export default async function handler(req, res) {
  const key = process.env.TAGO_API_KEY
  if (!key) return res.status(200).json({ ok: false, reason: 'no_key' })
  const { lat, lon } = req.query
  if (!lat || !lon) return res.status(400).json({ ok: false, reason: 'lat, lon 필요' })
  const k = encodeURIComponent(key)
  const kr = encodeURIComponent(process.env.TAGO_ROUTE_API_KEY || key)
  try {
    const near = await getJSON(`${BASE}/BusSttnInfoInqireService/getCrdntPrxmtSttnList?serviceKey=${k}&gpsLati=${lat}&gpsLong=${lon}&numOfRows=8&pageNo=1&_type=json`)
    const stations = items(near.json).filter((s) => String(s.nodeid).startsWith('CJB')).slice(0, 2)
    // 정류장을 지나는 노선 (중복 제거)
    const routes = new Map()
    for (const s of stations) {
      const r = await getJSON(`${BASE}/BusSttnInfoInqireService/getSttnThrghRouteList?serviceKey=${k}&cityCode=${s.citycode}&nodeid=${s.nodeid}&numOfRows=40&pageNo=1&_type=json`)
      for (const it of items(r.json)) if (!routes.has(it.routeid)) routes.set(it.routeid, { city: s.citycode, routeid: it.routeid, route: String(it.routeno), end: it.endnodenm })
    }
    // 노선별 첫차·막차
    let status = null
    const list = await Promise.all([...routes.values()].slice(0, 15).map(async (r) => {
      const info = await getJSON(`${BASE}/BusRouteInfoInqireService/getRouteInfoIem?serviceKey=${kr}&cityCode=${r.city}&routeId=${r.routeid}&_type=json`)
      if (info.error) { status = info.error; return null }
      const it = items(info.json)[0]
      if (!it) return null
      return { route: r.route, toward: r.end, first: hhmm(it.startvehicletime), last: hhmm(it.endvehicletime), lastOrder: order(it.endvehicletime) }
    }))
    const rows = list.filter((x) => x && x.last).sort((a, b) => b.lastOrder - a.lastOrder)
    if (!rows.length && status) return res.status(200).json({ ok: false, reason: status.includes('SERVICE_KEY') ? 'key_pending' : 'api_error', message: status })
    res.setHeader('Cache-Control', 's-maxage=21600, stale-while-revalidate=3600')   // 시간표라 6시간 캐시
    return res.status(200).json({ ok: true, station: stations[0]?.nodenm ?? null, routes: rows.map(({ lastOrder, ...r }) => r) })
  } catch (e) {
    return res.status(200).json({ ok: false, reason: 'api_error', message: String(e) })
  }
}

// Vercel 서버 함수: 스팟 주변 버스 정류장의 실시간 도착 정보 (국토교통부 TAGO)
// 환경변수 TAGO_API_KEY = 공공데이터포털 일반 인증키(Decoding)
// 활용신청: 정류소정보 15098534, 버스도착정보 15098530
const BASE = 'https://apis.data.go.kr/1613000'

const items = (json) => {
  const it = json?.response?.body?.items?.item
  return it ? (Array.isArray(it) ? it : [it]) : []
}

export default async function handler(req, res) {
  const key = process.env.TAGO_API_KEY
  if (!key) return res.status(200).json({ ok: false, reason: 'no_key' })
  const { lat, lon } = req.query
  if (!lat || !lon) return res.status(400).json({ ok: false, reason: 'lat, lon 필요' })
  const k = encodeURIComponent(key)
  try {
    const near = await fetch(`${BASE}/BusSttnInfoInqireService/getCrdntPrxmtSttnList?serviceKey=${k}&gpsLati=${lat}&gpsLong=${lon}&numOfRows=4&pageNo=1&_type=json`).then((r) => r.json())
    const stations = items(near).slice(0, 4)
    const result = await Promise.all(stations.map(async (s) => {
      const arr = await fetch(`${BASE}/ArvlInfoInqireService/getSttnAcctoArvlPrearngeInfoList?serviceKey=${k}&cityCode=${s.citycode}&nodeId=${s.nodeid}&numOfRows=20&pageNo=1&_type=json`).then((r) => r.json()).catch(() => null)
      return {
        name: s.nodenm, id: s.nodeid, lat: Number(s.gpslati), lon: Number(s.gpslong),
        arrivals: items(arr).map((a) => ({ route: String(a.routeno), min: Math.round(Number(a.arrtime) / 60), stops: Number(a.arrprevstationcnt) }))
          .sort((a, b) => a.min - b.min).slice(0, 6),
      }
    }))
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=30')
    return res.status(200).json({ ok: true, at: new Date().toISOString(), stations: result })
  } catch (e) {
    return res.status(200).json({ ok: false, reason: 'api_error', message: String(e) })
  }
}

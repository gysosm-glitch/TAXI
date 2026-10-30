// Vercel 서버 함수: 스팟 주변 도로의 실시간 소통 정보 (국가교통정보센터 ITS 공개 API)
// 환경변수 ITS_API_KEY = its.go.kr › 공개API › 인증키
export default async function handler(req, res) {
  const key = process.env.ITS_API_KEY
  if (!key) return res.status(200).json({ ok: false, reason: 'no_key' })
  const lat = Number(req.query.lat), lon = Number(req.query.lon)
  if (!lat || !lon) return res.status(400).json({ ok: false, reason: 'lat, lon 필요' })
  const d = 0.02   // 약 2km 반경 사각형
  const url = `https://openapi.its.go.kr:9443/trafficInfo?apiKey=${encodeURIComponent(key)}&type=all&drcType=all` +
    `&minX=${lon - d}&maxX=${lon + d}&minY=${lat - d}&maxY=${lat + d}&getType=json`
  try {
    const json = await fetch(url).then((r) => r.json())
    const list = json?.body?.items ?? []
    // 도로명별 평균 속도로 묶어 보여 준다
    const byRoad = {}
    for (const it of list) {
      const name = it.roadName || '이름 없는 도로'
      const v = Number(it.speed)
      if (!Number.isFinite(v)) continue
      byRoad[name] ??= { road: name, sum: 0, n: 0 }
      byRoad[name].sum += v; byRoad[name].n++
    }
    const roads = Object.values(byRoad).map((r) => {
      const speed = r.sum / r.n
      return { road: r.road, speed: Math.round(speed), links: r.n, level: speed >= 30 ? '원활' : speed >= 15 ? '서행' : '정체' }
    }).sort((a, b) => b.links - a.links).slice(0, 8)
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=60')
    return res.status(200).json({ ok: true, at: list[0]?.createdDate ?? new Date().toISOString(), roads })
  } catch (e) {
    return res.status(200).json({ ok: false, reason: 'api_error', message: String(e) })
  }
}

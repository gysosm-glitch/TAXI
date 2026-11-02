// Vercel 서버 함수: 주소·장소 검색 (국토교통부 브이월드 검색 API 2.0) → 청주 안의 좌표 목록
// 환경변수: VWORLD_API_KEY (vworld.kr 인증키, 서비스 URL에 배포 주소 등록). 없으면 { ok:false, reason:'no_key' }
import { vworldKey } from './_keys.js'

const BBOX = '127.25,36.45,127.75,36.85'   // 청주시를 감싸는 사각형 (경도·위도)
const DOMAIN = 'taxi-woad-seven.vercel.app'

async function search(key, q, type, category) {
  const p = new URLSearchParams({ service: 'search', request: 'search', version: '2.0', crs: 'EPSG:4326', size: '6', page: '1',
    query: q, type, format: 'json', errorformat: 'json', key, domain: DOMAIN, bbox: BBOX })
  if (category) p.set('category', category)
  try {
    const j = await fetch(`https://api.vworld.kr/req/search?${p}`).then((r) => r.json())
    return j?.response?.result?.items ?? []
  } catch { return [] }
}

export default async function handler(req, res) {
  const key = vworldKey()
  if (!key) return res.status(200).json({ ok: false, reason: 'no_key' })
  const q = String(req.query.q ?? '').trim().slice(0, 60)
  if (q.length < 2) return res.status(400).json({ ok: false, reason: 'q 필요' })
  const [road, parcel, place] = await Promise.all([search(key, q, 'address', 'road'), search(key, q, 'address', 'parcel'), search(key, q, 'place')])
  const pick = (it, name, sub) => ({ name, sub, lat: Number(it.point?.y), lon: Number(it.point?.x) })
  const items = [
    ...road.map((it) => pick(it, it.address?.road, it.address?.parcel)),
    ...parcel.map((it) => pick(it, it.address?.parcel, it.address?.road)),
    ...place.map((it) => pick(it, it.title, it.address?.road || it.address?.parcel)),
  ].filter((x) => x.name && Number.isFinite(x.lat) && Number.isFinite(x.lon))
  res.setHeader('Cache-Control', 's-maxage=86400')
  res.status(200).json({ ok: true, items: items.slice(0, 10) })
}

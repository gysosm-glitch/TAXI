// 장소·주소 검색: 주소는 브이월드(서버 함수 api/geocode, 키 필요), 장소 이름은 Photon(OpenStreetMap, 키 없음). 청주 안 결과만
import { placeAt } from '../data.js'

async function vworld(q) {
  try {
    const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`, { signal: AbortSignal.timeout(5000) })
    if (!(res.headers.get('content-type') || '').includes('json')) return []
    const j = await res.json()
    return j.ok ? j.items : []
  } catch { return [] }
}

async function photon(q, c) {
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&lat=${c.lat}&lon=${c.lon}&limit=12`
  try {
    const json = await fetch(url, { signal: AbortSignal.timeout(5000) }).then((r) => r.json())
    return (json.features ?? []).map((f) => {
      const p = f.properties
      return { name: p.name ?? p.street, sub: [p.district, p.street, p.housenumber].filter(Boolean).join(' '), lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0] }
    })
  } catch { return null }
}

export async function searchPlaces(q, near) {
  const c = near ?? { lat: 36.64, lon: 127.45 }
  const [addr, osm] = await Promise.all([vworld(q), photon(q, c)])
  if (osm === null && addr.length === 0) return null
  const out = []
  for (const r of [...addr, ...(osm ?? [])]) {
    const place = placeAt(r.lat, r.lon, r.name)
    if (!place || out.some((x) => x.name === place.name && Math.abs(x.lat - r.lat) < 0.001)) continue
    out.push({ ...place, sub: r.sub })
  }
  return out.slice(0, 10)
}

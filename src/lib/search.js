// 장소 검색 (Photon · OpenStreetMap, 키 없음). 청주 안 결과만
import { placeAt } from '../data.js'

export async function searchPlaces(q, near) {
  const c = near ?? { lat: 36.64, lon: 127.45 }
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&lat=${c.lat}&lon=${c.lon}&limit=12`
  try {
    const res = await fetch(url)
    const json = await res.json()
    const out = []
    for (const f of json.features ?? []) {
      const [lon, lat] = f.geometry.coordinates
      const p = f.properties
      const place = placeAt(lat, lon, p.name ?? p.street)
      if (!place || out.some((x) => x.name === place.name && Math.abs(x.lat - lat) < 0.001)) continue
      out.push({ ...place, sub: [p.district, p.street, p.housenumber].filter(Boolean).join(' ') })
    }
    return out.slice(0, 8)
  } catch { return null }
}

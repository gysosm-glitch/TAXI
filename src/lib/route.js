// 도로 경로: 공개 OSRM 데모 서버를 시도하고, 실패하면 직선 경로로 대체 (데모용)
export async function fetchRoute(from, to) {
  const url = `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 4000)
    const res = await fetch(url, { signal: ctrl.signal })
    clearTimeout(timer)
    const json = await res.json()
    const r = json.routes?.[0]
    if (!r) throw new Error('no route')
    return { points: r.geometry.coordinates.map(([lon, lat]) => [lat, lon]), km: r.distance / 1000, min: r.duration / 60, road: true }
  } catch {
    const km = haversineKm(from, to) * 1.35
    return { points: interpolate(from, to, 30), km, min: (km / 24) * 60, road: false }
  }
}

export function haversineKm([lat1, lon1], [lat2, lon2]) {
  const r = 6371
  const toRad = (d) => (d * Math.PI) / 180
  const a = Math.sin(toRad(lat2 - lat1) / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(toRad(lon2 - lon1) / 2) ** 2
  return 2 * r * Math.asin(Math.sqrt(a))
}

function interpolate(a, b, n) {
  return Array.from({ length: n + 1 }, (_, i) => [a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n])
}

// 경로 위 진행률(0~1) 지점과 진행 방향(도)
export function pointAlong(points, t) {
  if (points.length < 2) return { pos: points[0], heading: 0 }
  const seg = []
  let total = 0
  for (let i = 1; i < points.length; i++) { const d = haversineKm(points[i - 1], points[i]); seg.push(d); total += d }
  let target = total * Math.min(1, Math.max(0, t))
  for (let i = 0; i < seg.length; i++) {
    if (target <= seg[i] || i === seg.length - 1) {
      const f = seg[i] ? target / seg[i] : 0
      const [a, b] = [points[i], points[i + 1]]
      const heading = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI
      return { pos: [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f], heading }
    }
    target -= seg[i]
  }
  return { pos: points[points.length - 1], heading: 0 }
}

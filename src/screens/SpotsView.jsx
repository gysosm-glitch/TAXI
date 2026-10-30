import { useMemo, useState } from 'react'
import L from 'leaflet'
import MapView, { Marker, CircleMarker, Tooltip } from '../components/MapView.jsx'
import busStops from '../../data/web/13_spots/bus_stops.json'
import { tims, spots, won } from '../data.js'

const km = (a, b, c, d) => Math.hypot((a - c) * 111, (b - d) * 89)
const nearestStop = (lat, lon) => busStops.reduce((best, s) => (km(lat, lon, s[2], s[3]) < km(lat, lon, best[2], best[3]) ? s : best), busStops[0])
const pin = (n, on) => L.divIcon({ html: `<div class="rank-pin ${on ? 'on' : ''}">${n}</div>`, className: 'map-icon', iconSize: [28, 28], iconAnchor: [14, 14] })

// 택시 승차가 가장 많은 500m 구역 (가까운 정류장 이름으로 위치 표시)
const TOP_CELLS = [...tims.cells].sort((a, b) => b[2] - a[2]).slice(0, 10).map(([lat, lon, n]) => ({ lat, lon, perDay: Math.round(n / 365), stop: nearestStop(lat, lon)[1] }))
const emShare = tims.zones.filter((z) => z.type !== '동').reduce((a, z) => a + z.rides_per_day, 0)
const ooShare = tims.zones.filter((z) => ['오송읍', '오창읍'].includes(z.name)).reduce((a, z) => a + z.rides_per_day, 0)

export default function SpotsView({ spotId, onSelect, onTraffic }) {
  const [sort, setSort] = useState('pickups')
  const list = useMemo(() => [...spots].sort((a, b) => (sort === 'pickups' ? b.pickups_per_day - a.pickups_per_day : b.surcharge_trips_per_day - a.surcharge_trips_per_day)), [sort])
  const sel = spots.find((s) => s.id === spotId)

  return (
    <>
      <p className="lead">2025년 청주 택시의 실제 승차 기록(국토부 TIMS, 500m 격자)으로 <b>사람이 가장 많이 타는 곳</b>과 <b>복합할증 구간 이동이 몰리는 곳</b>을 찾아, 합승 매칭을 할 스팟을 정했습니다.</p>
      <div className="stats">
        <div className="stat"><span>2025 청주 택시 승차</span><b>{(tims.calibration.tims_pickups_per_day * 365 / 1e4).toFixed(0)}만 건</b></div>
        <div className="stat"><span>하루 평균</span><b>{tims.calibration.tims_pickups_per_day.toLocaleString()}건</b></div>
        <div className="stat"><span>읍·면 출발 비중</span><b>{(100 * emShare / tims.calibration.tims_pickups_per_day).toFixed(1)}%</b><small> 할증 대상 지역</small></div>
        <div className="stat"><span>그중 오송·오창</span><b>{(100 * ooShare / emShare).toFixed(0)}%</b><small> 시 발표 70%와 일치</small></div>
      </div>

      <div className="grid two">
        <div className="card">
          <h2>지도</h2>
          <p className="desc">주황색 원이 클수록 택시 승차가 많은 500m 구역, 번호는 매칭 스팟 순위입니다.</p>
          <div className="map-box">
            <MapView center={[sel.lat, sel.lon]} zoom={12}>
              {tims.cells.map(([la, lo, n], i) => (
                <CircleMarker key={i} center={[la, lo]} radius={Math.min(20, 2 + Math.sqrt(n) / 20)} pathOptions={{ stroke: false, fillColor: '#ea580c', fillOpacity: 0.3 }} />
              ))}
              {list.map((s, i) => (
                <Marker key={s.id} position={[s.lat, s.lon]} icon={pin(i + 1, s.id === spotId)} eventHandlers={{ click: () => onSelect(s.id) }}>
                  <Tooltip direction="top" offset={[0, -12]}>{s.name}</Tooltip>
                </Marker>
              ))}
            </MapView>
          </div>
          <div className="legend"><span><i style={{ background: '#ea580c', opacity: .5 }} />택시 승차 밀도</span><span><i style={{ background: '#2563eb' }} />매칭 스팟</span></div>
        </div>

        <div className="card">
          <h2>{sel.name}</h2>
          <p className="desc">{sel.zone} · {sel.why}</p>
          <table>
            <tbody>
              <tr><td>하루 택시 승차 (반경 600m)</td><td className="num"><b>{sel.pickups_per_day.toLocaleString()}건</b></td></tr>
              <tr><td>그중 복합할증 구간 이동</td><td className="num"><b>{sel.surcharge_trips_per_day.toLocaleString()}건</b> ({Math.round(sel.surcharge_trip_ratio * 100)}%)</td></tr>
              <tr><td>평균 요금</td><td className="num">{won(sel.avg_fare)}</td></tr>
              <tr><td>반경 500m 버스 정류장</td><td className="num">{sel.bus_stops_500m}개</td></tr>
              <tr><td>단계</td><td className="num"><span className="tag">{sel.tier}</span></td></tr>
            </tbody>
          </table>
          <div style={{ marginTop: 12 }}><button className="chip on" onClick={() => onTraffic(sel.id)}>이 스팟 실시간 교통 보기 →</button></div>
        </div>
      </div>

      <div className="grid two" style={{ marginTop: 16 }}>
        <div className="card">
          <h2>매칭 스팟 순위</h2>
          <div className="seg">
            <button className={sort === 'pickups' ? 'on' : ''} onClick={() => setSort('pickups')}>승차 많은 순</button>
            <button className={sort === 'surcharge' ? 'on' : ''} onClick={() => setSort('surcharge')}>할증 구간 이동 많은 순</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>#</th><th>스팟</th><th className="num">하루 승차</th><th className="num">할증 구간</th><th className="num">평균 요금</th></tr></thead>
              <tbody>
                {list.map((s, i) => (
                  <tr key={s.id} className={s.id === spotId ? 'sel' : ''} onClick={() => onSelect(s.id)}>
                    <td>{i + 1}</td><td><b>{s.name}</b><div className="muted">{s.zone}</div></td>
                    <td className="num">{s.pickups_per_day.toLocaleString()}</td><td className="num">{s.surcharge_trips_per_day.toLocaleString()}</td><td className="num">{won(s.avg_fare)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted">할증 구간 = 동↔읍·면, 읍·면↔다른 읍·면 이동 (2026-09-28 개편 이후 기준). 비중은 2024 평일 OD로 추정.</p>
        </div>

        <div className="card">
          <h2>택시 승차가 가장 많은 구역 Top 10</h2>
          <p className="desc">500m 격자 기준. 위치는 가장 가까운 버스 정류장 이름으로 표시했어요.</p>
          <table>
            <thead><tr><th>#</th><th>위치</th><th className="num">하루 승차</th></tr></thead>
            <tbody>
              {TOP_CELLS.map((c, i) => (
                <tr key={i}><td>{i + 1}</td><td>{c.stop} 부근</td><td className="num">{c.perDay.toLocaleString()}건</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

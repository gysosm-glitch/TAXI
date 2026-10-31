import { useMemo, useState } from 'react'
import L from 'leaflet'
import MapView, { Marker, Tooltip } from '../components/MapView.jsx'
import { waitingBySpot, tripQuote, zoneById, won } from '../data.js'

const pin = (n, on) => L.divIcon({ html: `<div class="spot-pin ${on ? 'on' : ''}">${n}</div>`, className: 'map-icon', iconSize: [30, 30], iconAnchor: [15, 15] })

export default function Together() {
  const groups = useMemo(() => waitingBySpot(), [])
  const [sel, setSel] = useState(groups[0].spot.id)
  const [more, setMore] = useState(false)
  const g = groups.find((x) => x.spot.id === sel)
  const s = g.spot
  const people = Math.max(2, g.waiting + 1)
  const q = g.destZone ? tripQuote(g.zone, g.destZone, people) : null
  const solo = g.destZone ? tripQuote(g.zone, g.destZone, 1) : null

  return (
    <>
      <h1 className="page-title">같이타기</h1>
      <p className="page-sub">택시를 많이 타는 곳에서 같은 방향 사람을 모아요</p>

      <div className="card" style={{ padding: 8 }}>
        <div className="map-box">
          <MapView center={[s.lat, s.lon]} zoom={11}>
            {groups.map((x, i) => (
              <Marker key={x.spot.id} position={[x.spot.lat, x.spot.lon]} icon={pin(i + 1, x.spot.id === sel)} eventHandlers={{ click: () => setSel(x.spot.id) }}>
                <Tooltip direction="top" offset={[0, -14]}>{x.spot.name}</Tooltip>
              </Marker>
            ))}
          </MapView>
        </div>
      </div>

      <div className="chips">
        {groups.map((x) => <button key={x.spot.id} className={`chip ${x.spot.id === sel ? 'on' : ''}`} onClick={() => { setSel(x.spot.id); setMore(false) }}>{x.spot.name}</button>)}
      </div>

      <div className="card">
        <p className="card-title">{s.name} <span className="tag">{g.waiting ? `${g.waiting}명 대기` : '대기 없음'}</span></p>
        {q ? (
          <>
            <div className="row-item"><span>가장 많이 가는 곳<span className="meta">{zoneById[g.destZone].name}</span></span><span className="r">{people}명이면 1인 {won(q.share)}</span></div>
            <div className="row-item"><span>혼자 타면</span><span className="r off">{won(solo.fare)}{solo.surcharged ? ' (할증 포함)' : ''}</span></div>
          </>
        ) : <p className="sub">지금 이 스팟에는 모집 중인 사람이 없어요.</p>}
        <div className="row-item"><span>하루 택시 이용</span><span className="r">{s.pickups_per_day.toLocaleString()}명</span></div>
        <div className="row-item"><span>할증 붙는 이동</span><span className="r">하루 {s.surcharge_trips_per_day.toLocaleString()}명</span></div>
        <div style={{ marginTop: 12 }}><button className="btn">{g.waiting ? '같이타기 참여' : '새 모집 열기'}</button></div>
        <p className="sub" style={{ marginTop: 8, textAlign: 'center' }}>모집·참여 기능은 다음 단계에서 열려요</p>
        <button className="more" onClick={() => setMore(!more)}>{more ? '접기' : '이 스팟을 고른 이유 자세히'}</button>
        {more && (
          <div className="detail">
            {s.why}. 하루 택시 승차 {s.pickups_per_day.toLocaleString()}건 중 약 {Math.round(s.surcharge_trip_ratio * 100)}%가 할증 구간 이동이고, 평균 요금은 {won(s.avg_fare)}이에요. 반경 500m 버스 정류장 {s.bus_stops_500m}개.
            <br />자료: 국토교통부 택시운행정보(TIMS) 2025, 청주시 버스정보 2026.
          </div>
        )}
      </div>
    </>
  )
}

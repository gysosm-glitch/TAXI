import { useMemo, useState } from 'react'
import MapView, { Marker, CircleMarker, Tooltip, spotIcon, taxiIcon } from '../components/MapView.jsx'
import { GeoJSON } from 'react-leaflet'
import zonesGeo from '../../data/web/01_zones/zones.min.geojson?raw'
import busStops from '../../data/web/13_spots/bus_stops.json'
import risk from '../../data/web/14_risk/empty_risk.json'
import agent from '../../data/web/12_simulation/agent_results.json'
import { tims, spots, zoneById, zoneByName, pairs, won } from '../data.js'
import { HOUR_PROFILE } from '../lib/simulate.js'
import { haversineKm } from '../lib/route.js'
import { notify, enableNotify, notifyStatus } from '../lib/notify.js'

const geo = JSON.parse(zonesGeo)
const riskById = Object.fromEntries(risk.map((r) => [r.zone_id, r]))
const PROFILE_SUM = HOUR_PROFILE.reduce((a, b) => a + b, 0)
const S5 = agent.scenarios.find((s) => s.id === 'S5').result
const PLATFORM_SHARE = 0.3        // 귀로 콜이 플랫폼으로 들어오는 비율 (가정)
const FUEL_WON_PER_KM = 130       // LPG 택시 km당 연료비 (가정)
const tierNum = (t) => (t === '1차 거점' ? 1 : t === '2차 확장' ? 2 : 3)
const riskColor = (r) => (r == null ? '#ffffff' : r < 0.3 ? '#12b76a' : r < 0.55 ? '#ffcd00' : '#f04438')

export default function Driver() {
  const [layer, setLayer] = useState('heat')
  const [online, setOnline] = useState(true)
  const [zone, setZone] = useState(143)               // 방금 하차한 곳 (기본: 오창읍)
  const [hour, setHour] = useState(new Date().getHours())
  const [call, setCall] = useState(null)
  const [earn, setEarn] = useState(142300)

  const z = zoneById[zone]
  const t = tims.zones.find((x) => x.zone_id === zone)
  // 귀로 레이더: 이 존에서 동(시내)으로 가는 택시 수요 → 15분 안에 귀로 콜을 받을 확률
  const radar = useMemo(() => {
    const out = pairs.filter((p) => p.o === zone && zoneById[p.d].type === 'dong')
    const all = pairs.filter((p) => p.o === zone)
    const toCity = out.reduce((a, p) => a + p.taxi, 0) / Math.max(1, all.reduce((a, p) => a + p.taxi, 0))
    const perDay = (t?.rides_per_day ?? 0) * toCity
    const lam15 = (perDay * HOUR_PROFILE[hour] / PROFILE_SUM) * (15 / 60) * PLATFORM_SHARE
    const p15 = 1 - Math.exp(-lam15)
    const hub = spots.filter((s) => s.zone === z.name)[0]
    const nearestDong = out.sort((a, b) => b.taxi - a.taxi)[0]
    const backKm = nearestDong ? nearestDong.km : 8
    const fare = nearestDong ? nearestDong.fd : 9000
    return { perDay, lam15, p15, hub, backKm, fare, dest: nearestDong && zoneById[nearestDong.d].name }
  }, [zone, hour])

  const wait = radar.p15 >= 0.5
  const r = riskById[zone]
  const stopsNear = busStops.filter(([, , la, lo]) => haversineKm([la, lo], [z.centroid_lat, z.centroid_lon]) <= 1.5).length
  const hot = Object.entries(S5.returnByZone).map(([k, v]) => ({ name: zoneById[k]?.name, v })).filter((x) => x.name).sort((a, b) => b.v - a.v).slice(0, 5)

  const accept = () => { setEarn((e) => e + call.fare); setCall(null) }

  return (
    <>
      <MapView center={[z.centroid_lat, z.centroid_lon]} zoom={12}>
        {layer === 'risk' && (
          <GeoJSON key="risk" data={geo} style={(f) => ({ color: '#16181d', weight: 1, fillOpacity: 0.45, fillColor: riskColor(riskById[f.properties.zone_id]?.risk) })}
            onEachFeature={(f, l) => { const rr = riskById[f.properties.zone_id]; if (rr) l.bindTooltip(`${rr.name} · 공차위험 ${rr.risk}`) }} />
        )}
        {layer === 'heat' && tims.cells.map(([la, lo, n], i) => (
          <CircleMarker key={i} center={[la, lo]} radius={Math.min(22, 3 + Math.sqrt(n) / 18)} pathOptions={{ stroke: false, fillColor: '#ff8a00', fillOpacity: 0.35 }} />
        ))}
        {layer === 'bus' && busStops.map(([id, name, la, lo]) => (
          <CircleMarker key={id} center={[la, lo]} radius={3} pathOptions={{ stroke: false, fillColor: '#2e90fa', fillOpacity: 0.8 }}>
            <Tooltip>{name}</Tooltip>
          </CircleMarker>
        ))}
        {spots.map((s) => <Marker key={s.id} position={[s.lat, s.lon]} icon={spotIcon(tierNum(s.tier), `${s.name} · 대기 ${Math.max(1, Math.round(s.surcharge_trips_per_day / 120))}명`)} />)}
        <Marker position={[z.centroid_lat, z.centroid_lon]} icon={taxiIcon(0, true)} />
      </MapView>

      <div className="driver-top">
        <div className="status-bar">
          <div><div style={{ fontSize: 12, opacity: .7 }}>오늘 수입</div><b style={{ fontSize: 18 }}>{won(earn)}</b></div>
          <div className="toggle">
            <button className={online ? 'on' : ''} onClick={() => setOnline(true)}>영업중</button>
            <button className={!online ? 'on' : ''} onClick={() => setOnline(false)}>휴식</button>
          </div>
        </div>
        <div className="layers">
          {[['heat', '🔥 승차 많은 곳'], ['risk', '🚦 공차 위험'], ['bus', '🚌 버스 정류장']].map(([id, l]) => (
            <button key={id} className={`pill ${layer === id ? 'dark' : ''}`} onClick={() => setLayer(id)}>{l}</button>
          ))}
        </div>
      </div>

      <div className="sheet">
        {call ? (
          <div className="call" style={{ borderRadius: 16, padding: 14 }}>
            <span className="badge tag">귀로 콜</span>
            <h2 style={{ marginTop: 8 }}>{radar.hub?.name ?? z.name} → {radar.dest}</h2>
            <div className="kv"><span>승객</span><b>{call.people}명 같이타기 · 동성 매칭</b></div>
            <div className="kv"><span>예상 요금</span><b>{won(call.fare)}</b></div>
            <div className="kv"><span>빈 차 복귀 대비</span><b className="g">+{won(call.fare + radar.backKm * FUEL_WON_PER_KM)}</b></div>
            <div className="row-btns" style={{ marginTop: 10 }}>
              <button className="cta ghost" onClick={() => setCall(null)}>거절</button>
              <button className="cta" onClick={accept}>수락</button>
            </div>
          </div>
        ) : (
          <>
            <h2>귀로 레이더</h2>
            <p className="sub">장거리 하차 후, 기다릴까 돌아갈까? 실제 승차 데이터로 계산해요</p>
            <div className="row-btns" style={{ marginBottom: 8 }}>
              <select value={zone} onChange={(e) => setZone(Number(e.target.value))}>
                {risk.map((x) => <option key={x.zone_id} value={x.zone_id}>{x.name} 하차</option>)}
              </select>
              <select value={hour} onChange={(e) => setHour(Number(e.target.value))}>
                {HOUR_PROFILE.map((_, h) => <option key={h} value={h}>{h}시</option>)}
              </select>
            </div>
            <div className="card" style={{ background: wait ? 'var(--green-soft)' : 'var(--yellow-soft)', boxShadow: 'none' }}>
              <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>추천</div>
              <div style={{ fontSize: 20, fontWeight: 900 }}>
                {wait ? `${radar.hub ? `${radar.hub.name} 스팟에서 ` : ''}15분 대기` : `시내로 복귀 (빈 차 ${radar.backKm.toFixed(1)}km)`}
              </div>
              <div className="kv"><span>15분 안에 귀로 콜 받을 확률</span><b className={wait ? 'g' : 'r'}>{Math.round(radar.p15 * 100)}%</b></div>
              <div className="kv"><span>이 시간 시내행 택시 수요</span><b>시간당 약 {Math.round(radar.perDay * HOUR_PROFILE[hour] / PROFILE_SUM)}건</b></div>
              <div className="kv"><span>공차 위험 지수</span><b>{r?.risk ?? '-'} ({r?.band ?? '동 지역'})</b></div>
              <div className="kv"><span>반경 1.5km 버스 정류장</span><b>{stopsNear}개</b></div>
            </div>
            <button className="cta" disabled={!online} onClick={async () => {
              if (notifyStatus() === 'default') await enableNotify()
              const c = { fare: Math.round(radar.fare / 100) * 100, people: 2 + (hour % 2) }
              setTimeout(() => { setCall(c); notify('같이타 기사 · 귀로 콜', `${radar.hub?.name ?? z.name} → ${radar.dest} · ${c.people}명 · ${won(c.fare)}`) }, 2500)
            }}>
              {wait ? '귀로 콜 받기 대기' : '복귀하며 콜 받기'}
            </button>
            <div className="card" style={{ marginTop: 12 }}>
              <h3>귀로 매칭이 많이 일어나는 곳</h3>
              {hot.map((h, i) => <div key={h.name} className="kv"><span>{i + 1}. {h.name}</span><b>하루 {h.v.toLocaleString()}건</b></div>)}
              <p className="note">스팟 매칭 시뮬레이션(2025 TIMS 실측 보정) 결과입니다.</p>
            </div>
          </>
        )}
      </div>
    </>
  )
}

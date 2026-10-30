import { useMemo, useState } from 'react'
import MapView from '../components/MapView.jsx'
import { GeoJSON } from 'react-leaflet'
import zonesGeo from '../../data/web/01_zones/zones.min.geojson?raw'
import risk from '../../data/web/14_risk/empty_risk.json'
import agent from '../../data/web/12_simulation/agent_results.json'
import { tims, spots, pairs, zoneById, won, eok, pct } from '../data.js'

const geo = JSON.parse(zonesGeo)
const riskById = Object.fromEntries(risk.map((r) => [r.zone_id, r]))
const riskColor = (r) => (r == null ? '#ffffff' : r < 0.3 ? '#12b76a' : r < 0.55 ? '#ffcd00' : '#f04438')
const SC = Object.fromEntries(agent.scenarios.map((s) => [s.id, s.result]))
const ODF = tims.calibration.od_to_tims_factor

// 데이터 기반 차등 할증: 읍·면별 공차 위험 구간에 따라 할증률을 다르게 매긴다
function redesign(pctByBand) {
  let now = 0, after = 0
  for (const p of pairs) {
    if (p.cat !== 'dong_to_eupmyeon' && p.cat !== 'eupmyeon_to_other_eupmyeon') continue
    const ems = [p.o, p.d].filter((z) => zoneById[z].type !== 'dong').map((z) => riskById[z])
    const rate = Math.max(...ems.map((r) => pctByBand[r.band]))
    const sur = p.taxi * ODF * (p.fe - p.fd)
    now += sur; after += sur * (rate / 35)
  }
  return { nowYear: now * 365, afterYear: after * 365, reliefYear: (now - after) * 365 }
}

const BANDS = ['저위험: 도시화 생활권', '중위험: 연담 지역', '고위험: 외곽']

export default function Spots() {
  const [rates, setRates] = useState({ [BANDS[0]]: 0, [BANDS[1]]: 15, [BANDS[2]]: 35 })
  const r = useMemo(() => redesign(rates), [rates])
  const base = SC.S0, spot = SC.S5
  const maxRev = Math.max(...agent.scenarios.map((s) => s.result.driverRevenuePerHour))

  return (
    <div className="scroll">
      <div className="hero">
        <h1>같은 청주인데,<br />왜 13개 읍·면이 모두 35%일까?</h1>
        <p>2025년 청주 택시 승차 {(tims.calibration.tims_pickups_per_day * 365 / 1e4).toFixed(0)}만 건(국토부 TIMS)으로 '빈 차로 돌아올 위험'을 측정했어요.</p>
      </div>

      <div className="card">
        <h3>① 공차 위험 지도</h3>
        <div style={{ position: 'relative', height: 260, borderRadius: 14, overflow: 'hidden', marginBottom: 10 }}>
          <MapView zoom={10} center={[36.62, 127.5]}>
            <GeoJSON data={geo} style={(f) => ({ color: '#16181d', weight: 1, fillOpacity: 0.55, fillColor: riskColor(riskById[f.properties.zone_id]?.risk) })}
              onEachFeature={(f, l) => { const x = riskById[f.properties.zone_id]; l.bindTooltip(x ? `${x.name} · ${x.band}` : f.properties.name) }} />
          </MapView>
        </div>
        <div className="row-btns" style={{ fontSize: 12, fontWeight: 700 }}>
          <span><span className="badge green">저위험</span> 오창·오송·내수·옥산·강내</span>
        </div>
        <p className="note">들고 나는 통행이 균형을 이루고(OD), 하루 승차가 350~3,000건, 정류장이 70~211개인 지역은 빈 차 귀로 위험이 낮아요. 할증의 명분이 약한 곳입니다. 반대로 가덕·낭성·문의·미원·현도는 하루 15~40건뿐이라 할증이 필요해요.</p>
      </div>

      <div className="card">
        <h3>② 데이터 기반 할증 재설계</h3>
        {BANDS.map((b) => (
          <div key={b} className="setting">
            <span>{b}<br /><small style={{ color: 'var(--muted)' }}>{risk.filter((x) => x.band === b).map((x) => x.name.replace(/[읍면]$/, '')).join('·')}</small></span>
            <select style={{ width: 90 }} value={rates[b]} onChange={(e) => setRates({ ...rates, [b]: Number(e.target.value) })}>
              {[0, 10, 15, 20, 25, 35].map((v) => <option key={v} value={v}>{v}%</option>)}
            </select>
          </div>
        ))}
        <div className="kpis" style={{ marginTop: 10 }}>
          <div className="kpi"><span>시민 할증 부담 감소</span><b>{eok(r.reliefYear)}</b><small className="up"> /년</small></div>
          <div className="kpi"><span>남는 할증</span><b>{eok(r.afterYear)}</b><small> /년</small></div>
        </div>
        <p className="note">현행 할증 총액 연 {eok(r.nowYear)}(OD×TIMS 보정 추정). 저위험 구간은 귀로 매칭으로 기사님 빈 차 손실을 줄이는 대신 할증을 낮추는 구조예요. 시가 검토 중인 전면 해제(연 33~40억 보전)보다 표적화된 안입니다.</p>
      </div>

      <div className="card">
        <h3>③ 매칭 스팟</h3>
        {[...spots].sort((a, b) => a.rank - b.rank).map((s) => (
          <div key={s.id} className="spot-card">
            <div className={`rk ${s.tier === '1차 거점' ? '' : s.tier === '2차 확장' ? 't2' : 't3'}`}>{s.rank}</div>
            <div>
              <div className="nm">{s.name} <span className="badge gray">{s.tier}</span></div>
              <div className="ds">{s.why}</div>
              <div className="st"><span>승차 <b>{s.pickups_per_day.toLocaleString()}</b>/일</span><span>할증 구간 <b>{s.surcharge_trips_per_day.toLocaleString()}</b>/일</span><span>평균 <b>{won(s.avg_fare)}</b></span></div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <h3>④ 시뮬레이션: 무엇이 달라지나</h3>
        <p className="note" style={{ marginTop: 0 }}>택시 {tims.cheongju_vehicles_per_day_2025.toLocaleString()}대·승객 하루 {base.requestsPerDay.toLocaleString()}명을 1분 단위로 재현 (기준 공차율 {pct(base.emptyKmRatio)} ≈ TIMS 실측 {pct(tims.cheongju_per_vehicle_day_2025.empty_km_ratio)})</p>
        <div className="kpis">
          <div className="kpi"><span>스팟 구간 합승 성사</span><b>{pct(spot.corridor.sharedRate)}</b><small className="up"> 전체 흩뿌리기 {pct(SC.S1.corridor.sharedRate)}</small></div>
          <div className="kpi"><span>승객 절감</span><b>{eok(spot.passengerSavingPerDay * 365)}</b><small className="up"> /년</small></div>
          <div className="kpi"><span>귀로 매칭</span><b>{spot.returnMatchedPerDay.toLocaleString()}</b><small> 건/일</small></div>
          <div className="kpi"><span>승차 포기율</span><b>{pct(spot.abandonRate)}</b><small className="up"> 현행 {pct(base.abandonRate)}</small></div>
        </div>
        <div className="bars" style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 800 }}>기사 시간당 수입</div>
          {agent.scenarios.map((s) => (
            <div key={s.id} className="bar-row">
              <span>{s.label.split(' (')[0]}</span>
              <div className="track"><div className={`fill ${s.id === 'S5' ? 'y' : ''}`} style={{ width: `${(s.result.driverRevenuePerHour / maxRev) * 100}%` }} /></div>
              <b>{won(s.result.driverRevenuePerHour)}</b>
            </div>
          ))}
        </div>
        <p className="note">할증을 그냥 면제하면(귀로+면제) 기사 수입이 줄어 연 {eok(agent.breakEven.compensationPerYear)} 보전이 필요해요. 그래서 할증 인하는 공차 위험이 낮은 곳부터, 매칭으로 빈 차를 줄이면서 함께 가야 합니다.</p>
      </div>

      <div className="card">
        <h3>⑤ 충청권으로 확장</h3>
        <div className="kv"><span>오송역 → 세종청사</span><b>2017 협약으로 35% 할증 폐지 선례</b></div>
        <div className="kv"><span>청주 → 대전</span><b>시계외 30% · 심야 50%(2026.3~)</b></div>
        <div className="kv"><span>방법</span><b>같은 공차위험 지수로 공동사업구역 제안</b></div>
        <p className="note">시 경계를 넘는 택시는 사업구역 규제로 실시간 교차 매칭이 어려워요. 인천공항·위례처럼 수요가 많은 회랑부터 공동사업구역으로 묶는 것이 현실적인 확장 경로입니다.</p>
      </div>
      <p className="note" style={{ textAlign: 'center' }}>데이터: 국토부 TIMS 2025 · 청주시 BIS 2026.10 · 2024 평일 OD · 자세한 출처는 MY › 서비스 정보</p>
    </div>
  )
}

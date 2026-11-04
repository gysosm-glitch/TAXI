// 기사: 손님을 내려준 곳 → 돌아가는 길의 손님 → 태우면 얼마나 달라지는지. 실제 배차는 없는 시범 화면이다.
import { useMemo, useState } from 'react'
import DriverSim from '../components/DriverSim.jsx'
import { spots, zoneById, won, spotZoneId, placeFromId, placeAt, quoteBetween, isReturnRoute } from '../data.js'
import { supabase } from '../lib/supabase.js'
import { listAllOpen, useRidesLive } from '../lib/rides.js'
import { useTrains, minutesUntil } from '../lib/live.js'
import { demoRooms, useNow } from '../lib/demoRides.js'
import { HOUR_PROFILE } from '../lib/hours.js'
import analysis from '../../data/web/12_simulation/return_matching.json'
import adoption from '../../data/web/12_simulation/adoption.json'

const SUM = HOUR_PROFILE.reduce((a, b) => a + b, 0)
const FUEL_WON_PER_KM = 130   // LPG 택시 km당 연료비 (가정)
const PLACES = ['osong_stn', 'ochang_lake', 'ochang_tech', 'osong_bio'].map((id) => spots.find((s) => s.id === id))
const fee = analysis.grid.find((g) => g.appShare === 0.3 && g.exemptRatio === 1).breakEvenFeePerTrip   // 앱 이용 30%, 전액 면제 때 보전액
const joined30 = adoption.drivers.find((d) => d.appShare === 0.3)   // 앱을 쓰는 기사만 본 수입 변화
const zonePlace = (z) => placeAt(zoneById[z].centroid_lat, zoneById[z].centroid_lon, zoneById[z].name)
const mins = (iso, now) => Math.max(0, Math.round((new Date(iso) - now) / 60000))

export default function Driver({ account }) {
  const [sel, setSel] = useState(PLACES[0].id)
  const [real, setReal] = useState([])
  const [taken, setTaken] = useState({})     // 받은 손님: 모집 id → 금액 (이 화면에서만)
  const [result, setResult] = useState(null)
  const [more, setMore] = useState(false)
  const now = useNow()
  const trains = useTrains(true)
  const live = !!(supabase && account?.session && account?.profile)
  useRidesLive(async () => { if (live) setReal(await listAllOpen()) }, [live])

  const place = placeFromId(sel)
  const start = placeAt(place.lat, place.lon, place.name)
  const zone = spotZoneId(place)
  const quoteOf = (r) => quoteBetween(start, r.dest_place ?? zonePlace(r.dest_zone), 1)

  // 지금 이곳에서 시내로 가려고 모인 손님 (실제 모집 + 시연 모집)
  const waiting = useMemo(() => [...real, ...demoRooms(now, trains, account?.profile?.gender)]
    .filter((r) => { const o = placeFromId(r.spot_id); return o && spotZoneId(o) === zone && isReturnRoute(zone, r.dest_zone) && !taken[r.id] })
    .sort((a, b) => a.depart_at.localeCompare(b.depart_at)), [real, now, trains, zone, taken, account?.profile?.gender])
  const people = waiting.reduce((a, r) => a + r.ride_members.length, 0)

  const take = (r) => {
    const q = quoteOf(r)
    setResult({ dest: r.dest_name, people: r.ride_members.length, fare: q.fare, policy: q.fareDongRate + fee, fuel: Math.round(q.km * FUEL_WON_PER_KM), km: q.km, virtual: r.virtual })
    setTaken({ ...taken, [r.id]: q.fare })
  }
  const earned = Object.values(taken).reduce((a, b) => a + b, 0)
  const count = Object.keys(taken).length

  const hour = new Date(now).getHours()
  const perHour = Math.round(place.pickups_per_day * HOUR_PROFILE[hour] / SUM)
  const nextTrain = trains?.ok && sel.startsWith('osong') ? trains.next.find((t) => minutesUntil(t.time) >= 0) : null

  return (
    <>
      <h1 className="page-title">기사님 화면 <span className="tag gray">시범</span></h1>
      <p className="page-sub">지금 기사님은 평소처럼 호출 앱으로 콜을 받으면 돼요. 택시는 방장이 불러요. 이 화면은 호출 플랫폼과 제휴한 뒤의 모습을 미리 보여 주는 체험이에요.</p>

      <p className="step-label"><i>1</i>방금 손님을 내려준 곳</p>
      <div className="chips">
        {PLACES.map((s) => <button key={s.id} className={`chip ${s.id === sel ? 'on' : ''}`} onClick={() => { setSel(s.id); setResult(null) }}>{s.name}</button>)}
      </div>

      <p className="step-label"><i>2</i>돌아가는 길에 태울 손님</p>
      <div className="hero driver-hero">
        <p className="label">지금 {place.name}에서 시내 방향</p>
        <h2>귀로 손님 {people}명 대기 중</h2>
        <p className="sub">{nextTrain ? `다음 열차 ${nextTrain.time} 도착 · ` : ''}평소 이 시간 택시 승차 약 {perHour}명 (TIMS 2025)</p>
      </div>

      {waiting.length > 0 && (
        <div className="card">
          {waiting.slice(0, 5).map((r) => (
            <div key={r.id} className="ride-item">
              <div>
                <b>→ {r.dest_name}</b> {r.virtual && <span className="tag gray">시연</span>} {r.kind === 'roundtrip' && <span className="tag">왕복 확정</span>}
                <span className="meta">손님 {r.ride_members.length}명 · {mins(r.depart_at, now)}분 뒤 · 미터 요금 약 {won(quoteOf(r).fare)}</span>
              </div>
              <button className="pill-btn small" onClick={() => take(r)}>태우기</button>
            </div>
          ))}
        </div>
      )}
      {waiting.length === 0 && <p className="sub" style={{ margin: '0 0 12px' }}>지금 이곳에 시내로 가는 모집이 없어요.</p>}

      {result && (
        <>
          <p className="step-label"><i>3</i>태우면 이렇게 달라져요</p>
          <div className="card">
            <div className="compare">
              <div className="opt bad-opt"><span>빈 차로 돌아가면</span><b>−{won(result.fuel)}</b><small>수입 0원, 연료비 ({result.km.toFixed(1)}km 가정)</small></div>
              <div className="opt good-opt"><span>이 손님을 태우면</span><b>+{won(result.fare)}</b><small>{result.dest}행 {result.people}명</small></div>
            </div>
            <p className="sub" style={{ marginTop: 10 }}>귀로 할증 면제 정책안이 시행되면 손님 요금은 내려가고, 기사 몫은 수수료 보전을 더해 약 {won(result.policy)}이에요.</p>
          </div>
        </>
      )}

      {count > 0 && (
        <div className="card earned">
          <span>이번 시범에서 번 귀로 수입 <small>{count}건</small></span>
          <b>+{won(earned)}</b>
        </div>
      )}

      <div className="card">
        <button className="row-btn" onClick={() => setMore(!more)}><span>손님이 없거나 안 오면 어떻게 하나요?</span><span className="r">{more ? '▴' : '▾'}</span></button>
        {more && <div style={{ marginTop: 12 }}><DriverSim fuelPerKm={FUEL_WON_PER_KM} feePerTrip={fee} /></div>}
      </div>

      <div className="card">
        <div className="row-item"><span>쉐어택 참여 기사 하루 수입<span className="meta">시뮬레이션 · 앱 이용 30%</span></span><span className="r">+{won(joined30.appDriverWonPerDay)}</span></div>
      </div>
      <p className="sub">실제 배차는 등록 호출 플랫폼과 제휴를 전제로 해요. 금액은 앱 요금 계산값이고 연료비는 km당 {FUEL_WON_PER_KM}원 가정이에요.</p>
    </>
  )
}

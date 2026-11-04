import { useMemo, useState } from 'react'
import Icon from '../components/Icon.jsx'
import { spots, zones, zoneById, tripQuote, won, spotZoneId, placeFromId, isReturnRoute, cityDest, locate } from '../data.js'
import { useMyPosition } from '../lib/geo.js'
import { supabase } from '../lib/supabase.js'
import { listAllOpen, useRidesLive } from '../lib/rides.js'
import { useTrains, minutesUntil } from '../lib/live.js'
import { tsZone, TS_SOURCE } from '../lib/ts.js'
import analysis from '../../data/web/12_simulation/return_matching.json'
import adoption from '../../data/web/12_simulation/adoption.json'

const FUEL_WON_PER_KM = 130   // LPG 택시 km당 연료비 (가정)
// 기사 화면에서 고를 수 있는 곳: 읍·면의 추천 스팟 + 13개 읍·면
const emSpots = spots.filter((s) => zoneById[spotZoneId(s)]?.is_eupmyeon)
const emZones = zones.filter((z) => z.is_eupmyeon)

// 손익분기 결과 (앱 이용 30%, 할증 전액 면제 기준)
const pick = (a, e) => analysis.grid.find((g) => g.appShare === a && g.exemptRatio === e)
const full30 = pick(0.3, 1)
const joined30 = adoption.drivers.find((d) => d.appShare === 0.3)   // 앱을 쓰는 기사만 본 수입 변화
const fmt = (n) => (n >= 10 ? Math.round(n) : Math.round(n * 10) / 10).toLocaleString('ko-KR')

// 시간대별 시내행 손님 막대 (한 계열 · 지금 시간 강조 · 누르면 값)
function HourBars({ values, now, unit = '명' }) {
  const [sel, setSel] = useState(null)
  const max = Math.max(...values, 1)
  const h = sel ?? now
  return (
    <div className="hbars">
      <div className="hbars-tip" aria-live="polite"><b>{h}시{h === now ? ' (지금)' : ''}</b><span>시내행 손님 하루 평균 <b style={{ color: 'var(--ink)' }}>{fmt(values[h])}{unit}</b></span></div>
      <div className="hbars-plot" role="img" aria-label={`시간대별 시내행 손님. 가장 많은 시간 ${values.indexOf(Math.max(...values))}시`}>
        {values.map((v, i) => (
          <button key={i} className={`${i === now ? 'now' : ''} ${i === sel ? 'sel' : ''}`} onClick={() => setSel(sel === i ? null : i)} aria-label={`${i}시 ${fmt(v)}${unit}`}>
            <i style={{ height: `${Math.max(2, (v / max) * 100)}%` }} />
          </button>
        ))}
      </div>
      <div className="hbars-axis"><span>0시</span><span>6시</span><span>12시</span><span>18시</span><span>23시</span></div>
    </div>
  )
}

function Ring({ value }) {
  const c = 2 * Math.PI * 20
  return (
    <svg className="ring" width="52" height="52" viewBox="0 0 52 52" aria-hidden="true">
      <circle cx="26" cy="26" r="20" fill="none" stroke="var(--fill)" strokeWidth="6" />
      <circle cx="26" cy="26" r="20" fill="none" stroke="var(--primary)" strokeWidth="6" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(1, value / 100))} transform="rotate(-90 26 26)" />
      <text x="26" y="31" textAnchor="middle" fontSize="14" fontWeight="700" fill="var(--ink)">{value}</text>
    </svg>
  )
}

export default function Driver({ account, onLogin }) {
  const [sel, setSel] = useState(emSpots.find((s) => s.id === 'osong_stn')?.id ?? `zone:${emZones[0].zone_id}`)
  const [open, setOpen] = useState([])
  const [accepted, setAccepted] = useState(null)
  const place = placeFromId(sel)
  const zone = spotZoneId(place)
  const live = !!(supabase && account?.session && account?.profile)
  useRidesLive(async () => { if (live) setOpen(await listAllOpen()) }, [live])
  const trains = useTrains(sel === 'osong_stn' || sel === 'osong_bio')
  // 내 위치(GPS): 읍·면 안이면 그곳을 하차 지점으로
  const gps = useMyPosition()
  const [gpsMsg, setGpsMsg] = useState(null)
  const fromGps = () => {
    if (!gps.pos) { gps.start(); return setGpsMsg('위치를 찾는 중이에요. 잠시 뒤 다시 눌러 주세요.') }
    const p = locate(gps.pos.lat, gps.pos.lon)
    if (!p) return setGpsMsg('지금 위치가 청주 밖이에요.')
    if (!zoneById[p.zoneId].is_eupmyeon) return setGpsMsg(`지금은 ${zoneById[p.zoneId].name}(시내)이에요. 읍·면에 손님을 내려준 뒤 써 보세요.`)
    setSel(emSpots.some((s) => s.id === p.id) ? p.id : `zone:${p.zoneId}`); setGpsMsg(null)
  }

  // 지금 이 지역에서 시내로 가려고 모인 손님 (귀로 손님)
  const waiting = useMemo(() => open.filter((r) => {
    const z = spotZoneId(placeFromId(r.spot_id) ?? place)
    return r.status === 'open' && z === zone && isReturnRoute(z, r.dest_zone)
  }), [open, zone])
  const people = waiting.reduce((a, r) => a + r.ride_members.length, 0)
  const roundtrips = waiting.filter((r) => r.kind === 'roundtrip').length   // 왕복 매칭으로 귀로가 이미 확정된 운행

  // 평소 이 시간 승차: 한국교통안전공단 2026.4~9 실측 (읍·면 단위, 시간대별 하루 평균)
  // 스팟(오송역 등)은 TIMS 2025 스팟 승차를 그 읍·면의 실측 시간대 분포로 나눈다
  const hour = new Date().getHours()
  const tz = tsZone(zone)
  const zoneShare = tz ? tz.pickups_by_hour[hour] / tz.pickups_by_hour.reduce((a, b) => a + b, 0) : 0
  const perHour = tz ? Math.round(place.custom ? tz.pickups_by_hour[hour] : place.pickups_per_day * zoneShare) : 0
  const toCity = tz ? Math.round(place.custom ? tz.to_city_by_hour[hour] : perHour * (place.surcharge_trip_ratio || tz.city_share)) : null

  // 대표 귀로 손님: 열린 모집이 있으면 그것, 없으면 이 지역에서 가장 많이 가는 시내 목적지
  const target = waiting[0]
  const destZone = target?.dest_zone ?? cityDest(zone)
  const q = destZone ? tripQuote(zone, destZone, 1) : null
  const policyFare = q ? q.fareDongRate + full30.breakEvenFeePerTrip : 0
  const emptyKm = q ? q.km : 0

  return (
    <>
      <div className="nav-top"><span /><span className="tag">시범</span></div>
      <h1 className="large-title">기사님</h1>
      <p className="note"><Icon name="info" size={18} /><span><b className="strong">정차한 뒤</b> 확인하세요. 배차는 쓰시던 호출 앱으로 받아요.</span></p>

      <p className="group-label" style={{ marginTop: 18 }}>방금 손님을 내려준 곳</p>
      <div className="chips">
        <button className="chip" onClick={fromGps}><Icon name="locate" size={16} />내 위치</button>
        {emSpots.map((s) => <button key={s.id} className={`chip ${s.id === sel ? 'on' : ''}`} onClick={() => setSel(s.id)}>{s.name}</button>)}
        <select className={`chip-select ${sel.startsWith('zone:') ? 'on' : ''}`} aria-label="다른 읍·면 고르기" value={sel.startsWith('zone:') ? sel : ''} onChange={(e) => e.target.value && setSel(e.target.value)}
          style={sel.startsWith('zone:') ? { boxShadow: 'inset 0 0 0 2px var(--primary-focus)', color: 'var(--primary)' } : undefined}>
          <option value="">다른 읍·면 ▾</option>
          {emZones.map((z) => <option key={z.zone_id} value={`zone:${z.zone_id}`}>{z.name}</option>)}
        </select>
      </div>
      {gpsMsg && <p className="note"><Icon name="locate" size={18} />{gpsMsg}</p>}

      <section className="dark-card">
        <p className="eyebrow">지금 {place.name}에서 시내 방향</p>
        <h2>{live ? `귀로 손님 ${people}명 대기 중` : '귀로 손님 대기 현황'}</h2>
        <p>{live ? (people ? `${waiting.length}개 모집${roundtrips ? ` (왕복 확정 ${roundtrips})` : ''} · 가장 빠른 출발 ${new Date(waiting[0].depart_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}` : '지금 열린 모집이 없어요. 아래 평소 이 시간 수요를 참고하세요.') : '로그인하면 실제 모집이 보여요.'}</p>
        {!live && <button className="pill" onClick={onLogin}>로그인 · 체험 계정</button>}
      </section>

      {q && (
        <section className="card">
          <p className="card-title">돌아갈 때 수입 비교 <small>{zoneById[destZone].name}행 {q.km.toFixed(1)}km</small></p>
          <div className="compare">
            <div className="side">
              <span>빈 차로 복귀</span>
              <b>0원</b>
              <small>연료 약 −{won(emptyKm * FUEL_WON_PER_KM)}</small>
            </div>
            <div className="side good">
              <span>귀로 손님 태우기</span>
              <b>+{won(q.fare)}</b>
              <small>정책안(할증 면제+보전) 적용 시 +{won(policyFare)}</small>
            </div>
          </div>
          {accepted
            ? <p className="form-msg" style={{ marginTop: 14, marginBottom: 0 }}>시범 화면이에요. 실제 배차는 제휴 호출 플랫폼에서 이뤄져요.</p>
            : <button className="btn" style={{ marginTop: 16 }} onClick={() => setAccepted(true)}>{people ? '귀로 손님 받기' : '여기서 귀로 손님 기다리기'}</button>}
        </section>
      )}

      {tz && (
        <section className="card" aria-label="이 지역 택시 흐름">
          <p className="card-title">{tz.name} 택시 흐름 <span className="tag blue">2026 실측</span></p>
          <div className="stat-pair">
            <div><span>이 시간 시내에서<br />들어오는 택시</span><b>{fmt(tz.from_city_by_hour[hour])}<em>대</em></b></div>
            <div><span>이 시간 시내로<br />가는 손님</span><b style={{ color: 'var(--primary)' }}>{fmt(tz.to_city_by_hour[hour])}<em>명</em></b></div>
          </div>
          <div className="balance">
            <Ring value={tz.return_balance} />
            <p>하루 기준, 시내에서 들어온 택시 <b>100대</b>당 시내로 가는 손님 <b>{tz.return_balance}명</b>. 손님은 있는데 빈 차와 엇갈려요.</p>
          </div>
          <HourBars values={tz.to_city_by_hour} now={hour} />
          <p className="fine" style={{ marginTop: 12 }}>{TS_SOURCE} · 하루 평균 · 시내 주요 목적지 {tz.top_city_dest.join(', ')}</p>
        </section>
      )}

      <div className="mini-stats">
        <div className="card">
          <span className="m-icon"><Icon name="users" size={18} /></span>
          <p className="m-label">평소 이 시간 승차</p>
          <p className="m-value">{perHour}명</p>
          <p className="m-sub">{toCity != null ? `그중 시내 방향 약 ${toCity}명` : `${place.name} 시간당`}</p>
        </div>
        <div className="card">
          <span className="m-icon"><Icon name="train" size={18} /></span>
          <p className="m-label">다음 열차 도착</p>
          {trains?.ok && trains.next[0]
            ? <><p className="m-value">{minutesUntil(trains.next[0].time)}분</p><p className="m-sub">{trains.next[0].grade} {trains.next[0].time} · 오늘 {trains.total}편</p></>
            : <><p className="m-value off">–</p><p className="m-sub">{sel.startsWith('osong') ? '불러오는 중' : '오송역에서 볼 수 있어요'}</p></>}
        </div>
      </div>

      <div className="group">
        <div className="cell with-icon">
          <span className="cell-icon"><Icon name="chart" size={18} /></span>
          <span className="grow"><b>쉐어택 참여 기사 하루 수입</b><small>시뮬레이션 · 앱 이용 30%</small></span>
          <span className="value blue">+{won(joined30.appDriverWonPerDay)}</span>
        </div>
        <div className="cell with-icon">
          <span className="cell-icon"><Icon name="return" size={18} /></span>
          <span className="grow"><b>귀로 1건당 보전 (기사 손해 0)</b><small>할증 전액 면제 시 매칭 수수료로 메움</small></span>
          <span className="value blue">{won(full30.breakEvenFeePerTrip)}</span>
        </div>
      </div>
    </>
  )
}

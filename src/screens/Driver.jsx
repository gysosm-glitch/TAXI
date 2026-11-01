import { useMemo, useState } from 'react'
import Icon from '../components/Icon.jsx'
import { Badge } from '../components/Illust.jsx'
import { spots, zones, zoneById, tripQuote, won, spotZoneId, placeFromId, isReturnRoute, cityDest, locate } from '../data.js'
import { useMyPosition } from '../lib/geo.js'
import { supabase } from '../lib/supabase.js'
import { listAllOpen, useRidesLive } from '../lib/rides.js'
import { HOUR_PROFILE } from '../lib/hours.js'
import { useTrains, minutesUntil } from '../lib/live.js'
import analysis from '../../data/web/12_simulation/return_matching.json'

const SUM = HOUR_PROFILE.reduce((a, b) => a + b, 0)
const FUEL_WON_PER_KM = 130   // LPG 택시 km당 연료비 (가정)
// 기사 화면에서 고를 수 있는 곳: 읍·면의 추천 스팟 + 13개 읍·면
const emSpots = spots.filter((s) => zoneById[spotZoneId(s)]?.is_eupmyeon)
const emZones = zones.filter((z) => z.is_eupmyeon)

// 손익분기 결과 (앱 이용 30%, 할증 전액 면제 기준)
const pick = (a, e) => analysis.grid.find((g) => g.appShare === a && g.exemptRatio === e)
const full30 = pick(0.3, 1)
const noExempt30 = pick(0.3, 0)
const maxEx30 = analysis.maxExempt.find((m) => m.appShare === 0.3)

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

  // 평소 이 시간 이 지역 택시 승차 (TIMS 2025)
  const hour = new Date().getHours()
  const perHour = Math.round(place.pickups_per_day * HOUR_PROFILE[hour] / SUM)
  const toCity = place.surcharge_trip_ratio ? Math.round(perHour * place.surcharge_trip_ratio) : null

  // 대표 귀로 손님: 열린 모집이 있으면 그것, 없으면 이 지역에서 가장 많이 가는 시내 목적지
  const target = waiting[0]
  const destZone = target?.dest_zone ?? cityDest(zone)
  const q = destZone ? tripQuote(zone, destZone, 1) : null
  const policyFare = q ? q.fareDongRate + full30.breakEvenFeePerTrip : 0
  const emptyKm = q ? q.km : 0

  return (
    <>
      <h1 className="page-title">기사님 화면 <span className="tag gray">시범</span></h1>
      <p className="page-sub">손님을 내려준 곳에서 빈 차로 돌아가지 말고, 시내 방향 손님을 태워 가세요</p>

      <p className="label" style={{ margin: '0 0 6px' }}>방금 손님을 내려준 곳</p>
      <div className="chips">
        <button className="chip" onClick={fromGps}>📍 내 위치</button>
        {emSpots.map((s) => <button key={s.id} className={`chip ${s.id === sel ? 'on' : ''}`} onClick={() => setSel(s.id)}>{s.name}</button>)}
        <select className="chip-select" value={sel.startsWith('zone:') ? sel : ''} onChange={(e) => e.target.value && setSel(e.target.value)}>
          <option value="">다른 읍·면</option>
          {emZones.map((z) => <option key={z.zone_id} value={`zone:${z.zone_id}`}>{z.name}</option>)}
        </select>
      </div>

      {gpsMsg && <p className="form-msg">{gpsMsg}</p>}
      <div className="hero driver-hero">
        <p className="label">지금 {place.name}에서 시내 방향</p>
        <h2>{live ? `귀로 손님 ${people}명 대기 중` : '귀로 손님 대기 현황'}</h2>
        <p className="sub">{live ? (people ? `${waiting.length}개 모집 · 가장 빠른 출발 ${new Date(waiting[0].depart_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}` : '지금 열린 모집이 없어요. 평소 이 시간 수요를 참고하세요.') : '로그인하면 실제 모집이 보여요.'}</p>
        {!live && <button className="pill-btn" style={{ marginTop: 10 }} onClick={onLogin}>로그인 · 체험 계정</button>}
      </div>

      {q && (
        <div className="card">
          <p className="card-title"><span className="with-badge"><Badge><Icon name="car" size={16} /></Badge>돌아갈 때 수입 비교</span><small>{zoneById[destZone].name}행 {q.km.toFixed(1)}km</small></p>
          <div className="compare">
            <div className="opt bad-opt">
              <span>빈 차로 복귀</span>
              <b>0원</b>
              <small>연료 약 −{won(emptyKm * FUEL_WON_PER_KM)}</small>
            </div>
            <div className="opt good-opt">
              <span>귀로 손님 태우기</span>
              <b>+{won(q.fare)}</b>
              <small>정책안(할증 면제+보전) 적용 시 +{won(policyFare)}</small>
            </div>
          </div>
          {accepted
            ? <p className="form-msg" style={{ marginTop: 10, marginBottom: 0 }}>시범 화면이에요. 실제 배차는 제휴 호출 플랫폼에서 이뤄져요.</p>
            : <button className="btn" style={{ marginTop: 12 }} onClick={() => setAccepted(true)}>{people ? '귀로 손님 받기' : '여기서 귀로 손님 기다리기'}</button>}
        </div>
      )}

      <div className="grid2">
        <div className="card">
          <Badge tone="amber"><Icon name="users" size={18} /></Badge>
          <p className="label">평소 이 시간 승차</p>
          <p className="mid">{perHour}명</p>
          <p className="sub">{toCity != null ? `그중 시내 방향 약 ${toCity}명` : `${place.name} 시간당`}</p>
        </div>
        <div className="card">
          <Badge tone="blue"><Icon name="train" size={18} /></Badge>
          <p className="label">다음 열차 도착</p>
          {trains?.ok && trains.next[0]
            ? <><p className="mid">{minutesUntil(trains.next[0].time)}분</p><p className="sub">{trains.next[0].grade} {trains.next[0].time} · 오늘 {trains.total}편</p></>
            : <><p className="mid" style={{ color: 'var(--muted)' }}>–</p><p className="sub">{sel.startsWith('osong') ? '불러오는 중' : '오송역에서 볼 수 있어요'}</p></>}
        </div>
      </div>

      <div className="card">
        <p className="card-title">귀로 매칭이 할증을 바꾸는 방법 <small>시뮬레이션</small></p>
        <div className="row-item"><span>할증 면제 없이 귀로 매칭만<span className="meta">앱 이용 30% 기준</span></span><span className="r">기사 수입 {noExempt30.revChangePct >= 0 ? '+' : ''}{noExempt30.revChangePct}%</span></div>
        <div className="row-item"><span>귀로 매칭 운행 할증 전액 면제<span className="meta">보전 없을 때</span></span><span className="r off">기사 수입 {full30.revChangePct}%</span></div>
        <div className="row-item"><span>손해 없이 면제할 수 있는 폭<span className="meta">보전 0원</span></span><span className="r">할증의 {Math.round(maxEx30.maxExemptRatio * 100)}%까지</span></div>
        <div className="row-item"><span>전액 면제 + 귀로 1건당 보전<span className="meta">기사 수입 현행 유지에 필요한 금액</span></span><span className="r">{won(full30.breakEvenFeePerTrip)}</span></div>
        <p className="sub" style={{ marginTop: 8 }}>청주 택시 2,956대·하루 5.8만 건을 TIMS 2025 실측(공차거리 46.5%)에 맞춰 재현한 결과예요.</p>
      </div>
    </>
  )
}

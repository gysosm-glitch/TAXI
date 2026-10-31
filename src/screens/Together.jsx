import { useMemo, useState } from 'react'
import L from 'leaflet'
import MapView, { Marker, Tooltip } from '../components/MapView.jsx'
import Icon from '../components/Icon.jsx'
import { Badge, SharedTaxi } from '../components/Illust.jsx'
import { waitingBySpot, tripQuote, zones, won, spotZoneId } from '../data.js'
import { supabase } from '../lib/supabase.js'
import { askNotify } from '../lib/alerts.js'
import { listRides, myRides, createRide, joinRide, leaveRide, setRideStatus, useRidesLive, recordTrip, tripRecorded, rideError } from '../lib/rides.js'

const pin = (n, on) => L.divIcon({ html: `<div class="spot-pin ${on ? 'on' : ''}">${n}</div>`, className: 'map-icon', iconSize: [30, 30], iconAnchor: [15, 15] })
const SEATS = ['조수석', '뒷좌석 오른쪽', '뒷좌석 왼쪽']
const hhmm = (iso) => new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
const minsLeft = (iso) => Math.round((new Date(iso) - Date.now()) / 60000)
const when = (iso) => { const m = minsLeft(iso); return m > 0 ? `${m}분 후` : m > -15 ? '출발 시간' : '지남' }
const LEAVE = [[5, '지금 (5분 안)'], [15, '15분 후'], [30, '30분 후'], [60, '1시간 후']]

export default function Together({ account, onLogin }) {
  const groups = useMemo(() => waitingBySpot(), [])
  const [sel, setSel] = useState(groups[0].spot.id)
  const [rides, setRides] = useState([])
  const [mine, setMine] = useState([])
  const [form, setForm] = useState(null)
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)
  const [more, setMore] = useState(false)

  const { session, profile } = account
  const me = session?.user?.id
  const g = groups.find((x) => x.spot.id === sel)
  const spot = g.spot
  const zone = spotZoneId(spot)
  const canUse = !!(supabase && session && profile)
  const spotOf = (id) => groups.find((x) => x.spot.id === id)?.spot
  const price = (r, n) => tripQuote(spotZoneId(spotOf(r.spot_id) ?? spot), r.dest_zone, n)

  useRidesLive(async () => {
    if (!canUse) return
    const [{ data }, m] = await Promise.all([listRides(sel), myRides(me)])
    setRides(data); setMine(m.filter((r) => !(r.status === 'done' && tripRecorded(r.id))))
  }, [sel, canUse, me])

  const openForm = () => setForm({ dest: g.destZone ?? zones[0].zone_id, leave: 15, max: 3 })
  const act = async (fn, ok) => {
    askNotify()                     // 모집·참여할 때 알림 허용을 물어본다
    setBusy(true); setMsg(null)
    const { error } = await fn()
    setBusy(false)
    if (error) setMsg({ bad: true, text: rideError(error) }); else if (ok) setMsg({ text: ok })
  }

  const submitNew = () => act(async () => {
    const dest = zones.find((z) => z.zone_id === Number(form.dest))
    const r = await createRide({
      host_id: me, spot_id: spot.id, spot_name: spot.name, dest_zone: dest.zone_id, dest_name: dest.name,
      depart_at: new Date(Date.now() + form.leave * 60000).toISOString(), max_people: form.max, gender: profile.gender,
    })
    if (!r.error) setForm(null)
    return r
  }, '모집을 열었어요. 같은 방향 사람이 참여하면 바로 알려 드려요.')

  const arrived = (r) => {
    const n = r.ride_members.length
    const q = price(r, n), solo = price(r, 1)
    recordTrip({ rideId: r.id, from: r.spot_name, to: r.dest_name, people: n, paid: q.share, solo: solo.fare, saving: Math.max(0, solo.fare - q.share) })
    if (r.host_id === me && r.status !== 'done') setRideStatus(r.id, 'done')
    setMine((list) => list.filter((x) => x.id !== r.id))
    setMsg({ text: `기록했어요. 이번에 ${won(Math.max(0, solo.fare - q.share))} 아꼈어요.` })
  }

  const preview = form && tripQuote(zone, Number(form.dest), form.max)
  const previewSolo = form && tripQuote(zone, Number(form.dest), 1)

  return (
    <>
      <h1 className="page-title">같이타기</h1>
      <p className="page-sub">택시를 많이 타는 곳에서 같은 방향 사람을 모아요</p>

      {msg && <p className={`form-msg ${msg.bad ? 'bad' : ''}`}>{msg.text}</p>}

      {mine.map((r) => {
        const members = [...r.ride_members].sort((a, b) => a.joined_at.localeCompare(b.joined_at))
        const n = members.length
        const q = price(r, n)
        return (
          <div key={r.id} className="card mine">
            <p className="card-title"><span className="with-badge"><Badge><Icon name="users" size={16} /></Badge>내 같이타기</span>
              <span className={`tag ${r.status === 'open' ? 'amber' : ''}`}>{r.status === 'open' ? `${n}/${r.max_people}명 모집 중` : r.status === 'full' ? '모집 완료' : '도착'}</span></p>
            <p className="big" style={{ fontSize: 20 }}>{r.spot_name} → {r.dest_name}</p>
            <p className="sub">{hhmm(r.depart_at)} 출발 ({when(r.depart_at)}) · 1인 약 {won(q.share)}</p>
            <div className="detail">
              <b>탑승 전 안내</b>
              {members.map((m, i) => <div key={m.user_id} className="seat"><span>{m.nickname}{m.user_id === me ? ' (나)' : ''}{m.user_id === r.host_id ? ' · 모집자' : ''}</span><span>{SEATS[i] ?? '뒷좌석'}</span></div>)}
              <div style={{ marginTop: 6 }}>만날 곳: <b>{r.spot_name}</b> 택시 승차장 · 대표 1명이 택시를 부르고 요금은 도착 후 나눠요.</div>
            </div>
            <div className="grid2" style={{ marginTop: 10, marginBottom: 0 }}>
              {r.host_id === me
                ? <button className="btn ghost" disabled={busy} onClick={() => act(() => setRideStatus(r.id, 'cancelled'), '모집을 취소했어요.')}>모집 취소</button>
                : <button className="btn ghost" disabled={busy} onClick={() => act(() => leaveRide(r.id, me), '같이타기에서 나왔어요.')}>나가기</button>}
              <button className="btn" onClick={() => arrived(r)}>도착했어요</button>
            </div>
            <div className="safety-row">
              <a href="tel:112" className="sos">112 신고</a>
              <a href="kakaot://" className="ghost-link">카카오T 열기</a>
            </div>
          </div>
        )
      })}

      <div className="card" style={{ padding: 8 }}>
        <div className="map-box">
          <MapView center={[spot.lat, spot.lon]} zoom={11}>
            {groups.map((x, i) => (
              <Marker key={x.spot.id} position={[x.spot.lat, x.spot.lon]} icon={pin(i + 1, x.spot.id === sel)} eventHandlers={{ click: () => { setSel(x.spot.id); setForm(null) } }}>
                <Tooltip direction="top" offset={[0, -14]}>{x.spot.name}</Tooltip>
              </Marker>
            ))}
          </MapView>
        </div>
      </div>

      <div className="chips">
        {groups.map((x) => <button key={x.spot.id} className={`chip ${x.spot.id === sel ? 'on' : ''}`} onClick={() => { setSel(x.spot.id); setForm(null); setMore(false); setMsg(null) }}>{x.spot.name}</button>)}
      </div>

      <div className="card">
        <p className="card-title">{spot.name} 모집 <small>{canUse ? `${rides.length}건` : ''}</small></p>

        {!canUse && (
          <div className="empty">
            <SharedTaxi size={110} />
            <p className="sub">{session ? '가입 정보를 먼저 입력해 주세요.' : '로그인하면 모집을 열거나 참여할 수 있어요.'}</p>
            {!session && <button className="btn" style={{ marginTop: 10 }} onClick={onLogin}>로그인 · 회원가입</button>}
          </div>
        )}

        {canUse && rides.length === 0 && !form && <p className="sub">아직 열린 모집이 없어요. 첫 모집을 열어 보세요.</p>}

        {canUse && rides.map((r) => {
          const n = r.ride_members.length
          const joined = r.ride_members.some((m) => m.user_id === me)
          const full = r.status !== 'open'
          const q = price(r, r.max_people)
          return (
            <div key={r.id} className="ride-item">
              <div>
                <b>→ {r.dest_name}</b>
                <span className="meta">{hhmm(r.depart_at)} 출발 · {when(r.depart_at)} · {n}/{r.max_people}명</span>
                <span className="meta">다 차면 1인 약 {won(q.share)}</span>
              </div>
              {joined ? <span className="tag">참여 중</span>
                : <button className="pill-btn small" disabled={busy || full} onClick={() => act(() => joinRide(r.id, me, profile.nickname), '참여했어요. 탑승 전 안내를 확인해 주세요.')}>{full ? '마감' : '참여'}</button>}
            </div>
          )
        })}

        {canUse && !form && <button className="btn" style={{ marginTop: 12 }} onClick={openForm}>새 모집 열기</button>}

        {canUse && form && (
          <div className="new-ride">
            <label className="field"><span>어디로 가세요?</span>
              <select value={form.dest} onChange={(e) => setForm({ ...form, dest: Number(e.target.value) })}>
                {zones.filter((z) => z.zone_id !== zone).map((z) => <option key={z.zone_id} value={z.zone_id}>{z.name}</option>)}
              </select>
            </label>
            <div className="field"><span>언제 출발해요?</span>
              <div className="seg wrap">{LEAVE.map(([v, l]) => <button key={v} type="button" className={form.leave === v ? 'on' : ''} onClick={() => setForm({ ...form, leave: v })}>{l}</button>)}</div>
            </div>
            <div className="field"><span>몇 명이 탈까요? (나 포함)</span>
              <div className="seg">{[2, 3].map((v) => <button key={v} type="button" className={form.max === v ? 'on' : ''} onClick={() => setForm({ ...form, max: v })}>{v}명</button>)}</div>
            </div>
            <div className="detail">
              다 모이면 1인 <b>{won(preview.share)}</b> · 혼자 타면 {won(previewSolo.fare)}{previewSolo.surcharged ? ' (할증 포함)' : ''}
              <br />{profile.gender === 'F' ? '여성' : '남성'} 회원에게만 보여요 (택시 합승은 같은 성별끼리만 가능).
            </div>
            <div className="grid2" style={{ marginTop: 10, marginBottom: 0 }}>
              <button className="btn ghost" onClick={() => setForm(null)}>취소</button>
              <button className="btn" disabled={busy} onClick={submitNew}>모집 열기</button>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <p className="card-title">이 스팟은요</p>
        <div className="row-item"><span>하루 택시 이용</span><span className="r">{spot.pickups_per_day.toLocaleString()}명</span></div>
        <div className="row-item"><span>할증 붙는 이동</span><span className="r">하루 {spot.surcharge_trips_per_day.toLocaleString()}명</span></div>
        <button className="more" onClick={() => setMore(!more)}>{more ? '접기' : '이 스팟을 고른 이유 자세히'}</button>
        {more && (
          <div className="detail">
            {spot.why}. 하루 택시 승차 {spot.pickups_per_day.toLocaleString()}건 중 약 {Math.round(spot.surcharge_trip_ratio * 100)}%가 할증 구간 이동이고, 평균 요금은 {won(spot.avg_fare)}이에요. 반경 500m 버스 정류장 {spot.bus_stops_500m}개.
            <br />자료: 국토교통부 택시운행정보(TIMS) 2025, 청주시 버스정보 2026.
          </div>
        )}
      </div>
    </>
  )
}

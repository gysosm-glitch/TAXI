// 타기: 지도(내 위치·추천 스팟) + 아래 시트(목적지 → 요금 비교 → 모집 열기·참여 → 버스·막차·KTX)
import { useEffect, useMemo, useState } from 'react'
import MapView from '../components/MapView.jsx'
import Icon from '../components/Icon.jsx'
import { spots, zones, zoneById, tripQuote, won, spotZoneId, placeFromId, isReturnRoute, locate, walkMin, defaultDest, destChoices } from '../data.js'
import { supabase } from '../lib/supabase.js'
import { askNotify } from '../lib/alerts.js'
import { useMyPosition } from '../lib/geo.js'
import { useLive, nextBus, useLastBus, lastBusState, useTrains, minutesUntil } from '../lib/live.js'
import { listRides, myRides, createRide, joinRide, leaveRide, setRideStatus, useRidesLive, recordTrip, tripRecorded, rideError, saveTrip, rateMembers } from '../lib/rides.js'

const SEATS = ['조수석', '뒷좌석 오른쪽', '뒷좌석 왼쪽']
const hhmm = (iso) => new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
const minsLeft = (iso) => Math.round((new Date(iso) - Date.now()) / 60000)
const when = (iso) => { const m = minsLeft(iso); return m > 0 ? `${m}분 후` : m > -15 ? '출발 시간' : '지남' }
const LEAVE = [[5, '지금'], [15, '15분 후'], [30, '30분 후'], [60, '1시간 후']]
const round100 = (n) => Math.ceil(n / 100) * 100

export default function Ride({ account, onLogin }) {
  const { session, profile } = account
  const me = session?.user?.id
  const canUse = !!(supabase && session && profile)
  const gps = useMyPosition()

  const [sel, setSel] = useState('osong_stn')     // 출발지: 추천 스팟 id 또는 'zone:번호'
  const [point, setPoint] = useState(null)        // 지도를 눌러 고른 정확한 지점
  const [dest, setDest] = useState(null)
  const [picker, setPicker] = useState(false)
  const [people, setPeople] = useState(3)
  const [rides, setRides] = useState([])
  const [mine, setMine] = useState([])
  const [form, setForm] = useState(null)
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)
  const [rating, setRating] = useState(null)
  const [busOpen, setBusOpen] = useState(false)

  const place = placeFromId(sel)
  const zone = spotZoneId(place)
  const to = dest && dest !== zone ? dest : defaultDest(zone)
  const here = gps.pos && locate(gps.pos.lat, gps.pos.lon)   // 내 위치가 청주 안이면 출발지 후보

  const choose = (id, pt = null) => { setSel(id); setPoint(pt); setDest(null); setForm(null); setMsg(null); setPicker(false) }
  const [wantHere, setWantHere] = useState(false)   // 위치를 찾는 대로 출발지로 쓰기
  const useHere = () => {
    if (!gps.pos) { setWantHere(true); return gps.start() }
    setWantHere(false)
    if (!here) return setMsg({ bad: true, text: '지금 위치가 청주 밖이에요. 출발지를 직접 골라 주세요.' })
    choose(here.id, here.id.startsWith('zone:') ? gps.pos : null)
  }
  useEffect(() => { if (wantHere && gps.pos) useHere() }, [wantHere, gps.pos?.lat])
  const tapMap = ({ lat, lon }) => {
    const p = locate(lat, lon)
    if (p) choose(p.id, p.id.startsWith('zone:') ? { lat, lon } : null)
  }

  // 버스·막차·KTX (출발지 기준)
  const { bus } = useLive(place)
  const nb = nextBus(bus)
  const last = lastBusState(useLastBus(place))
  const trains = useTrains(sel === 'osong_stn' || sel === 'osong_bio')
  const ktx = trains?.ok ? trains.next.filter((t) => minutesUntil(t.time) >= 0 && minutesUntil(t.time) <= 90).slice(0, 3) : []

  // 요금
  const solo = to ? tripQuote(zone, to, 1) : null
  const shared = to ? tripQuote(zone, to, people) : null
  const ret = to && isReturnRoute(zone, to)
  const price = (r, n) => tripQuote(spotZoneId(placeFromId(r.spot_id) ?? place), r.dest_zone, n)

  useRidesLive(async () => {
    if (!canUse) return
    const [{ data }, m] = await Promise.all([listRides(sel), myRides(me)])
    setRides(data); setMine(m.filter((r) => !(r.status === 'done' && tripRecorded(r.id))))
  }, [sel, canUse, me])

  const act = async (fn, ok) => {
    askNotify()
    setBusy(true); setMsg(null)
    const { error } = await fn()
    setBusy(false)
    if (error) setMsg({ bad: true, text: rideError(error) }); else if (ok) setMsg({ text: ok })
  }
  const submitNew = () => act(async () => {
    const d = zoneById[to]
    const meet = form.meet.trim() || (point ? '지도에서 고른 위치' : '')
    const r = await createRide({
      host_id: me, spot_id: place.id, spot_name: meet ? `${place.name} · ${meet.slice(0, 30)}` : place.name, dest_zone: d.zone_id, dest_name: d.name,
      depart_at: new Date(Date.now() + form.leave * 60000).toISOString(), max_people: people, gender: profile.gender,
    })
    if (!r.error) setForm(null)
    return r
  }, '모집을 열었어요. 같은 방향 손님이 참여하면 바로 알려 드려요.')

  const arrived = async (r) => {
    const n = r.ride_members.length
    const q = price(r, n), s = price(r, 1)
    const saving = Math.max(0, s.fare - q.share)
    recordTrip({ rideId: r.id, from: r.spot_name, to: r.dest_name, people: n, paid: q.share, solo: s.fare, saving })
    await saveTrip({ ride_id: r.id, user_id: me, spot_id: r.spot_id, dest_name: r.dest_name, people: n, paid: q.share, solo: s.fare, saving })
    if (r.host_id === me && r.status !== 'done') setRideStatus(r.id, 'done')
    setMine((list) => list.filter((x) => x.id !== r.id))
    setMsg({ text: `기록했어요. 이번에 ${won(saving)} 아꼈어요.` })
    const others = r.ride_members.filter((m) => m.user_id !== me)
    if (others.length) setRating({ ride: r, others, scores: Object.fromEntries(others.map((m) => [m.user_id, 5])), noShow: {} })
  }
  const submitRating = async () => {
    const rows = rating.others.map((m) => ({ ride_id: rating.ride.id, rater_id: me, ratee_id: m.user_id, score: rating.scores[m.user_id], no_show: !!rating.noShow[m.user_id] }))
    const { error } = await rateMembers(rows)
    setRating(null)
    setMsg(error ? { bad: true, text: rideError(error) } : { text: '평가를 남겼어요. 다음 매칭의 신뢰 점수에 반영돼요.' })
  }

  // 지도 표시
  const markers = useMemo(() => [
    ...spots.map((s) => ({ id: s.id, lat: s.lat, lon: s.lon, label: s.name, kind: 'spot', on: s.id === sel })),
    ...(place.custom ? [{ id: place.id, lat: (point ?? place).lat, lon: (point ?? place).lon, label: point ? '여기서 출발' : place.name, kind: 'origin', on: true }] : []),
  ], [sel, point?.lat])
  const center = point ? [point.lat, point.lon] : [place.lat, place.lon]

  // 지금 상황 안내 (가장 중요한 것 하나)
  const banner = last?.ended ? { tone: 'red', title: '버스가 끊긴 시간이에요', body: '같은 방향 손님과 택시를 나눠 타세요.' }
    : ktx[0] ? { tone: 'blue', title: `KTX ${ktx[0].time} 도착 (${minutesUntil(ktx[0].time)}분 후)`, body: '도착 시각에 맞춰 모집을 열면 같이 탈 사람이 가장 많아요.' }
    : last?.soon ? { tone: 'amber', title: `막차까지 ${last.left}분`, body: `${last.latest.route}번 ${last.latest.last} · 놓치면 같이 타기로` }
    : null

  return (
    <div className="ride">
      <div className="map-wrap">
        <MapView center={center} zoom={sel.startsWith('zone:') ? 12.5 : 13} markers={markers} me={gps.pos} onPick={(id) => choose(id)} onTap={tapMap} />
        <button className="search-bar" onClick={() => setPicker(true)}>
          <span className="dot-from" />
          <span className="sb-text"><small>출발</small><b>{point ? `${place.name} · 고른 위치` : place.name}</b></span>
          <span className="sb-change">바꾸기</span>
        </button>
        <button className={`locate-btn ${gps.state === 'on' ? 'on' : ''}`} onClick={useHere} aria-label="내 위치에서 출발"><Icon name="locate" size={22} /></button>
      </div>

      <div className="sheet">
        <div className="grabber" />
        {gps.state === 'denied' && <p className="form-msg bad">위치 권한이 꺼져 있어요. 지도를 누르거나 출발지를 직접 골라 주세요.</p>}
        {here && sel !== here.id && (
          <button className="here-row" onClick={useHere}>
            <Icon name="locate" size={18} />
            <span>내 위치 · {zoneById[here.zoneId].name}{here.nearM <= 3000 ? ` · ${here.nearSpot.name}까지 걸어서 ${walkMin(here.nearM)}분` : ''}</span>
            <b>여기서 출발</b>
          </button>
        )}
        {msg && <p className={`form-msg ${msg.bad ? 'bad' : ''}`}>{msg.text}</p>}

        {rating && (
          <section className="card mine">
            <p className="card-title">같이 탄 분은 어땠나요?</p>
            {rating.others.map((m) => (
              <div key={m.user_id} className="rate-row">
                <span>{m.nickname}</span>
                <div className="stars">{[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} className={n <= rating.scores[m.user_id] ? 'on' : ''} onClick={() => setRating({ ...rating, scores: { ...rating.scores, [m.user_id]: n } })} aria-label={`${n}점`}>★</button>
                ))}</div>
                <label className="noshow"><input type="checkbox" checked={!!rating.noShow[m.user_id]} onChange={(e) => setRating({ ...rating, noShow: { ...rating.noShow, [m.user_id]: e.target.checked } })} /> 안 왔어요</label>
              </div>
            ))}
            <div className="grid2" style={{ marginTop: 10, marginBottom: 0 }}>
              <button className="btn ghost" onClick={() => setRating(null)}>건너뛰기</button>
              <button className="btn" onClick={submitRating}>평가 남기기</button>
            </div>
          </section>
        )}

        {mine.map((r) => {
          const members = [...r.ride_members].sort((a, b) => a.joined_at.localeCompare(b.joined_at))
          const q = price(r, members.length)
          return (
            <section key={r.id} className="card mine">
              <p className="card-title"><span>내 모집</span>
                <span className={`tag ${r.status === 'open' ? 'amber' : ''}`}>{r.status === 'open' ? `${members.length}/${r.max_people}명 모집 중` : r.status === 'full' ? '모집 완료' : '도착'}</span></p>
              <p className="trip-line">{r.spot_name} <span>→</span> {r.dest_name}</p>
              <p className="sub">{hhmm(r.depart_at)} 출발 ({when(r.depart_at)}) · 1인 약 {won(q.share)}</p>
              <div className="detail">
                <b>탑승 전 안내</b>
                {members.map((m, i) => <div key={m.user_id} className="seat"><span>{m.nickname}{m.user_id === me ? ' (나)' : ''}{m.user_id === r.host_id ? ' · 모집자' : ''}</span><span>{SEATS[i] ?? '뒷좌석'}</span></div>)}
                <div style={{ marginTop: 6 }}>대표 1명이 택시를 부르고, 요금은 도착 후 나눠요.</div>
              </div>
              <div className="grid2" style={{ marginTop: 10, marginBottom: 0 }}>
                {r.host_id === me
                  ? <button className="btn ghost" disabled={busy} onClick={() => act(() => setRideStatus(r.id, 'cancelled'), '모집을 취소했어요.')}>모집 취소</button>
                  : <button className="btn ghost" disabled={busy} onClick={() => act(() => leaveRide(r.id, me), '모집에서 나왔어요.')}>나가기</button>}
                <button className="btn" onClick={() => arrived(r)}>도착했어요</button>
              </div>
              <div className="safety-row">
                <a href="tel:112" className="sos">112 신고</a>
                <a href="kakaot://" className="ghost-link">택시 부르기</a>
              </div>
            </section>
          )
        })}

        {banner && (
          <div className={`banner ${banner.tone}`}>
            <b>{banner.title}</b><span>{banner.body}</span>
          </div>
        )}

        <h2 className="sheet-title">어디로 가세요?</h2>
        <div className="chips">
          {destChoices(zone).slice(0, 4).map((d) => (
            <button key={d} className={`chip ${d === to ? 'on' : ''}`} onClick={() => setDest(d)}>
              {zoneById[d].name}{isReturnRoute(zone, d) && <i className="chip-dot" />}
            </button>
          ))}
          <select className="chip-select" value="" onChange={(e) => e.target.value && setDest(Number(e.target.value))}>
            <option value="">다른 곳</option>
            {zones.filter((z) => z.zone_id !== zone).map((z) => <option key={z.zone_id} value={z.zone_id}>{z.name}</option>)}
          </select>
        </div>

        {solo && (
          <section className="card fare">
            <div className="fare-head">
              <p className="trip-line">{place.name} <span>→</span> {zoneById[to].name}</p>
              {ret ? <span className="tag">귀로 매칭 구간</span> : solo.surcharged ? <span className="tag amber">할증 구간</span> : null}
            </div>
            <div className="fare-rows">
              <div className="fare-row"><span>혼자 타면</span><b className="off">{won(solo.fare)}</b>{solo.surcharged && <small>할증 포함</small>}</div>
              <div className="fare-row main"><span>{people}명이 나눠 타면 1인</span><b>{won(shared.share)}</b><small>{won(solo.fare - shared.share)} 아낌</small></div>
              {ret && <div className="fare-row policy"><span>귀로 할증 면제 시 1인</span><b>{won(round100(solo.fareDongRate / people))}</b><small>정책 제안</small></div>}
            </div>
            <div className="seg small">{[2, 3].map((v) => <button key={v} className={people === v ? 'on' : ''} onClick={() => setPeople(v)}>{v}명</button>)}</div>
            {ret && <p className="sub" style={{ marginTop: 10 }}>이 방향은 이 지역에 손님을 내려 준 택시가 빈 차로 돌아가는 길이에요. 모집이 열리면 기사님 화면에 귀로 손님으로 보여요.</p>}
          </section>
        )}

        <section className="card">
          <p className="card-title">{place.name}에서 출발하는 모집 <small>{canUse ? `${rides.length}건` : ''}</small></p>
          {!canUse && (
            <div className="empty">
              <p className="sub">{session ? '가입 정보를 먼저 입력해 주세요.' : '로그인하면 모집을 열거나 참여할 수 있어요.'}</p>
              {!session && <button className="btn" style={{ marginTop: 10 }} onClick={onLogin}>로그인 · 체험 계정</button>}
            </div>
          )}
          {canUse && rides.length === 0 && !form && <p className="sub">아직 열린 모집이 없어요. 첫 모집을 열어 보세요.</p>}
          {canUse && rides.map((r) => {
            const joined = r.ride_members.some((m) => m.user_id === me)
            const full = r.status !== 'open'
            return (
              <div key={r.id} className="ride-item">
                <div>
                  <b>→ {r.dest_name}</b> {isReturnRoute(spotZoneId(placeFromId(r.spot_id) ?? place), r.dest_zone) && <span className="tag">귀로</span>}
                  <span className="meta">{hhmm(r.depart_at)} 출발 · {when(r.depart_at)} · {r.ride_members.length}/{r.max_people}명 · 1인 약 {won(price(r, r.max_people).share)}</span>
                </div>
                {joined ? <span className="tag">참여 중</span>
                  : <button className="pill-btn small" disabled={busy || full} onClick={() => act(() => joinRide(r.id, me, profile.nickname), '참여했어요. 탑승 전 안내를 확인해 주세요.')}>{full ? '마감' : '참여'}</button>}
              </div>
            )
          })}
          {canUse && !form && <button className="btn" style={{ marginTop: 12 }} disabled={!to} onClick={() => setForm({ leave: ktx[0] ? Math.max(5, minutesUntil(ktx[0].time) + 10) : 15, meet: '' })}>{to ? `${zoneById[to].name}행 모집 열기` : '목적지를 골라 주세요'}</button>}
          {canUse && form && (
            <div className="new-ride">
              <div className="field"><span>언제 출발해요?</span>
                <div className="seg wrap">
                  {LEAVE.map(([v, l]) => <button key={v} type="button" className={form.leave === v ? 'on' : ''} onClick={() => setForm({ ...form, leave: v })}>{l}</button>)}
                  {ktx.map((t) => { const v = Math.max(5, minutesUntil(t.time) + 10); return <button key={t.no} type="button" className={form.leave === v ? 'on' : ''} onClick={() => setForm({ ...form, leave: v })}>{t.grade} {t.time} 도착 후</button> })}
                </div>
              </div>
              <label className="field"><span>어디서 만날까요? <small className="hint">선택</small></span>
                <input value={form.meet} maxLength={30} placeholder={place.custom ? '예: 호수공원 정문' : `예: ${place.name} 택시 승차장`} onChange={(e) => setForm({ ...form, meet: e.target.value })} />
              </label>
              <p className="sub">{people}명 · {zoneById[to].name}행 · {profile.gender === 'F' ? '여성' : '남성'} 회원에게만 보여요 (합승은 같은 성별끼리만 가능)</p>
              <div className="grid2" style={{ marginTop: 10, marginBottom: 0 }}>
                <button className="btn ghost" onClick={() => setForm(null)}>취소</button>
                <button className="btn" disabled={busy} onClick={submitNew}>모집 열기</button>
              </div>
            </div>
          )}
        </section>

        <section className="card">
          <button className="row-btn" onClick={() => setBusOpen(!busOpen)}>
            <span className="with-badge"><span className="ibadge blue"><Icon name="bus" size={16} /></span>버스로 가면?</span>
            <span className="r">{nb ? `${nb.route}번 ${nb.min}분 후` : last?.ended ? '운행 끝' : bus?.ok ? '도착 예정 없음' : bus ? '실시간 정보 없음' : '불러오는 중'} {busOpen ? '▴' : '▾'}</span>
          </button>
          {busOpen && (
            <div className="detail">
              {bus?.ok && bus.stations.slice(0, 3).map((s) => <div key={s.id} className="seat"><span>{s.name}</span><span>{s.arrivals.slice(0, 2).map((a) => `${a.route}번 ${a.min}분`).join(' · ') || '없음'}</span></div>)}
              {last && <div className="seat"><span>가장 늦은 막차</span><span>{last.latest.route}번 {last.latest.last}</span></div>}
              {trains?.ok && trains.next.slice(0, 3).map((t) => <div key={t.no} className="seat"><span>{t.grade} {t.no} ({t.from})</span><span>{t.time} 도착</span></div>)}
              {!bus?.ok && !last && <span>실시간 정보를 불러오지 못했어요.</span>}
            </div>
          )}
        </section>

        <p className="foot">자료: 국토교통부 택시운행정보(TIMS) 2025 · 청주시 요금(보도 기준) · 요금은 거리 추정치예요</p>
      </div>

      {picker && (
        <div className="modal" onClick={() => setPicker(false)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="grabber" />
            <h2 className="sheet-title">어디서 출발하세요?</h2>
            <button className="pick-row primary" onClick={useHere}>
              <Icon name="locate" size={20} /><span><b>현재 위치</b><small>{gps.state === 'finding' ? '위치를 찾는 중…' : here ? `${zoneById[here.zoneId].name}${here.id.startsWith('zone:') ? '' : ` · ${here.nearSpot.name} 근처`}` : 'GPS로 가장 가까운 승차 지점을 찾아요'}</small></span>
            </button>
            <p className="label" style={{ margin: '14px 0 6px' }}>택시를 많이 타는 곳 <small className="hint">여기서 모이면 매칭이 잘 돼요</small></p>
            {spots.map((s) => (
              <button key={s.id} className={`pick-row ${s.id === sel ? 'on' : ''}`} onClick={() => choose(s.id)}>
                <Icon name="pin" size={18} /><span><b>{s.name}</b><small>{s.zone} · 하루 택시 {s.pickups_per_day.toLocaleString()}건</small></span>
                {gps.pos && <em>{(Math.hypot(s.lat - gps.pos.lat, (s.lon - gps.pos.lon) * 0.8) * 111).toFixed(1)}km</em>}
              </button>
            ))}
            <label className="field" style={{ marginTop: 12 }}><span>또는 읍면동에서 고르기</span>
              <select value={place.custom ? place.id : ''} onChange={(e) => e.target.value && choose(e.target.value)}>
                <option value="">선택하세요</option>
                {zones.map((z) => <option key={z.zone_id} value={`zone:${z.zone_id}`}>{z.name} ({z.gu})</option>)}
              </select>
            </label>
            <p className="sub">지도를 직접 눌러서 출발 위치를 고를 수도 있어요.</p>
          </div>
        </div>
      )}
    </div>
  )
}

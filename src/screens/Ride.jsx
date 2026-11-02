// 타기: 지도 + 출발·도착(검색·GPS·지도 누르기) → 요금 비교 → 주변 모집 참여·모집 열기 → 버스·막차·KTX
import { useEffect, useRef, useState } from 'react'
import Logo from '../components/Logo.jsx'
import Icon from '../components/Icon.jsx'
import { spots, zoneById, won, spotZoneId, placeFromId, isReturnRoute, placeAt, originId, quoteBetween, tripQuote, distM, defaultDest, destChoices, returnChance } from '../data.js'
import { supabase } from '../lib/supabase.js'
import { askNotify } from '../lib/alerts.js'
import { useMyPosition } from '../lib/geo.js'
import { searchPlaces } from '../lib/search.js'
import { useLive, nextBus, useLastBus, lastBusState, useTrains, minutesUntil } from '../lib/live.js'
import { listAllOpen, myRides, createRide, joinRide, leaveRide, setRideStatus, useRidesLive, recordTrip, tripRecorded, rideError, saveTrip, rateMembers } from '../lib/rides.js'

const SEATS = ['조수석', '뒷좌석 오른쪽', '뒷좌석 왼쪽']
const hhmm = (iso) => new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
const minsLeft = (iso) => Math.round((new Date(iso) - Date.now()) / 60000)
const when = (iso) => { const m = minsLeft(iso); return m > 0 ? `${m}분 후` : m > -15 ? '출발 시간' : '지남' }
const LEAVE = [[5, '지금'], [15, '15분 후'], [30, '30분 후'], [60, '1시간 후']]
const round100 = (n) => Math.ceil(n / 100) * 100
const NEAR_M = 1500   // 이 거리 안의 모집을 '내 주변 모집'으로
const OSONG = spots.find((s) => s.id === 'osong_stn')
const fromSpot = (s) => placeAt(s.lat, s.lon, s.name)
const zonePlace = (z) => placeAt(zoneById[z].centroid_lat, zoneById[z].centroid_lon, zoneById[z].name) ?? { lat: zoneById[z].centroid_lat, lon: zoneById[z].centroid_lon, zoneId: z, name: zoneById[z].name }

// 탑승 사실을 지인에게 알리기 (공유 시트, 안 되면 문자)
function shareTrip(r, me) {
  const text = `[쉐어택 탑승 알림] ${r.spot_name} → ${r.dest_name}, ${hhmm(r.depart_at)} 출발, 동승 ${r.ride_members.length}명 (${r.ride_members.map((m) => m.nickname).join(', ')}). 내 닉네임: ${me}`
  if (navigator.share) navigator.share({ title: '쉐어택 탑승 알림', text }).catch(() => {})
  else location.href = `sms:?&body=${encodeURIComponent(text)}`
}

// 최근 고른 곳 (이 기기에만 저장)
const RECENT = 'recent_places_v1'
const loadRecent = () => { try { return JSON.parse(localStorage.getItem(RECENT)) ?? [] } catch { return [] } }
function saveRecent(p) {
  try { localStorage.setItem(RECENT, JSON.stringify([p, ...loadRecent().filter((x) => x.name !== p.name)].slice(0, 5))) } catch {}
}

// 위치 확인은 앱 안 지도 대신 카카오맵으로 (키 없음, 앱이 없으면 웹 지도로 열림)
const mapUrl = (name, lat, lon) => `https://map.kakao.com/link/map/${encodeURIComponent(name)},${lat},${lon}`

// 집·회사 (이 기기에만 저장)
const SAVED = 'saved_places_v1'
const loadSaved = () => { try { return JSON.parse(localStorage.getItem(SAVED)) ?? {} } catch { return {} } }
const saveAs = (kind, p) => { try { localStorage.setItem(SAVED, JSON.stringify({ ...loadSaved(), [kind]: p })) } catch {} }

// 모집을 카톡 등으로 공유 (처음 사람이 적을 때 직접 모으기)
function shareRide(r) {
  const text = `[쉐어택] ${r.spot_name.split(' · ')[0]} → ${r.dest_name}, ${hhmm(r.depart_at)} 출발${r.kind === 'roundtrip' ? ' · 왕복 택시라 할증 없음' : ''}. 같이 타요!`
  if (navigator.share) navigator.share({ title: '쉐어택 모집', text, url: location.origin }).catch(() => {})
  else navigator.clipboard?.writeText(`${text} ${location.origin}`)
}

function PlaceSheet({ title, near, onPick, onHere, onClose, gpsState }) {
  const [q, setQ] = useState('')
  const [res, setRes] = useState(null)
  const [saved, setSaved] = useState(loadSaved)
  const keep = (kind, p) => { saveAs(kind, p); setSaved(loadSaved()) }
  useEffect(() => {
    if (q.trim().length < 2) { setRes(null); return }
    const t = setTimeout(async () => setRes(await searchPlaces(q.trim(), near) ?? 'error'), 350)
    return () => clearTimeout(t)
  }, [q])
  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="grabber" />
        <h2 className="sheet-title">{title}</h2>
        <input className="search-input" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="주소·장소 검색 (예: 오창읍 양청리, 가로수로 1234, 충북대학교)" />
        {res === 'error' && <p className="sub" style={{ marginTop: 8 }}>검색이 잠시 안 돼요. 지도에서 골라 주세요.</p>}
        {Array.isArray(res) && res.length === 0 && <p className="sub" style={{ marginTop: 8 }}>청주 안에서 찾지 못했어요.</p>}
        {Array.isArray(res) && res.map((p, i) => (
          <button key={i} className="pick-row" onClick={() => onPick(p)}>
            <Icon name="pin" size={18} /><span><b>{p.name}</b><small>{zoneById[p.zoneId].name}{p.sub ? ` · ${p.sub}` : ''}</small></span>
            <i className="save-as" onClick={(e) => { e.stopPropagation(); keep('home', p) }}>집</i><i className="save-as" onClick={(e) => { e.stopPropagation(); keep('work', p) }}>회사</i>
          </button>
        ))}
        {!res && (
          <>
            <div className="grid2" style={{ marginTop: 12 }}>
              {onHere && <button className="pick-tile" onClick={onHere}><Icon name="locate" size={20} /><b>현재 위치</b><small>{gpsState === 'finding' ? '찾는 중…' : 'GPS'}</small></button>}
              {[['home', '🏠 집'], ['work', '🏢 회사']].map(([k, l]) => (
                <button key={k} className="pick-tile" disabled={!saved[k]} onClick={() => saved[k] && onPick(saved[k])}><b>{l}</b><small>{saved[k] ? saved[k].name : '검색 결과에서 저장'}</small></button>
              ))}
            </div>
            {loadRecent().length > 0 && <p className="label" style={{ margin: '14px 0 2px' }}>최근</p>}
            {loadRecent().map((p, i) => (
              <button key={i} className="pick-row" onClick={() => onPick(p)}><Icon name="pin" size={18} /><span><b>{p.name}</b><small>{zoneById[p.zoneId]?.name}</small></span></button>
            ))}
            <p className="label" style={{ margin: '14px 0 4px' }}>자주 찾는 곳</p>
            <div className="chips wrap">{spots.slice(0, 6).map((s) => <button key={s.id} className="chip" onClick={() => onPick(fromSpot(s))}>{s.name}</button>)}</div>
          </>
        )}
      </div>
    </div>
  )
}

export default function Ride({ account, onLogin }) {
  const { session, profile } = account
  const me = session?.user?.id
  const canUse = !!(supabase && session && profile)
  const gps = useMyPosition()

  const [from, setFrom] = useState(() => fromSpot(OSONG))
  const [to, setTo] = useState(null)
  const [sheet, setSheet] = useState(null)        // 'from' | 'to'
  const [wantHere, setWantHere] = useState(false)
  const [people, setPeople] = useState(3)
  const [open, setOpen] = useState([])
  const [mine, setMine] = useState([])
  const [form, setForm] = useState(null)
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)
  const [rating, setRating] = useState(null)
  const [busOpen, setBusOpen] = useState(false)
  const [rt, setRt] = useState(null)              // 왕복 매칭 열기 폼 { arrive: 분 뒤, seats }

  const dest = to ?? (defaultDest(from.zoneId) ? zonePlace(defaultDest(from.zoneId)) : null)
  const setFromPlace = (p) => { setFrom(p); setTo(null); setForm(null); setMsg(null); setSheet(null); if (p.name !== '현재 위치') saveRecent(p) }
  const setToPlace = (p) => { setTo(p); setForm(null); setSheet(null); saveRecent(p) }
  const swap = () => { if (!dest) return; setFrom(dest); setTo(from); setForm(null) }

  const useHere = () => {
    if (!gps.pos) { setWantHere(true); return gps.start() }
    setWantHere(false)
    const p = placeAt(gps.pos.lat, gps.pos.lon, '현재 위치')
    if (!p) return setMsg({ bad: true, text: '지금 위치가 청주 밖이에요. 출발지를 검색해 주세요.' })
    setFromPlace(p)
  }
  useEffect(() => { if (wantHere && gps.pos) useHere() }, [wantHere, gps.pos?.lat])
  const autoHere = useRef(true)
  useEffect(() => {
    if (!autoHere.current || !gps.pos) return
    autoHere.current = false
    const p = placeAt(gps.pos.lat, gps.pos.lon, '현재 위치')
    if (p) setFrom(p)
  }, [gps.pos?.lat])



  // 버스·막차·KTX (출발지 기준)
  const busSpot = { id: `${from.lat.toFixed(3)},${from.lon.toFixed(3)}`, lat: from.lat, lon: from.lon }
  const { bus } = useLive(busSpot)
  const nb = nextBus(bus)
  const last = lastBusState(useLastBus(busSpot))
  const trains = useTrains(distM(from, OSONG) < 3000)
  const ktx = trains?.ok ? trains.next.filter((t) => minutesUntil(t.time) >= 0 && minutesUntil(t.time) <= 90).slice(0, 3) : []

  // 요금 (실제 두 지점 거리)
  const solo = dest ? quoteBetween(from, dest, 1) : null
  const shared = dest ? quoteBetween(from, dest, people) : null
  const ret = dest && isReturnRoute(from.zoneId, dest.zoneId)
  const outbound = dest && solo?.surcharged && isReturnRoute(dest.zoneId, from.zoneId)   // 시내 → 읍·면 (돌아올 때 빈 차가 되는 방향)
  const chance = outbound ? returnChance(dest.zoneId) : null
  const price = (r, n) => tripQuote(spotZoneId(placeFromId(r.spot_id) ?? from), r.dest_zone, n)

  // 내 주변(1.5km) 모집
  useRidesLive(async () => {
    if (!canUse) return
    const [all, m] = await Promise.all([listAllOpen(), myRides(me)])
    setOpen(all); setMine(m.filter((r) => !(r.status === 'done' && tripRecorded(r.id))))
  }, [canUse, me])
  const nearby = open.filter((r) => { const o = placeFromId(r.spot_id); return o && distM(o, from) <= NEAR_M && !mine.some((x) => x.id === r.id) })
    .sort((a, b) => (b.dest_zone === dest?.zoneId) - (a.dest_zone === dest?.zoneId))

  const act = async (fn, ok) => {
    askNotify()
    setBusy(true); setMsg(null)
    const { error } = await fn()
    setBusy(false)
    if (error) setMsg({ bad: true, text: rideError(error) }); else if (ok) setMsg({ text: ok })
  }
  const submitNew = () => act(async () => {
    const meet = form.meet.trim()
    const r = await createRide({
      host_id: me, spot_id: originId(from), spot_name: meet ? `${from.name} · ${meet.slice(0, 30)}` : from.name,
      dest_zone: dest.zoneId, dest_name: dest.name, depart_at: new Date(Date.now() + form.leave * 60000).toISOString(), max_people: people, gender: profile.gender,
    })
    if (!r.error) setForm(null)
    return r
  }, '모집을 열었어요. 같은 방향 손님이 참여하면 바로 알려 드려요.')

  // 왕복 매칭: 내가 탄 택시가 도착지에 닿는 시각에, 그곳에서 시내로 갈 손님을 미리 구한다 (양쪽 할증 없음)
  const submitRoundtrip = () => act(async () => {
    const r = await createRide({
      host_id: me, kind: 'roundtrip', spot_id: originId(dest), spot_name: `${dest.name} · 왕복 택시 도착`, out_from: from.name,
      dest_zone: from.zoneId, dest_name: from.name, depart_at: new Date(Date.now() + rt.arrive * 60000).toISOString(),
      max_people: rt.seats + 1, gender: profile.gender, hold_won: Math.round(solo.fare - solo.fareDongRate),
    })
    if (!r.error) setRt(null)
    return r
  }, '왕복 매칭을 열었어요. 도착지에서 시내로 갈 손님이 참여하면 알려 드려요.')

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

  const banner = last?.ended ? { tone: 'red', title: '버스가 끊긴 시간이에요', body: '같은 방향 손님과 택시를 나눠 타세요.' }
    : ktx[0] ? { tone: 'blue', title: `KTX ${ktx[0].time} 도착 (${minutesUntil(ktx[0].time)}분 후)`, body: '도착 시각에 맞춰 모집을 열면 같이 탈 사람이 가장 많아요.' }
    : last?.soon ? { tone: 'amber', title: `막차까지 ${last.left}분`, body: `${last.latest.route}번 ${last.latest.last} · 놓치면 같이 타기로` }
    : null

  return (
    <div className="ride">
      <div className="ride-top">
        <div className="ride-brand"><Logo size={26} light /><span>택시 앱과 함께 쓰는 할증 도우미</span></div>
        <div className="route-box">
          <button className="route-row" onClick={() => setSheet('from')}><span className="dot-from" /><span className="sb-text"><small>출발</small><b>{from.name}</b></span></button>
          {dest && <button className="swap-btn" onClick={swap} aria-label="출발과 도착 바꾸기">⇅</button>}
          <button className="route-row" onClick={() => setSheet('to')}><span className="dot-to" /><span className="sb-text"><small>도착</small><b>{dest ? dest.name : '어디로 가세요?'}</b></span></button>
        </div>
        <div className="top-actions">
          <button className="here-btn" onClick={useHere}><Icon name="locate" size={16} /> {gps.state === 'finding' ? '위치 찾는 중…' : '내 위치에서 출발'}</button>
          <a className="here-btn" href={mapUrl(`출발: ${from.name}`, from.lat, from.lon)} target="_blank" rel="noreferrer"><Icon name="pin" size={16} /> 출발지 지도로 보기</a>
        </div>
      </div>

      <div className="sheet">
        <div className="grabber" />
        {gps.state === 'denied' && <p className="form-msg bad">위치 권한이 꺼져 있어요. 출발지를 검색하거나 지도를 눌러 주세요.</p>}
        {msg && <p className={`form-msg ${msg.bad ? 'bad' : ''}`}>{msg.text}</p>}

        {rating && (
          <section className="card mine">
            <p className="card-title">같이 탄 분은 어땠나요?</p>
            {rating.ride.kind === 'roundtrip' && <p className="sub" style={{ marginBottom: 6 }}>'안 왔어요'를 고르면 노쇼 수수료 {won(rating.ride.hold_won ?? 0)}가 그 사람에게 부과돼 기사님 손실을 메워요 (시범).</p>}
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
          return (
            <section key={r.id} className="card mine">
              <p className="card-title"><span>내 모집</span>
                <span className={`tag ${r.status === 'open' ? 'amber' : ''}`}>{r.status === 'open' ? `${members.length}/${r.max_people}명 모집 중` : r.status === 'full' ? '모집 완료' : '도착'}</span></p>
              <p className="trip-line">{r.spot_name} <span>→</span> {r.dest_name}</p>
              <p className="sub">{hhmm(r.depart_at)} 출발 ({when(r.depart_at)}) · 1인 약 {won(price(r, members.length).share)}</p>
              <div className="detail">
                <b>탑승 전 안내</b>
                {members.map((m, i) => <div key={m.user_id} className="seat"><span>{m.nickname}{m.user_id === me ? ' (나)' : ''}{m.user_id === r.host_id ? ' · 모집자' : ''}</span><span>{SEATS[i] ?? '뒷좌석'}</span></div>)}
                <div style={{ marginTop: 6 }}>대표 1명이 택시를 부르고, 요금은 도착 후 나눠요. {placeFromId(r.spot_id) && <a href={mapUrl(r.spot_name, placeFromId(r.spot_id).lat, placeFromId(r.spot_id).lon)} target="_blank" rel="noreferrer">만날 곳 지도로 보기 ›</a>}</div>
              </div>
              <div className="grid2" style={{ marginTop: 10, marginBottom: 0 }}>
                {r.host_id === me
                  ? <button className="btn ghost" disabled={busy} onClick={() => act(() => setRideStatus(r.id, 'cancelled'), '모집을 취소했어요.')}>모집 취소</button>
                  : <button className="btn ghost" disabled={busy} onClick={() => act(() => leaveRide(r.id, me), '모집에서 나왔어요.')}>나가기</button>}
                <button className="btn" onClick={() => arrived(r)}>도착했어요</button>
              </div>
              <div className="safety-row">
                <a href="tel:112" className="sos">112 신고</a>
                {r.status === 'open' && <button className="ghost-link" onClick={() => shareRide(r)}>모집 공유</button>}
                <button className="ghost-link" onClick={() => shareTrip(r, profile.nickname)}>지인에게 탑승 알리기</button>
                <a href="kakaot://" className="ghost-link">택시 부르기</a>
              </div>
            </section>
          )
        })}

        {banner && <div className={`banner ${banner.tone}`}><b>{banner.title}</b><span>{banner.body}</span></div>}

        {!to && (
          <>
            <h2 className="sheet-title">어디로 가세요?</h2>
            <div className="chips">
              {destChoices(from.zoneId).slice(0, 3).map((d) => (
                <button key={d} className={`chip ${d === dest?.zoneId ? 'on' : ''}`} onClick={() => setToPlace(zonePlace(d))}>
                  {zoneById[d].name}{isReturnRoute(from.zoneId, d) && <i className="chip-dot" />}
                </button>
              ))}
              <button className="chip" onClick={() => setSheet('to')}>🔍 검색</button>
            </div>
          </>
        )}

        {solo && (
          <section className="card fare">
            <div className="fare-head">
              <p className="trip-line">{solo.km.toFixed(1)}km</p>
              {ret ? <span className="tag">귀로 매칭 구간</span> : solo.surcharged ? <span className="tag amber">할증 구간</span> : null}
            </div>
            <div className="fare-rows">
              <div className="fare-row"><span>혼자 타면</span><b className="off">{won(solo.fare)}</b>{solo.surcharged && <small>할증 포함</small>}</div>
              <div className="fare-row main"><span>{people}명이 나눠 타면 1인</span><b>{won(shared.share)}</b><small>{won(solo.fare - shared.share)} 아낌</small></div>
              {ret && <div className="fare-row policy"><span>귀로 할증 면제 시 1인</span><b>{won(round100(solo.fareDongRate / people))}</b><small>정책 제안</small></div>}
            </div>
            <div className="seg small">{[2, 3].map((v) => <button key={v} className={people === v ? 'on' : ''} onClick={() => setPeople(v)}>{v}명</button>)}</div>
            {ret && <p className="sub" style={{ marginTop: 10 }}>이 방향은 이 지역에 손님을 내려 준 택시가 빈 차로 돌아가는 길이에요. 모집을 열면 기사님 화면에 귀로 손님으로 보여요.</p>}
          </section>
        )}

        {outbound && (
          <section className="card rt-card">
            <p className="card-title">할증 없이 가는 방법 <small>시내 → 읍·면</small></p>
            <div className="rt-opt">
              <b>① 왕복 매칭 <span className="tag">양쪽 할증 없음</span></b>
              <p className="sub">{dest.name}에서 시내로 갈 손님을 미리 구해요. 택시가 갈 때도 올 때도 손님을 태우니 할증 이유가 없어요. 합승이 아니라 성별 제한도 없어요.</p>
              {canUse && !rt && <button className="btn" style={{ marginTop: 8 }} onClick={() => setRt({ arrive: Math.max(10, Math.round(solo.km * 2.5)), seats: 1 })}>왕복 매칭 열기</button>}
              {canUse && rt && (
                <div className="new-ride">
                  <div className="field"><span>{dest.name} 도착 예정</span>
                    <div className="seg wrap">{[rt.arrive, rt.arrive + 15, rt.arrive + 30].map((v) => <button key={v} className={rt.arrive === v ? 'on' : ''} onClick={() => setRt({ ...rt, arrive: v })}>{new Date(Date.now() + v * 60000).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</button>)}</div>
                  </div>
                  <div className="field"><span>돌아올 때 태울 손님</span>
                    <div className="seg">{[1, 2].map((v) => <button key={v} className={rt.seats === v ? 'on' : ''} onClick={() => setRt({ ...rt, seats: v })}>{v}명</button>)}</div>
                  </div>
                  <p className="sub">상대가 안 오면(노쇼) 할증분 <b>{won(solo.fare - solo.fareDongRate)}</b>을 안 온 쪽이 내서 기사님의 빈 차 손실을 메워요. (시범: 실제 결제 없음)</p>
                  <div className="grid2" style={{ marginTop: 10, marginBottom: 0 }}>
                    <button className="btn ghost" onClick={() => setRt(null)}>취소</button>
                    <button className="btn" disabled={busy} onClick={submitRoundtrip}>열기</button>
                  </div>
                </div>
              )}
            </div>
            <div className="rt-opt">
              <b>② 귀로 연계 결제 <span className="tag gray">모의</span></b>
              <p className="sub">앱으로 부르면 할증 포함 <b>{won(solo.fare)}</b>을 먼저 가승인해요. 내린 뒤 30분 안에 그 택시가 귀로 손님을 태우면 할증을 뺀 <b>{won(solo.fareDongRate)}</b>만 최종 결제돼요. 귀로 손님도 할증 없이 가요.</p>
              {chance && <p className="chance">지금 {zoneById[dest.zoneId].name}에서 30분 안에 귀로 손님을 만날 확률 <b>약 {Math.round(chance.p * 100)}%</b><small>TIMS 2025 승차 × 시내행 비율 × 앱 이용 30% 가정</small></p>}
            </div>
            <p className="sub" style={{ marginTop: 6 }}>③ 앱 없이 현장에서 타면 지금처럼 미터기 요금(할증 포함)이에요.</p>
          </section>
        )}

        <section className="card">
          <p className="card-title">내 주변 모집 <small>{canUse ? `반경 1.5km · ${nearby.length}건` : ''}</small></p>
          {!canUse && (
            <div className="empty">
              <p className="sub">{session ? '가입 정보를 먼저 입력해 주세요.' : '로그인하면 모집을 열거나 참여할 수 있어요.'}</p>
              {!session && <button className="btn" style={{ marginTop: 10 }} onClick={onLogin}>로그인 · 체험 계정</button>}
            </div>
          )}
          {canUse && nearby.length === 0 && !form && <p className="sub">주변에 열린 모집이 없어요. 첫 모집을 열어 보세요.</p>}
          {canUse && nearby.map((r) => {
            const joined = r.ride_members.some((m) => m.user_id === me)
            const o = placeFromId(r.spot_id)
            return (
              <div key={r.id} className="ride-item">
                <div>
                  <b>→ {r.dest_name}</b> {r.kind === 'roundtrip' ? <span className="tag">왕복 택시 · 할증 없음</span> : r.dest_zone === dest?.zoneId && <span className="tag">같은 방향</span>}
                  <span className="meta"><a href={mapUrl(r.spot_name, o.lat, o.lon)} target="_blank" rel="noreferrer">{r.spot_name.split(' · ')[0]}</a>에서 · 걸어서 {Math.max(1, Math.round(distM(o, from) / 70))}분 · {hhmm(r.depart_at)} 출발 · {r.ride_members.length}/{r.max_people}명</span>
                </div>
                {joined ? <span className="tag">참여 중</span>
                  : <button className="pill-btn small" disabled={busy || r.status !== 'open'} onClick={() => act(() => joinRide(r.id, me, profile.nickname), r.kind === 'roundtrip' ? `참여했어요. ${hhmm(r.depart_at)}에 도착하는 택시를 타면 할증 없이 가요. 안 오면 노쇼 수수료 ${won(r.hold_won ?? 0)}가 부과돼요(시범).` : '참여했어요. 탑승 전 안내를 확인해 주세요.')}>{r.status !== 'open' ? '마감' : '참여'}</button>}
              </div>
            )
          })}
          {canUse && !form && <button className="btn" style={{ marginTop: 12 }} disabled={!dest} onClick={() => setForm({ leave: ktx[0] ? Math.max(5, minutesUntil(ktx[0].time) + 10) : 15, meet: '' })}>{dest ? `${dest.name}행 모집 열기` : '도착지를 골라 주세요'}</button>}
          {canUse && form && (
            <div className="new-ride">
              <div className="field"><span>언제 출발해요?</span>
                <div className="seg wrap">
                  {LEAVE.map(([v, l]) => <button key={v} type="button" className={form.leave === v ? 'on' : ''} onClick={() => setForm({ ...form, leave: v })}>{l}</button>)}
                  {ktx.map((t) => { const v = Math.max(5, minutesUntil(t.time) + 10); return <button key={t.no} type="button" className={form.leave === v ? 'on' : ''} onClick={() => setForm({ ...form, leave: v })}>{t.grade} {t.time} 도착 후</button> })}
                </div>
              </div>
              <label className="field"><span>어디서 만날까요? <small className="hint">선택</small></span>
                <input value={form.meet} maxLength={30} placeholder="예: 택시 승차장, 정문 앞" onChange={(e) => setForm({ ...form, meet: e.target.value })} />
              </label>
              <p className="sub">{from.name} → {dest.name} · {people}명 · {profile.gender === 'F' ? '여성' : '남성'} 회원에게만 보여요 (합승은 같은 성별끼리만 가능)</p>
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

        <p className="foot">요금은 직선거리 × 1.3으로 추정 · 자료: TIMS 2025, 청주시 요금(보도 기준) · 장소 검색 © OpenStreetMap</p>
      </div>

      {sheet && (
        <PlaceSheet
          title={sheet === 'from' ? '어디서 출발하세요?' : '어디로 가세요?'}
          near={from} gpsState={gps.state}
          onPick={sheet === 'from' ? setFromPlace : setToPlace}
          onHere={sheet === 'from' ? () => { setSheet(null); useHere() } : null}
          onClose={() => setSheet(null)}
        />
      )}
    </div>
  )
}

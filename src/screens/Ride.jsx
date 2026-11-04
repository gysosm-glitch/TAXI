// 타기: 출발·도착(검색·GPS) → 요금 비교 → 할증 없이 가기 → 주변 모집 참여·모집 열기 → 버스·막차·KTX
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
const [wonNum, wonUnit] = [(n) => Math.round(n).toLocaleString('ko-KR'), '원']

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
  const recent = loadRecent()
  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-sheet" role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="grabber" />
        <div className="sheet-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="닫기"><Icon name="close" size={18} /></button>
        </div>
        <label className="search">
          <Icon name="search" size={18} />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="주소·장소 검색" enterKeyHint="search" />
          {q && <button className="text-btn small" style={{ padding: 0, minHeight: 0 }} onClick={() => setQ('')} aria-label="지우기"><Icon name="close" size={16} /></button>}
        </label>
        {!q && <p className="fine" style={{ margin: '0 4px 8px' }}>예: 오창읍 양청리, 가로수로 1234, 충북대학교</p>}
        {res === 'error' && <p className="note"><Icon name="info" size={18} />검색이 잠시 안 돼요. 아래 자주 찾는 곳에서 골라 주세요.</p>}
        {Array.isArray(res) && res.length === 0 && <p className="note"><Icon name="info" size={18} />청주 안에서 찾지 못했어요.</p>}
        {Array.isArray(res) && res.length > 0 && (
          <div className="group">
            {res.map((p, i) => (
              <div key={i} className="cell-wrap">
                <div className="cell with-icon">
                  <button className="pick-btn" onClick={() => onPick(p)}>
                    <span className="cell-icon gray"><Icon name="pin" size={18} /></span>
                    <span className="grow"><b>{p.name}</b><small>{zoneById[p.zoneId].name}{p.sub ? ` · ${p.sub}` : ''}</small></span>
                  </button>
                  <button className="save-as" style={{ border: 0 }} onClick={() => keep('home', p)}>집</button>
                  <button className="save-as" style={{ border: 0 }} onClick={() => keep('work', p)}>회사</button>
                </div>
              </div>
            ))}
          </div>
        )}
        {!res && (
          <>
            <div className="quick-grid">
              {onHere && <button className="quick" onClick={onHere}><span className="q-icon"><Icon name="locate" size={18} /></span><b>현재 위치</b><small>{gpsState === 'finding' ? '찾는 중…' : 'GPS'}</small></button>}
              {[['home', 'home', '집'], ['work', 'work', '회사']].map(([k, ic, l]) => (
                <button key={k} className={`quick ${saved[k] ? '' : 'off'}`} disabled={!saved[k]} onClick={() => saved[k] && onPick(saved[k])}>
                  <span className="q-icon"><Icon name={ic} size={18} /></span><b>{l}</b><small>{saved[k] ? saved[k].name : '검색 후 저장'}</small>
                </button>
              ))}
            </div>
            {recent.length > 0 && (
              <>
                <p className="group-label">최근</p>
                <div className="group">
                  {recent.map((p, i) => (
                    <button key={i} className="cell with-icon" onClick={() => onPick(p)}>
                      <span className="cell-icon gray"><Icon name="clock" size={18} /></span>
                      <span className="grow"><b>{p.name}</b><small>{zoneById[p.zoneId]?.name}</small></span>
                    </button>
                  ))}
                </div>
              </>
            )}
            <p className="group-label">자주 찾는 곳</p>
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

  const banner = last?.ended ? { icon: 'moon', title: '버스가 끊긴 시간이에요', body: '같은 방향 손님과 택시를 나눠 타세요.' }
    : ktx[0] ? { icon: 'train', title: `KTX ${ktx[0].time} 도착 · ${minutesUntil(ktx[0].time)}분 후`, body: '도착 시각에 맞춰 모집을 열면 같이 탈 사람이 가장 많아요.' }
    : last?.soon ? { icon: 'bus', title: `막차까지 ${last.left}분`, body: `${last.latest.route}번 ${last.latest.last} · 놓치면 같이 타기로` }
    : null

  return (
    <div className="ride">
      <header className="ride-head">
        <div className="nav-top">
          <Logo size={30} />
          <button className="icon-btn" onClick={useHere} aria-label="내 위치에서 출발"><Icon name="locate" size={20} /></button>
        </div>
        <h1 className="large-title">어디로 갈까요?</h1>
        <p className="lead-sub" style={{ marginBottom: 14 }}>택시 앱과 함께 쓰는 할증 도우미</p>
      </header>

      <div className="ride-body">
        <section className="route-card" aria-label="출발과 도착">
          <button className="route-row" onClick={() => setSheet('from')}>
            <span className="r-dot from" /><span className="r-text"><small>출발</small><b>{from.name}</b></span>
          </button>
          <button className="route-row" onClick={() => setSheet('to')}>
            <span className="r-dot to" /><span className="r-text"><small>도착</small><b className={dest ? '' : 'placeholder'}>{dest ? dest.name : '어디로 가세요?'}</b></span>
          </button>
          {dest && <button className="swap-btn" onClick={swap} aria-label="출발과 도착 바꾸기"><Icon name="swap" size={18} /></button>}
          <div className="capsule-row">
            <button className="capsule" onClick={useHere}><Icon name="locate" size={16} />{gps.state === 'finding' ? '찾는 중…' : '내 위치에서 출발'}</button>
            <a className="capsule" href={mapUrl(`출발: ${from.name}`, from.lat, from.lon)} target="_blank" rel="noreferrer"><Icon name="map" size={16} />지도로 보기</a>
          </div>
        </section>

        {gps.state === 'denied' && <p className="note bad"><Icon name="info" size={18} />위치 권한이 꺼져 있어요. 출발지를 검색해 주세요.</p>}
        {msg && <p className={`note ${msg.bad ? 'bad' : 'ok'}`} role="status"><Icon name={msg.bad ? 'info' : 'check'} size={18} />{msg.text}</p>}

        {rating && (
          <section className="card selected">
            <p className="card-title">같이 탄 분은 어땠나요?</p>
            {rating.ride.kind === 'roundtrip' && <p className="caption" style={{ marginBottom: 6 }}>'안 왔어요'를 고르면 노쇼 수수료 {won(rating.ride.hold_won ?? 0)}가 그 사람에게 부과돼 기사님 손실을 메워요 (시범).</p>}
            {rating.others.map((m) => (
              <div key={m.user_id} className="rate-row">
                <span>{m.nickname}</span>
                <div className="stars">{[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} className={n <= rating.scores[m.user_id] ? 'on' : ''} onClick={() => setRating({ ...rating, scores: { ...rating.scores, [m.user_id]: n } })} aria-label={`${n}점`}>★</button>
                ))}</div>
                <label className="noshow"><input type="checkbox" checked={!!rating.noShow[m.user_id]} onChange={(e) => setRating({ ...rating, noShow: { ...rating.noShow, [m.user_id]: e.target.checked } })} /> 안 왔어요</label>
              </div>
            ))}
            <div className="btn-row">
              <button className="btn gray" onClick={() => setRating(null)}>건너뛰기</button>
              <button className="btn" onClick={submitRating}>평가 남기기</button>
            </div>
          </section>
        )}

        {mine.map((r) => {
          const members = [...r.ride_members].sort((a, b) => a.joined_at.localeCompare(b.joined_at))
          const o = placeFromId(r.spot_id)
          return (
            <section key={r.id} className="card selected mine-card">
              <div className="card-title" style={{ marginBottom: 4 }}>
                <span className="caption strong" style={{ color: 'var(--primary)' }}>{r.kind === 'roundtrip' ? '내 왕복 매칭' : '내 모집'}</span>
                <span className={`tag ${r.status === 'open' ? 'blue' : 'dark'}`}>{r.status === 'open' ? `${members.length}/${r.max_people}명 모집 중` : r.status === 'full' ? '모집 완료' : '도착'}</span>
              </div>
              <p className="trip">{r.spot_name}<span>→</span>{r.dest_name}</p>
              <p className="caption">{hhmm(r.depart_at)} 출발 ({when(r.depart_at)}) · {r.kind === 'roundtrip' ? `할증 없이 약 ${won(price(r, 1).fareDongRate)}` : `1인 약 ${won(price(r, members.length).share)}`}</p>
              <div className="seat-list">
                <p className="fine" style={{ padding: '8px 0 2px' }}>탑승 전 안내 · 좌석</p>
                {members.map((m, i) => <div key={m.user_id} className="seat"><span>{m.nickname}{m.user_id === me ? ' (나)' : ''}{m.user_id === r.host_id ? ' · 모집자' : ''}</span><span>{SEATS[i] ?? '뒷좌석'}</span></div>)}
              </div>
              <p className="seat-note">대표 1명이 택시를 부르고, 요금은 도착 후 나눠요.</p>
              <div className="btn-row">
                {r.host_id === me
                  ? <button className="btn gray" disabled={busy} onClick={() => act(() => setRideStatus(r.id, 'cancelled'), '모집을 취소했어요.')}>모집 취소</button>
                  : <button className="btn gray" disabled={busy} onClick={() => act(() => leaveRide(r.id, me), '모집에서 나왔어요.')}>나가기</button>}
                <button className="btn" onClick={() => arrived(r)}>도착했어요</button>
              </div>
              <div className="capsule-row">
                {[
                  <a key="call" href="kakaot://" className="capsule"><Icon name="taxi" size={16} />택시 부르기</a>,
                  o && <a key="map" className="capsule" href={mapUrl(r.spot_name, o.lat, o.lon)} target="_blank" rel="noreferrer"><Icon name="map" size={16} />만날 곳 지도</a>,
                  <button key="tell" className="capsule" onClick={() => shareTrip(r, profile.nickname)}><Icon name="bell" size={16} />지인에게 알리기</button>,
                  r.status === 'open' && <button key="share" className="capsule" onClick={() => shareRide(r)}><Icon name="share" size={16} />모집 공유</button>,
                ].filter(Boolean)}
              </div>
              <a href="tel:112" className="btn secondary" style={{ marginTop: 10, color: 'var(--danger)', boxShadow: 'inset 0 0 0 1px var(--danger)' }}><Icon name="phone" size={18} />112 긴급 신고</a>
            </section>
          )
        })}

        {banner && (
          <div className="banner" role="status">
            <span className="b-icon"><Icon name={banner.icon} size={20} /></span>
            <div><b>{banner.title}</b><span>{banner.body}</span></div>
          </div>
        )}

        {!to && (
          <>
            <div className="section-head"><h2>어디로 가세요?</h2></div>
            <div className="chips">
              {destChoices(from.zoneId).slice(0, 3).map((d) => (
                <button key={d} className={`chip ${d === dest?.zoneId ? 'on' : ''}`} onClick={() => setToPlace(zonePlace(d))}>
                  {zoneById[d].name}{isReturnRoute(from.zoneId, d) && <i className="dot-mark" aria-label="귀로 매칭 구간" />}
                </button>
              ))}
              <button className="chip" onClick={() => setSheet('to')}><Icon name="search" size={16} />검색</button>
            </div>
          </>
        )}

        {solo && (
          <section className="card fare-card" aria-label="요금 비교">
            <div className="fare-top">
              <span className="km">{from.name.split(' ')[0]} → {dest.name} · {solo.km.toFixed(1)}km</span>
              {ret ? <span className="tag blue">귀로 매칭 구간</span> : solo.surcharged ? <span className="tag dark">할증 구간</span> : null}
            </div>
            <div className="fare-hero">
              <small>{people}명이 나눠 타면 1인</small>
              <div className="big">{wonNum(shared.share)}<em>{wonUnit}</em></div>
              <span className="tag blue save">혼자 탈 때보다 {won(solo.fare - shared.share)} 아낌</span>
            </div>
            <div className="fare-lines">
              <div className="fare-line"><span>혼자 타면{solo.surcharged && <small>35% 할증 포함</small>}</span><b className="strike">{won(solo.fare)}</b></div>
              {ret && <div className="fare-line policy"><span>귀로 할증 면제 시 1인<small>정책 제안</small></span><b>{won(round100(solo.fareDongRate / people))}</b></div>}
            </div>
            <div className="opts" role="group" aria-label="함께 타는 인원">{[2, 3].map((v) => <button key={v} className={`opt ${people === v ? 'on' : ''}`} onClick={() => setPeople(v)}>{v}명이 나눠 타기</button>)}</div>
          </section>
        )}

        {outbound && (
          <section className="card" aria-label="할증 없이 가기">
            <p className="card-title">할증 없이 가기 <small>{dest.name}행</small></p>
            <div className="way">
              <div className="way-head"><b><span className="way-num">1</span>왕복 매칭</b><span className="way-price">{won(solo.fareDongRate)}</span></div>
              <p>{dest.name}에서 시내 갈 손님을 미리 구하면 양쪽 다 할증이 없어요. 합승이 아니라 성별 제한도 없어요. 안 온 쪽이 할증분을 부담해 기사님 손실을 메워요(노쇼).</p>
              {canUse && !rt && <button className="btn" style={{ marginTop: 12 }} onClick={() => setRt({ arrive: Math.max(10, Math.round(solo.km * 2.5)), seats: 1 })}>왕복 매칭 열기</button>}
              {!canUse && <button className="pill secondary" style={{ marginTop: 12 }} onClick={onLogin}>로그인하고 열기</button>}
              {canUse && rt && (
                <div className="subform">
                  <div className="field"><span>{dest.name} 도착 예정</span>
                    <div className="opts">{[rt.arrive, rt.arrive + 15, rt.arrive + 30].map((v) => <button key={v} className={`opt ${rt.arrive === v ? 'on' : ''}`} onClick={() => setRt({ ...rt, arrive: v })}>{new Date(Date.now() + v * 60000).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</button>)}</div>
                  </div>
                  <div className="field"><span>돌아올 때 태울 손님</span>
                    <div className="opts">{[1, 2].map((v) => <button key={v} className={`opt ${rt.seats === v ? 'on' : ''}`} onClick={() => setRt({ ...rt, seats: v })}>{v}명</button>)}</div>
                  </div>
                  <p className="form-msg">노쇼하면 할증분 {won(solo.fare - solo.fareDongRate)}을 안 온 쪽이 부담해요 (시범).</p>
                  <div className="btn-row">
                    <button className="btn gray" onClick={() => setRt(null)}>취소</button>
                    <button className="btn" disabled={busy} onClick={submitRoundtrip}>열기</button>
                  </div>
                </div>
              )}
            </div>
            <div className="way">
              <div className="way-head"><b><span className="way-num">2</span>귀로 연계 결제 <span className="tag">모의</span></b><span className="way-price"><s>{won(solo.fare)}</s>{won(solo.fareDongRate)}</span></div>
              <p>할증 포함 금액으로 가승인한 뒤, 내린 지 30분 안에 그 택시가 귀로 손님을 태우면 할증을 뺀 금액으로 결제해요.</p>
              {chance && (
                <div className="chance" aria-label={`귀로 손님을 만날 가능성 약 ${Math.round(chance.p * 100)}%`}>
                  <span className="meter"><i style={{ width: `${Math.max(4, Math.round(chance.p * 100))}%` }} /></span>
                  <b>가능성 약 {Math.round(chance.p * 100)}%</b>
                </div>
              )}
              {chance && <p className="fine" style={{ marginTop: 6 }}>지금 시간 {dest.name} 시내행 승차(2026.4~9 실측) × 앱 이용 30% 가정</p>}
            </div>
            <div className="way">
              <div className="way-head"><b><span className="way-num">3</span>앱 없이 현장 승차</b><span className="way-price">미터기</span></div>
              <p>앱 없이 타면 미터기 요금 그대로예요.</p>
            </div>
          </section>
        )}

        <div className="section-head"><h2>내 주변 모집</h2><small>{canUse ? `반경 1.5km · ${nearby.length}건` : ''}</small></div>
        <section className="card" style={{ paddingTop: canUse && nearby.length ? 6 : 20 }}>
          {!canUse && (
            <div style={{ textAlign: 'center' }}>
              <p className="caption">{session ? '가입 정보를 먼저 입력해 주세요.' : '로그인하면 모집을 열거나 참여할 수 있어요.'}</p>
              {!session && <button className="pill" style={{ marginTop: 12 }} onClick={onLogin}>로그인 · 체험 계정</button>}
            </div>
          )}
          {canUse && nearby.length === 0 && !form && <p className="caption">주변에 열린 모집이 없어요. 첫 모집을 열어 보세요.</p>}
          {canUse && nearby.map((r) => {
            const joined = r.ride_members.some((m) => m.user_id === me)
            const o = placeFromId(r.spot_id)
            return (
              <div key={r.id} className="ride-item">
                <div className="ri-main">
                  <span className="ri-dest">{r.dest_name}행 {r.kind === 'roundtrip' ? <span className="tag blue">왕복 택시 · 할증 없음</span> : r.dest_zone === dest?.zoneId && <span className="tag">같은 방향</span>}</span>
                  <span className="ri-meta"><a href={mapUrl(r.spot_name, o.lat, o.lon)} target="_blank" rel="noreferrer">{r.spot_name.split(' · ')[0]}</a>에서 · 걸어서 {Math.max(1, Math.round(distM(o, from) / 70))}분<br />{hhmm(r.depart_at)} 출발 · {r.ride_members.length}/{r.max_people}명</span>
                </div>
                {joined ? <span className="tag blue">참여 중</span>
                  : <button className="pill" disabled={busy || r.status !== 'open'} onClick={() => act(() => joinRide(r.id, me, profile.nickname), r.kind === 'roundtrip' ? `참여했어요. ${hhmm(r.depart_at)}에 도착하는 택시를 타면 할증 없이 가요. 안 오면 노쇼 수수료 ${won(r.hold_won ?? 0)}가 부과돼요(시범).` : '참여했어요. 탑승 전 안내를 확인해 주세요.')}>{r.status !== 'open' ? '마감' : '참여'}</button>}
              </div>
            )
          })}
          {canUse && !form && <button className="btn" style={{ marginTop: 14 }} disabled={!dest} onClick={() => setForm({ leave: ktx[0] ? Math.max(5, minutesUntil(ktx[0].time) + 10) : 15, meet: '' })}>{dest ? `${dest.name}행 모집 열기` : '도착지를 골라 주세요'}</button>}
          {canUse && form && (
            <div className="subform">
              <div className="field"><span>언제 출발해요?</span>
                <div className="opts">
                  {LEAVE.map(([v, l]) => <button key={v} type="button" className={`opt ${form.leave === v ? 'on' : ''}`} onClick={() => setForm({ ...form, leave: v })}>{l}</button>)}
                  {ktx.map((t) => { const v = Math.max(5, minutesUntil(t.time) + 10); return <button key={t.no} type="button" className={`opt ${form.leave === v ? 'on' : ''}`} onClick={() => setForm({ ...form, leave: v })}>{t.grade} {t.time} 도착 후</button> })}
                </div>
              </div>
              <label className="field"><span>어디서 만날까요? <small className="hint">선택</small></span>
                <input value={form.meet} maxLength={30} placeholder="예: 택시 승차장, 정문 앞" onChange={(e) => setForm({ ...form, meet: e.target.value })} />
              </label>
              <p className="form-msg">{from.name} → {dest.name} · {people}명 · {profile.gender === 'F' ? '여성' : '남성'} 회원에게만 보여요 (합승은 같은 성별끼리만 가능)</p>
              <div className="btn-row">
                <button className="btn gray" onClick={() => setForm(null)}>취소</button>
                <button className="btn" disabled={busy} onClick={submitNew}>모집 열기</button>
              </div>
            </div>
          )}
        </section>

        <div className="group" style={{ marginTop: 12 }}>
          <button className="cell with-icon" onClick={() => setBusOpen(!busOpen)} aria-expanded={busOpen}>
            <span className="cell-icon gray"><Icon name="bus" size={18} /></span>
            <span className="grow"><b>버스로 가면?</b><small>{nb ? `${nb.route}번 ${nb.min}분 후 도착` : last?.ended ? '오늘 운행 끝' : bus?.ok ? '도착 예정 없음' : bus ? '실시간 정보 없음' : '불러오는 중'}</small></span>
            <span className="chev" style={{ transform: busOpen ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }}><Icon name="chevron" size={18} /></span>
          </button>
          {busOpen && (
            <div style={{ padding: '0 16px 12px' }}>
              <div className="seat-list" style={{ marginTop: 0 }}>
                {bus?.ok && bus.stations.slice(0, 3).map((s) => <div key={s.id} className="seat"><span>{s.name}</span><span>{s.arrivals.slice(0, 2).map((a) => `${a.route}번 ${a.min}분`).join(' · ') || '없음'}</span></div>)}
                {last && <div className="seat"><span>가장 늦은 막차</span><span>{last.latest.route}번 {last.latest.last}</span></div>}
                {trains?.ok && trains.next.slice(0, 3).map((t) => <div key={t.no} className="seat"><span>{t.grade} {t.no} ({t.from})</span><span>{t.time} 도착</span></div>)}
                {!bus?.ok && !last && <div className="seat"><span>실시간 정보를 불러오지 못했어요.</span></div>}
              </div>
            </div>
          )}
        </div>
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

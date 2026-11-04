// 타기: 지금 모집 중인 경로별 칸 → 출발·도착을 고르면 좁혀지고 요금 비교 → 참여 또는 모집 열기
import { useEffect, useState } from 'react'
import Logo from '../components/Logo.jsx'
import Icon from '../components/Icon.jsx'
import RideChat from '../components/RideChat.jsx'
import { store, demoTab } from '../lib/store.js'
import { spots, zoneById, won, placeFromId, isReturnRoute, placeAt, originId, quoteBetween, distM, destChoices } from '../data.js'
import { supabase } from '../lib/supabase.js'
import { sendMessage } from '../lib/chat.js'
import { askNotify } from '../lib/alerts.js'
import { useMyPosition } from '../lib/geo.js'
import { searchPlaces } from '../lib/search.js'
import { useLastBus, lastBusState, useTrains, minutesUntil } from '../lib/live.js'
import { demoRooms, useDemoJoined, useNow, CONDITIONS, CORE_SPOTS } from '../lib/demoRides.js'
import { listAllOpen, myRides, createRide, joinRide, leaveRide, setRideStatus, useRidesLive, recordTrip, tripRecorded, rideError, saveTrip } from '../lib/rides.js'

const SEATS = ['조수석', '뒷좌석 오른쪽', '뒷좌석 왼쪽', '뒷좌석 가운데']
const hhmm = (iso) => new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
const minsLeft = (iso) => Math.round((new Date(iso) - Date.now()) / 60000)
const when = (iso) => { const m = minsLeft(iso); return m > 0 ? `${m}분 후` : m > -15 ? '출발 시간' : '지남' }
const HUE = { osong_stn: 'blue', ochang_lake: 'orange', bus_terminal: 'violet', cbnu: 'pink', downtown: 'green' }
const condsOf = (r) => r.conds ?? r.spot_name.split(' · ')[2]?.split(',').filter(Boolean) ?? []
// 탑승 전 송금을 끝낸 모집 (이 기기에만 저장)
const PAID = 'paid_v1'
const loadPaid = () => { try { return JSON.parse(store.getItem(PAID)) ?? [] } catch { return [] } }
const markPaid = (id) => { try { store.setItem(PAID, JSON.stringify([id, ...loadPaid()].slice(0, 20))) } catch {} }
const WINDOWS = [[0, '전체'], [15, '15분 안'], [30, '30분 안']]
const LEAVE = [[5, '5분 뒤'], [15, '15분 뒤'], [30, '30분 뒤'], [60, '1시간 뒤']]
const SHOW_RETURN = false   // 왕복 매칭은 제휴 이후 단계라 시연 화면에서 뺀다 (true로 켜면 다시 보임)
const round100 = (n) => Math.ceil(n / 100) * 100
const NEAR_M = 1000   // 출발지를 고르면 가볍게 걸어갈 수 있는 거리(약 15분) 안의 모집만 보여 준다
const SIMILAR_M = 3000   // 도착지가 이 거리 안이면 '비슷한 방향'
const OSONG = spots.find((s) => s.id === 'osong_stn')
const fromSpot = (s) => placeAt(s.lat, s.lon, s.name)
const zonePlace = (z) => placeAt(zoneById[z].centroid_lat, zoneById[z].centroid_lon, zoneById[z].name) ?? { lat: zoneById[z].centroid_lat, lon: zoneById[z].centroid_lon, zoneId: z, name: zoneById[z].name }

// 최근 고른 곳 (이 기기에만 저장)
const RECENT = 'recent_places_v1'
const loadRecent = () => { try { return JSON.parse(store.getItem(RECENT)) ?? [] } catch { return [] } }
function saveRecent(p) {
  try { store.setItem(RECENT, JSON.stringify([p, ...loadRecent().filter((x) => x.name !== p.name)].slice(0, 5))) } catch {}
}


// 위치 확인은 앱 안 지도 대신 카카오맵으로 (키 없음, 앱이 없으면 웹 지도로 열림)
const mapUrl = (name, lat, lon) => `https://map.kakao.com/link/map/${encodeURIComponent(name)},${lat},${lon}`

// 모집을 카톡 등으로 공유 (처음 사람이 적을 때 직접 모으기)
function shareRide(r) {
  const text = `[쉐어택] ${r.spot_name.split(' · ')[0]} → ${r.dest_name}, ${hhmm(r.depart_at)} 출발${r.kind === 'roundtrip' ? ' · 왕복 택시라 할증 없음' : ''}. 같이 타요!`
  if (navigator.share) navigator.share({ title: '쉐어택 모집', text, url: location.origin }).catch(() => {})
  else navigator.clipboard?.writeText(`${text} ${location.origin}`)
}

function PlaceSheet({ title, near, onPick, onHere, onClose, gpsState }) {
  const [q, setQ] = useState('')
  const [res, setRes] = useState(null)
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
        <input className="search-input" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="주소·장소 검색" />
        {res === 'error' && <p className="sub" style={{ marginTop: 8 }}>검색이 잠시 안 돼요. 지도에서 골라 주세요.</p>}
        {Array.isArray(res) && res.length === 0 && <p className="sub" style={{ marginTop: 8 }}>청주 안에서 찾지 못했어요.</p>}
        {Array.isArray(res) && res.map((p, i) => (
          <button key={i} className="pick-row" onClick={() => onPick(p)}>
            <Icon name="pin" size={18} /><span><b>{p.name}</b><small>{zoneById[p.zoneId].name}{p.sub ? ` · ${p.sub}` : ''}</small></span>
          </button>
        ))}
        {!res && (
          <>
            {onHere && <button className="pick-row" onClick={onHere}><Icon name="locate" size={18} /><span><b>현재 위치</b><small>{gpsState === 'finding' ? '찾는 중…' : 'GPS'}</small></span></button>}
            {loadRecent().length > 0 && <p className="label" style={{ margin: '14px 0 2px' }}>최근</p>}
            {loadRecent().map((p, i) => (
              <button key={i} className="pick-row" onClick={() => onPick(p)}><Icon name="pin" size={18} /><span><b>{p.name}</b><small>{zoneById[p.zoneId]?.name}</small></span></button>
            ))}
            <p className="label" style={{ margin: '14px 0 4px' }}>핵심 스팟</p>
            <div className="chips wrap">{CORE_SPOTS.map((s) => <button key={s.id} className="chip" onClick={() => onPick(fromSpot(s))}>{s.name}</button>)}</div>
          </>
        )}
      </div>
    </div>
  )
}

// 내 모집 카드: 지금 할 일 하나만 크게 보여 준다
function guideOf(r, stage, isHost, n, paid, share) {
  const hostName = r.ride_members.find((m) => m.user_id === r.host_id)?.nickname ?? '방장'
  const place = r.spot_name.split(' · ')[0]
  if (r.kind === 'roundtrip') {
    if (stage === 'waiting') return ['귀로 손님 대기', `${place} → 시내`]
    if (stage === 'gathered') return isHost ? [`손님 ${n - 1}명 확정`, '출발 가능'] : ['출발 대기', `방장 ${hostName}`]
    if (isHost) return [`${place}으로 출발`, `${hhmm(r.depart_at)} 도착 예정 · 요금은 기사님께`]
    return [`${hhmm(r.depart_at)} ${place} 탑승`, `요금은 기사님께 · 노쇼 ${won(r.hold_won ?? 0)} (시범)`]
  }
  if (r.status === 'done') return ['도착', '내리면 아래 버튼']
  if (stage === 'waiting') return ['동승자 대기', '참여하면 알림']
  if (stage === 'gathered') return isHost ? [`${n}명 모임`, '이 인원으로 출발 가능'] : ['인원 대기', `방장 ${hostName}`]
  if (isHost) return ['1인 금액 받기', `${won(share)}씩 · 받은 뒤 택시 호출`]
  if (!paid) return [`1인 ${won(share)} 송금`, '택시 호출 전 · 방법은 대화로']
  if (r.virtual && !r.taxi) return ['택시 호출 중', `방장 ${hostName}`]
  return ['택시 오는 중', '요금 차이는 내린 뒤 대화로']
}

function MyRide({ r, me, busy, act, arrived, price, leaveDemo }) {
  const members = [...r.ride_members].sort((a, b) => a.joined_at.localeCompare(b.joined_at))
  const n = members.length
  const isHost = r.host_id === me
  const isRound = r.kind === 'roundtrip'
  const meet = placeFromId(r.spot_id)
  const place = r.spot_name.split(' · ')[0]
  const stage = r.status === 'full' || r.status === 'done' ? 'ready' : n >= 2 ? 'gathered' : 'waiting'
  const [paidHere, setPaidHere] = useState(() => loadPaid().includes(r.id))
  const share = price(r, n).share
  const paid = r.virtual ? r.paid : paidHere
  const [title, body] = guideOf(r, stage, isHost, n, paid, share)
  const pay = async () => {
    const text = `${won(share)} 보냈어요`
    if (r.virtual) return r.pay(text)
    await sendMessage(r.id, me, text)
    markPaid(r.id); setPaidHere(true)
  }
  const canArrive = isRound || isHost || r.status === 'done' || (paid && (!r.virtual || r.taxi))
  const quit = isHost
    ? <button className="btn ghost" disabled={busy} onClick={() => (r.virtual ? leaveDemo(r.id) : act(() => setRideStatus(r.id, 'cancelled'), '취소 완료'))}>모집 취소</button>
    : <button className="btn ghost" disabled={busy} onClick={() => (r.virtual ? leaveDemo(r.id) : act(() => leaveRide(r.id, me), '나가기 완료'))}>나가기</button>

  return (
    <section className="card mine">
      <p className="card-title"><span>내 모집 {r.virtual && <span className="tag gray">시연</span>}</span>
        <span className={`tag ${r.status === 'open' ? 'amber' : ''}`}>{r.status === 'open' ? `${n}/${r.max_people}명 모집 중` : r.status === 'full' ? '모집 완료' : '도착'}</span></p>
      <p className="trip-line">{isRound && isHost ? (r.out_from ?? r.dest_name) : place} <span>→</span> {isRound && isHost ? place : r.dest_name}</p>
      <p className="sub">{hhmm(r.depart_at)} {isRound ? '도착 예정' : '출발'} ({when(r.depart_at)}) · {isRound ? `할증 없이 약 ${won(price(r, 1).fareDongRate)}` : n < 2 ? `${r.max_people}명이 모이면 1인 약 ${won(price(r, r.max_people).share)}` : `${n}명 기준 1인 약 ${won(price(r, n).share)}`}</p>
      {r.note && <p className="sub ride-meet">{r.note}</p>}
      {meet && <p className="sub ride-meet">{isRound ? (isHost ? '내리는 곳' : '타는 곳') : '만날 곳'}: <a href={mapUrl(r.spot_name, meet.lat, meet.lon)} target="_blank" rel="noreferrer">{isRound ? place : r.spot_name.split(' · ').slice(0, 2).join(' ')} ›</a></p>}
      {condsOf(r).length > 0 && <div className="cond-chips">{condsOf(r).map((c) => <span key={c}>{c}</span>)}</div>}

      <div className="ride-guide"><b>{title}</b><span>{body}</span></div>

      {stage === 'waiting' && (
        <div className="grid2 ride-actions">{quit}<button className="btn" onClick={() => shareRide(r)}>모집 공유</button></div>
      )}
      {stage === 'gathered' && (
        isHost
          ? <div className="grid2 ride-actions">{quit}<button className="btn" disabled={busy} onClick={() => (r.virtual ? r.close() : act(() => setRideStatus(r.id, 'full'), '마감 완료'))}>이 인원으로 출발</button></div>
          : <div className="ride-actions">{quit}</div>
      )}
      {stage === 'ready' && (
        <>
          {isHost && <a href="kakaot://" className="btn btn-link ride-actions">택시 호출</a>}
          {!isHost && !isRound && !paid && r.status !== 'done' && <div className="grid2 ride-actions">{quit}<button className="btn" onClick={pay}>{won(share)} 송금 완료</button></div>}
          {canArrive && <div className="grid2 ride-actions">{r.status === 'done' || (!isHost && !isRound) ? <span /> : quit}<button className={isHost ? 'btn ghost' : 'btn'} onClick={() => arrived(r)}>도착</button></div>}
        </>
      )}

      <RideChat ride={r} me={me} />

      <div className="detail">
        {members.map((m, i) => (
          <div key={m.user_id} className="seat">
            <span>{m.nickname}{m.user_id === me ? ' (나)' : ''}{m.user_id === r.host_id && !isRound ? ' · 방장' : ''}</span>
            <span>{isRound ? (m.user_id === r.host_id ? `갈 때 ${r.out_from ?? r.dest_name} → ${place}` : `올 때 ${place} → ${r.dest_name}`) : SEATS[i]}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

// 지금 모집 중인 칸: 경로별로 묶고, 시간·인원을 보고 들어간다
function RideBoard({ rooms, from, dest, similar, price, now, onJoin, onRoute, busy, joinLabel }) {
  const [win, setWin] = useState(0)
  const shown = rooms.filter((r) => {
    const o = placeFromId(r.spot_id)
    if (!o) return false
    if (from && distM(o, from) > NEAR_M) return false
    if (dest && !similar(r)) return false
    return !win || new Date(r.depart_at) - now <= win * 60000
  })
  const groups = []
  for (const r of shown) {
    const key = `${r.spot_name.split(' · ')[0]} → ${r.dest_name}`
    const g = groups.find((x) => x.key === key)
    if (g) g.rooms.push(r); else groups.push({ key, rooms: [r] })
  }
  groups.sort((a, b) => b.rooms.length - a.rooms.length)   // 모집이 많은 경로부터 (시간이 지나도 칸 순서가 뒤섞이지 않게)
  return (
    <>
      <div className="board-head">
        <h2 className="sheet-title">모집 중</h2>
        <span className="live-clock"><i />{new Date(now).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
      <div className="seg small board-win">{WINDOWS.map(([v, l]) => <button key={v} className={win === v ? 'on' : ''} onClick={() => setWin(v)}>{l}</button>)}</div>
      {groups.length === 0 && <p className="sub" style={{ margin: '4px 0 12px' }}>{from || dest ? '맞는 모집 없음' : '모집 없음'}</p>}
      {groups.map((g) => {
        const first = g.rooms[0]
        return (
          <section key={g.key} className={`card route-card hue-${HUE[first.spot_id] ?? 'green'}`}>
            <button className="route-head" onClick={() => onRoute(first)}>
              <b>{g.key}</b><small>{price(first, 1)?.surcharged && <span className="tag amber">할증 35%</span>} {first.virtual && <span className="tag gray">시연</span>} {g.rooms.length}건 ›</small>
            </button>
            {g.rooms.map((r) => {
              const o = placeFromId(r.spot_id)
              const n = r.ride_members.length
              const meet = r.spot_name.split(' · ')[1]
              return (
                <div key={r.id} className="room">
                  <div className="room-time"><b>{Math.max(0, Math.round((new Date(r.depart_at) - now) / 60000))}분 뒤</b><small>{hhmm(r.depart_at)}</small></div>
                  <div className="room-main">
                    <div className="room-tags">
                      <span className="room-count">{n}/{r.max_people}명</span>
                      {r.kind === 'roundtrip' && <span className="tag">왕복 · 할증 없음</span>}
                    </div>
                    <span className="room-fare"><s>{won(price(r, 1).fare)}</s> <b>{won(r.kind === 'roundtrip' ? price(r, 1).fareDongRate : price(r, n + 1).share)}</b></span>
                    {r.note && <span className="room-note">{r.note}</span>}
                    {r.kind !== 'roundtrip' && meet && <span className="room-note">{meet}{from && ` · 걸어서 ${Math.max(1, Math.round(distM(o, from) / 70))}분`}</span>}
                    {condsOf(r).length > 0 && <div className="cond-chips"><span>{condsOf(r)[0]}</span></div>}
                  </div>
                  <button className="pill-btn small" disabled={busy || r.status !== 'open'} onClick={() => onJoin(r)}>{r.status !== 'open' ? '마감' : joinLabel}</button>
                </div>
              )
            })}
          </section>
        )
      })}
    </>
  )
}

export default function Ride({ account, route, setRoute, onLogin }) {
  const { session, profile } = account
  const me = session?.user?.id
  const canUse = !!(supabase && session && profile)
  const gps = useMyPosition()

  const { from, to } = route
  const [sheet, setSheet] = useState(null)        // 'from' | 'to'
  const [wantHere, setWantHere] = useState(false)
  const [people, setPeople] = useState(3)
  const [open, setOpen] = useState([])
  const [mine, setMine] = useState([])
  const [form, setForm] = useState(null)
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState(null)   // 참여 전 확인
  const [rt, setRt] = useState(null)              // 왕복 매칭 열기 폼 { arrive: 분 뒤, seats }

  const dest = to
  const setFromPlace = (p) => { setRoute({ from: p, to }); setForm(null); setMsg(null); setSheet(null); if (p.name !== '현재 위치') saveRecent(p) }
  const setToPlace = (p) => { setRoute({ from, to: p }); setForm(null); setSheet(null); saveRecent(p) }
  const swap = () => { if (!from || !to) return; setRoute({ from: to, to: from }); setForm(null) }
  const clearRoute = () => { setRoute({ from: null, to: null }); setForm(null); setMsg(null) }

  const useHere = () => {
    if (!gps.pos) { setWantHere(true); return gps.start() }
    setWantHere(false)
    const p = placeAt(gps.pos.lat, gps.pos.lon, '현재 위치')
    if (!p) return setMsg({ bad: true, text: '지금 위치가 청주 밖이에요. 출발지를 검색해 주세요.' })
    setFromPlace(p)
  }
  useEffect(() => { if (wantHere && gps.pos) useHere() }, [wantHere, gps.pos?.lat])



  // 막차·KTX (열차 시각은 시연 모집 시간에도 쓴다)
  const busSpot = from ? { id: `${from.lat.toFixed(3)},${from.lon.toFixed(3)}`, lat: from.lat, lon: from.lon } : null
  const last = lastBusState(useLastBus(busSpot))
  const trains = useTrains(true)
  const nearOsong = !!from && distM(from, OSONG) < 3000
  const ktx = nearOsong && trains?.ok ? trains.next.filter((t) => minutesUntil(t.time) >= 0 && minutesUntil(t.time) <= 90).slice(0, 3) : []
  const now = useNow()
  const demo = useDemoJoined(me, profile?.nickname ?? '나')

  // 요금 (실제 두 지점 거리)
  const both = !!(from && dest)
  const solo = both ? quoteBetween(from, dest, 1) : null
  const shared = both ? quoteBetween(from, dest, people) : null
  const ret = both && isReturnRoute(from.zoneId, dest.zoneId)
  const outbound = both && solo?.surcharged && isReturnRoute(dest.zoneId, from.zoneId)   // 시내 → 읍·면 (돌아올 때 빈 차가 되는 방향)
  // 모집 카드도 위 요금표와 같은 기준(실제 거리)으로 계산한다
  const price = (r, n) => {
    const o = placeFromId(r.spot_id)
    const start = (o && placeAt(o.lat, o.lon, o.name)) ?? from
    return quoteBetween(start, r.dest_place ?? zonePlace(r.dest_zone), n)
  }

  // 실제 모집 + 시연 모집
  useRidesLive(async () => {
    if (!canUse) return
    const [all, m] = await Promise.all([listAllOpen(), myRides(me)])
    setOpen(all); setMine(m.filter((r) => !tripRecorded(r.id)))   // 내가 이미 도착 처리한 모집은 다시 보이지 않게
  }, [canUse, me])
  const similar = (r) => !!dest && (r.dest_zone === dest.zoneId || distM(zonePlace(r.dest_zone), dest) <= SIMILAR_M)
  const sampleFrom = fromSpot(OSONG), sampleTo = fromSpot(spots.find((s) => s.id === 'bus_terminal'))
  const sample = quoteBetween(sampleFrom, sampleTo, 1), sample2 = quoteBetween(sampleFrom, sampleTo, 2)
  const joinedIds = new Set([...mine, ...demo.rides].map((r) => r.id))
  const rooms = [...open, ...demoRooms(now, trains, profile?.gender)]
    .filter((r) => !joinedIds.has(r.id))
    .sort((a, b) => a.depart_at.localeCompare(b.depart_at))
  const toMine = () => setTimeout(() => document.querySelector('.card.mine')?.scrollIntoView({ block: 'start', behavior: 'smooth' }), 150)
  const askJoin = (r) => { if (!canUse) return onLogin(); setConfirm(r) }
  const joinRoom = async (r) => {
    setConfirm(null)
    const ok = r.kind === 'roundtrip' ? `참여 완료 · ${hhmm(r.depart_at)} 탑승` : '참여 완료'
    if (r.virtual) { demo.join(r); setMsg({ text: ok }) } else await act(() => joinRide(r.id, me, profile.nickname), ok)
    toMine()
  }
  // 칸 제목을 누르면 그 경로로 요금을 본다
  const pickRoute = (r) => {
    const o = placeFromId(r.spot_id)
    setRoute({ from: placeAt(o.lat, o.lon, o.name), to: r.dest_place ?? zonePlace(r.dest_zone) })
    setForm(null)
  }

  const act = async (fn, ok) => {
    askNotify()
    setBusy(true); setMsg(null)
    const { error } = await fn()
    setBusy(false)
    if (error) setMsg({ bad: true, text: rideError(error) }); else if (ok) setMsg({ text: ok })
  }
  const submitNew = () => act(async () => {
    const meet = form.meet.trim()
    // 체험 계정은 혼자서도 시연되도록 가상 동승자가 참여한다
    if (demoTab) {
      demo.host({ spot_id: originId(from), spot_name: `${from.name} · ${meet.slice(0, 30) || '출발지'}`, conds: form.conds ?? [], dest_zone: dest.zoneId, dest_name: dest.name, dest_place: dest, depart_at: new Date(Date.now() + form.leave * 60000).toISOString(), max_people: people, gender: profile.gender })
      setForm(null); toMine()
      return {}
    }
    const r = await createRide({
      host_id: me, spot_id: originId(from), spot_name: [from.name, meet.slice(0, 30) || '출발지', ...(form.conds?.length ? [form.conds.join(',')] : [])].join(' · '),
      dest_zone: dest.zoneId, dest_name: dest.name, depart_at: new Date(Date.now() + form.leave * 60000).toISOString(), max_people: people, gender: profile.gender,
    })
    if (!r.error) setForm(null)
    return r
  }, '모집 완료')

  // 왕복 매칭: 내가 탄 택시가 도착지에 닿는 시각에, 그곳에서 시내로 갈 손님을 미리 구한다 (양쪽 할증 없음)
  const submitRoundtrip = () => act(async () => {
    if (demoTab) {
      demo.host({ kind: 'roundtrip', spot_id: originId(dest), spot_name: `${dest.name} · 왕복 택시 도착`, out_from: from.name, conds: [], dest_zone: from.zoneId, dest_name: from.name, dest_place: from, depart_at: new Date(Date.now() + rt.arrive * 60000).toISOString(), max_people: rt.seats + 1, gender: profile.gender, hold_won: Math.round(solo.fare - solo.fareDongRate) })
      setRt(null); toMine()
      return {}
    }
    const r = await createRide({
      host_id: me, kind: 'roundtrip', spot_id: originId(dest), spot_name: `${dest.name} · 왕복 택시 도착`, out_from: from.name,
      dest_zone: from.zoneId, dest_name: from.name, depart_at: new Date(Date.now() + rt.arrive * 60000).toISOString(),
      max_people: rt.seats + 1, gender: profile.gender, hold_won: Math.round(solo.fare - solo.fareDongRate),
    })
    if (!r.error) setRt(null)
    return r
  }, '왕복 매칭 열림')

  const arrived = async (r) => {
    const n = r.ride_members.length
    const s = price(r, 1)
    // 왕복 매칭은 나눠 내지 않고 각자 할증 없는 요금을 낸다
    const paid = r.kind === 'roundtrip' ? s.fareDongRate : price(r, n).share
    const saving = Math.max(0, s.fare - paid)
    recordTrip({ rideId: r.id, from: r.spot_name, to: r.dest_name, people: n, paid, solo: s.fare, saving, virtual: r.virtual })
    if (r.virtual) demo.leave(r.id)
    else await saveTrip({ ride_id: r.id, user_id: me, spot_id: r.spot_id, dest_name: r.dest_name, people: n, paid, solo: s.fare, saving })
    if (!r.virtual && r.host_id === me && r.status !== 'done') await setRideStatus(r.id, 'done')
    setMine((list) => list.filter((x) => x.id !== r.id))
    setMsg({ text: `${won(saving)} 절약` })
  }

  const banner = last?.ended ? { tone: 'red', title: '버스 운행 끝', body: '' }
    : ktx[0] ? { tone: 'blue', title: `KTX ${ktx[0].time} 도착 · ${minutesUntil(ktx[0].time)}분 후`, body: '' }
    : last?.soon ? { tone: 'amber', title: `막차까지 ${last.left}분`, body: `${last.latest.route}번 ${last.latest.last}` }
    : null

  return (
    <div className="ride">
      <div className="ride-top">
        <div className="ride-brand"><Logo size={26} /></div>
        <div className="route-box">
          <button className="route-row" onClick={() => setSheet('from')}><span className="dot-from" /><span className="sb-text"><b className={from ? '' : 'route-empty'}>{from ? from.name : '출발지'}</b></span></button>
          {both && <button className="swap-btn" onClick={swap} aria-label="출발과 도착 바꾸기">⇅</button>}
          <button className="route-row" onClick={() => setSheet('to')}><span className="dot-to" /><span className="sb-text"><b className={dest ? '' : 'route-empty'}>{dest ? dest.name : '도착지'}</b></span></button>
        </div>
        <div className="top-actions">
          <button className="here-btn" onClick={useHere}><Icon name="locate" size={16} /> {gps.state === 'finding' ? '위치 찾는 중…' : '내 위치에서 출발'}</button>
          {(from || dest) && <button className="here-btn" onClick={clearRoute}>경로 지우기</button>}
        </div>
      </div>

      <div className="sheet">
        <div className="grabber" />
        {gps.state === 'denied' && <p className="form-msg bad">위치 권한이 꺼져 있어요. 출발지를 검색하거나 지도를 눌러 주세요.</p>}
        {msg && <p className={`form-msg ${msg.bad ? 'bad' : ''}`}>{msg.text}</p>}

        {[...mine, ...demo.rides].map((r) => <MyRide key={r.id} r={r} me={me} busy={busy} act={act} arrived={arrived} price={price} leaveDemo={demo.leave} />)}

        {banner && <div className={`banner ${banner.tone}`}><b>{banner.title}</b>{banner.body && <span>{banner.body}</span>}</div>}

        {!from && !dest && mine.length + demo.rides.length === 0 && (
          <section className="card effect">
            <p className="card-title"><span>복합할증 35%, 이렇게 줄여요</span></p>
            <p className="sub effect-route">오송역 → 터미널 {sample.km.toFixed(1)}km</p>
            <div className="effect-row">
              <div className="effect-now"><small>혼자</small><b>{won(sample.fare)}</b><span>할증 포함</span></div>
              <div className="effect-share"><small>2명</small><b>{won(sample2.share)}</b><span>1인</span></div>
              <div className="effect-return"><small>귀로</small><b>{won(sample.fareDongRate)}</b><span>할증 면제 · 다음 단계</span></div>
            </div>
          </section>
        )}

        {from && !to && (
          <>
            <h2 className="sheet-title">도착지</h2>
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
              <div className="fare-row"><span>혼자</span><b className="off">{won(solo.fare)}</b>{solo.surcharged && <small>할증 포함</small>}</div>
              <div className="fare-row main"><span>{people}명 · 1인</span><b>{won(shared.share)}</b><small>{won(solo.fare - shared.share)} 아낌</small></div>
              {ret && <div className="fare-row policy"><span>귀로 면제 · 1인</span><b>{won(round100(solo.fareDongRate / people))}</b><small>정책 제안</small></div>}
            </div>
          </section>
        )}

        {SHOW_RETURN && outbound && (
          <section className="card rt-card">
            <p className="card-title">할증 없이 가기</p>
            <div className="rt-opt">
              <div className="rt-head"><b>왕복 매칭</b><span className="rt-price">{won(solo.fareDongRate)}</span></div>
              <p className="sub">양쪽 할증 없음</p>
              {canUse && !rt && <button className="btn" style={{ marginTop: 8 }} onClick={() => setRt({ arrive: Math.max(10, Math.round(solo.km * 2.5)), seats: 1 })}>왕복 매칭 열기</button>}
              {canUse && rt && (
                <div className="new-ride">
                  <div className="field"><span>{dest.name} 도착 예정</span>
                    <div className="seg wrap">{[rt.arrive, rt.arrive + 15, rt.arrive + 30].map((v) => <button key={v} className={rt.arrive === v ? 'on' : ''} onClick={() => setRt({ ...rt, arrive: v })}>{new Date(Date.now() + v * 60000).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</button>)}</div>
                  </div>
                  <div className="field"><span>돌아올 때 태울 손님</span>
                    <div className="seg">{[1, 2].map((v) => <button key={v} className={rt.seats === v ? 'on' : ''} onClick={() => setRt({ ...rt, seats: v })}>{v}명</button>)}</div>
                  </div>
                  <p className="sub">노쇼하면 할증분 {won(solo.fare - solo.fareDongRate)}을 안 온 쪽이 부담 (시범)</p>
                  <div className="grid2" style={{ marginTop: 10, marginBottom: 0 }}>
                    <button className="btn ghost" onClick={() => setRt(null)}>취소</button>
                    <button className="btn" disabled={busy} onClick={submitRoundtrip}>열기</button>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        <RideBoard rooms={rooms} from={from} dest={dest} similar={similar} price={price} now={now} onJoin={askJoin} onRoute={pickRoute} busy={busy} joinLabel={canUse ? '참여' : '로그인'} />

        <section className="card">
          {!canUse && (
            <div className="empty">
              {session && <p className="sub">가입 정보를 먼저 입력해 주세요.</p>}
              {!session && <button className="btn" style={{ marginTop: 10 }} onClick={onLogin}>시작</button>}
            </div>
          )}
          {canUse && !form && <button className="btn" disabled={!both} onClick={() => setForm({ leave: ktx[0] ? Math.max(5, minutesUntil(ktx[0].time) + 10) : 15, meet: '' })}>{both ? '모집 열기' : '경로 선택 후 모집'}</button>}
          {canUse && form && (
            <div className="new-ride">
              <label className="field"><span>만날 곳</span>
                <input value={form.meet} maxLength={30} placeholder="택시 승차장" onChange={(e) => setForm({ ...form, meet: e.target.value })} />
              </label>
              <div className="field"><span>출발</span>
                <div className="seg wrap">
                  {LEAVE.map(([v, l]) => <button key={v} type="button" className={form.leave === v ? 'on' : ''} onClick={() => setForm({ ...form, leave: v })}>{l}</button>)}
                  {ktx.map((t) => { const v = Math.max(5, minutesUntil(t.time) + 10); return <button key={t.no} type="button" className={form.leave === v ? 'on' : ''} onClick={() => setForm({ ...form, leave: v })}>{t.grade} {t.time} 도착 후</button> })}
                </div>
              </div>
              <div className="field"><span>인원</span>
                <div className="seg">{[2, 3, 4].map((v) => <button key={v} type="button" className={people === v ? 'on' : ''} onClick={() => setPeople(v)}>{v}명</button>)}</div>
              </div>
              <div className="field"><span>조건</span>
                <div className="chips wrap">{CONDITIONS.map((c) => { const on = form.conds?.includes(c); return <button key={c} type="button" className={`chip ${on ? 'on' : ''}`} onClick={() => setForm({ ...form, conds: on ? form.conds.filter((x) => x !== c) : [...(form.conds ?? []), c] })}>{c}</button> })}</div>
              </div>
              <p className="sub">{from.name} → {dest.name} · 1인 약 {won(shared.share)} · 같은 성별만</p>
              <div className="grid2" style={{ marginTop: 10, marginBottom: 0 }}>
                <button className="btn ghost" onClick={() => setForm(null)}>취소</button>
                <button className="btn" disabled={busy} onClick={submitNew}>모집 열기</button>
              </div>
            </div>
          )}
        </section>

      </div>

      {confirm && (
        <div className="modal" onClick={() => setConfirm(null)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="grabber" />
            <h2 className="sheet-title">탑승 확인</h2>
            <p className="trip-line">{confirm.spot_name.split(' · ')[0]} <span>→</span> {confirm.dest_name}</p>
            <p className="sub" style={{ margin: '4px 0 8px' }}>{hhmm(confirm.depart_at)} 출발 · {confirm.ride_members.length + 1}/{confirm.max_people}명 · {confirm.kind === 'roundtrip' ? `할증 없이 약 ${won(price(confirm, 1).fareDongRate)}` : `1인 약 ${won(price(confirm, confirm.ride_members.length + 1).share)}`}</p>
            {condsOf(confirm).length > 0 && <div className="cond-chips" style={{ marginBottom: 10 }}>{condsOf(confirm).map((c) => <span key={c}>{c}</span>)}</div>}
            <ul className="join-rules">
              {confirm.kind === 'roundtrip'
                ? <><li>요금은 기사님께 직접 내요.</li><li>안 오면 노쇼 수수료를 부담해요 (시범).</li></>
                : <><li>택시 호출 전 방장에게 송금</li><li>요금 차이는 내린 뒤 대화로</li><li>지각·만취 시 탑승 거절 가능</li></>}
            </ul>
            <div className="grid2" style={{ marginTop: 12, marginBottom: 0 }}>
              <button className="btn ghost" onClick={() => setConfirm(null)}>취소</button>
              <button className="btn" disabled={busy} onClick={() => joinRoom(confirm)}>탑승</button>
            </div>
          </div>
        </div>
      )}

      {sheet && (
        <PlaceSheet
          title={sheet === 'from' ? '출발지' : '도착지'}
          near={from ?? OSONG} gpsState={gps.state}
          onPick={sheet === 'from' ? setFromPlace : setToPlace}
          onHere={sheet === 'from' ? () => { setSheet(null); useHere() } : null}
          onClose={() => setSheet(null)}
        />
      )}
    </div>
  )
}

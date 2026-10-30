import { useEffect, useMemo, useRef, useState } from 'react'
import MapView, { Marker, Polyline, Tooltip, taxiIcon, spotIcon, dotIcon } from '../components/MapView.jsx'
import { spots, places, zoneById, zoneByName, nearestZone, tripQuote, won, matching } from '../data.js'
import synthetic from '../../data/web/05_matching/synthetic_ride_requests.json'
import { fetchRoute, pointAlong, haversineKm } from '../lib/route.js'
import { supabase } from '../lib/supabase.js'
import { store, DEFAULT_PREFS } from '../lib/store.js'
import { notify, enableNotify, notifyStatus } from '../lib/notify.js'

const tierNum = (t) => (t === '1차 거점' ? 1 : t === '2차 확장' ? 2 : 3)
const spotZone = (s) => zoneByName[s.zone]?.zone_id ?? nearestZone(s.lat, s.lon).zone_id
const NAMES = ['새벽고래', '졸린수달', '푸른여우', '느긋한곰', '바쁜참새', '조용한판다', '부지런한토끼']
const DRIVERS = [
  { name: '김○○ 기사님', plate: '충북 31바 2418', car: '쏘나타 · 흰색', rating: 4.9 },
  { name: '이○○ 기사님', plate: '충북 33아 7051', car: 'K5 · 은색', rating: 4.8 },
  { name: '박○○ 기사님', plate: '충북 32자 1906', car: '아이오닉5 · 노란색', rating: 4.9 },
]
const SEATS = ['조수석', '뒷좌석 오른쪽', '뒷좌석 왼쪽']
const ANIM_MS = 14000   // 시연용: 택시 접근·운행을 14초로 압축

// 스팟 주변 빈 택시 (시뮬레이션)
function nearbyTaxis(center, n, seed) {
  let s = seed
  const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280)
  return Array.from({ length: n }, () => [center[0] + (r() - 0.5) * 0.03, center[1] + (r() - 0.5) * 0.04, r() * 360])
}

export default function Ride({ user }) {
  const prefs = store.get('prefs_v1', DEFAULT_PREFS)
  const [step, setStep] = useState('home')
  const [spot, setSpot] = useState(spots.find((s) => s.id === 'osong_stn'))
  const [dest, setDest] = useState(null)
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState('share')
  const [riders, setRiders] = useState([])
  const [agentStep, setAgentStep] = useState(0)
  const [route, setRoute] = useState(null)
  const [approach, setApproach] = useState(null)
  const [progress, setProgress] = useState(0)
  const [driver] = useState(() => DRIVERS[Math.floor(Math.random() * DRIVERS.length)])
  const [pay, setPay] = useState('card')
  const [stars, setStars] = useState(5)
  const [toast, setToast] = useState('')
  const [tick, setTick] = useState(0)
  const raf = useRef()

  const pickup = [spot.lat, spot.lon]
  const pz = spotZone(spot)
  const party = mode === 'share' ? riders.length + 1 : 1
  const q = dest ? tripQuote(pz, dest.zone, party, route?.km) : null
  const qSolo = dest ? tripQuote(pz, dest.zone, 1, route?.km) : null
  const qShare = dest ? tripQuote(pz, dest.zone, Math.min(prefs.maxParty, 3), route?.km) : null

  // 주변 택시가 조금씩 움직이는 효과
  useEffect(() => { const t = setInterval(() => setTick((x) => x + 1), 2000); return () => clearInterval(t) }, [])
  const taxis = useMemo(() => nearbyTaxis(pickup, 9, Math.floor(spot.lat * 1e4) + tick), [spot.id, tick])

  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(''), 2500); return () => clearTimeout(t) } }, [toast])

  const results = useMemo(() => {
    const k = query.trim()
    const list = k ? places.filter((p) => p.name.includes(k) || p.sub.includes(k)) : places.filter((p) => p.id.startsWith('spot:'))
    return list.filter((p) => p.id !== `spot:${spot.id}`).slice(0, 12)
  }, [query, spot.id])

  const chooseDest = async (p) => {
    setDest(p); setStep('options'); setRoute(null)
    setRoute(await fetchRoute(pickup, [p.lat, p.lon]))
  }

  // 매칭 에이전트: 같은 스팟 출발 · 동성 · 목적지 3km 이내 승객을 찾는다
  const startMatching = async () => {
    if (notifyStatus() === 'default') await enableNotify()
    setStep('matching'); setAgentStep(0); setRiders([])
    let pool = synthetic
    if (supabase) {
      const { data } = await supabase.from('ride_requests').select('*').eq('origin_zone', pz).eq('status', 'waiting').limit(200)
      if (data?.length) pool = data
      await supabase.from('ride_requests').insert({
        nickname: user.name, gender: prefs.gender, age_group: '20s', origin_zone: pz, origin_name: spot.name,
        origin_lon: spot.lon, origin_lat: spot.lat, dest_zone: dest.zone, dest_name: dest.name, dest_lon: dest.lon, dest_lat: dest.lat,
        depart_at: new Date().toISOString(), seats: 1, same_gender_only: prefs.sameGender, category: q.category, status: 'waiting', is_synthetic: false,
      })
    }
    const found = pool.filter((r) => r.origin_zone === pz && (!prefs.sameGender || r.gender === prefs.gender) &&
      haversineKm([r.dest_lat, r.dest_lon], [dest.lat, dest.lon]) <= 3).slice(0, prefs.maxParty - 1)
    // 실데이터가 부족하면 같은 조건의 시뮬레이션 동승자로 채운다 (화면에 표시)
    const need = Math.max(0, Math.min(prefs.maxParty - 1, 2) - found.length)
    const sim = Array.from({ length: need }, (_, i) => ({ nickname: NAMES[(i + tick) % NAMES.length] + (21 + i * 7), gender: prefs.gender, dest_name: dest.name, sim: true, rating: 4.7 + i * 0.1 }))
    const list = [...found.map((r) => ({ ...r, rating: 4.8 })), ...sim]
    for (let i = 1; i <= 4; i++) { await new Promise((r) => setTimeout(r, 700)); setAgentStep(i) }
    setRiders(list); setAgentStep(5)
    notify('같이타 · 동승자를 찾았어요', `${spot.name} → ${dest.name} · ${list.length + 1}명 · 1인 약 ${won(tripQuote(pz, dest.zone, list.length + 1, route?.km).share)}`)
  }

  const dispatch = async () => {
    setStep('dispatch'); setProgress(0)
    const start = [spot.lat + 0.012, spot.lon - 0.015]
    const a = await fetchRoute(start, pickup)
    setApproach(a)
    notify('같이타 · 택시가 배정됐어요', `${driver.plate} · 약 ${Math.round(a.min)}분 후 ${spot.name} 도착`)
    animate(() => { setStep('arrived'); notify('같이타 · 택시가 도착했어요', `${driver.plate} ${driver.car} · ${spot.name}에서 탑승하세요`) })
  }

  const ride = () => { setStep('riding'); setProgress(0); animate(() => setStep('pay')) }

  const animate = (done) => {
    cancelAnimationFrame(raf.current)
    const t0 = performance.now()
    const loop = (t) => {
      const p = Math.min(1, (t - t0) / ANIM_MS)
      setProgress(p)
      if (p < 1) raf.current = requestAnimationFrame(loop); else done()
    }
    raf.current = requestAnimationFrame(loop)
  }
  useEffect(() => () => cancelAnimationFrame(raf.current), [])

  const finish = async () => {
    const rec = { at: new Date().toISOString(), from: spot.name, to: dest.name, people: party, paid: q.share, solo: qSolo.fare, saving: qSolo.fare - q.share, pay }
    store.set('history_v1', [rec, ...store.get('history_v1', [])].slice(0, 30))
    if (supabase) await supabase.from('matches').insert({ request_ids: [], total_fare: q.fare, shares: Array(party).fill(q.share), saving_vs_solo: qSolo.fare - q.share })
    setStep('done')
  }

  const reset = () => { setStep('home'); setDest(null); setRiders([]); setRoute(null); setApproach(null); setProgress(0); setQuery('') }

  const myTaxi = step === 'dispatch' && approach ? pointAlong(approach.points, progress)
    : step === 'arrived' ? { pos: pickup, heading: 0 }
    : step === 'riding' && route ? pointAlong(route.points, progress) : null
  const etaMin = step === 'dispatch' && approach ? Math.max(1, Math.ceil(approach.min * (1 - progress))) : null
  const bounds = route && ['options', 'riding', 'pay', 'done'].includes(step) ? [pickup, [dest.lat, dest.lon]]
    : approach && step === 'dispatch' ? [approach.points[0], pickup] : null

  return (
    <>
      <MapView center={pickup} zoom={14} bounds={bounds}>
        {spots.map((s) => (
          <Marker key={s.id} position={[s.lat, s.lon]} icon={spotIcon(tierNum(s.tier), s.name)} eventHandlers={{ click: () => step === 'home' && setSpot(s) }} />
        ))}
        {['home', 'search', 'options', 'matching'].includes(step) && taxis.map(([la, lo, h], i) => (
          <Marker key={i} position={[la, lo]} icon={taxiIcon(h)} />
        ))}
        {route && ['options', 'matching', 'notice', 'riding', 'pay', 'done'].includes(step) && <Polyline positions={route.points} pathOptions={{ color: '#16181d', weight: 5 }} />}
        {approach && step === 'dispatch' && <Polyline positions={approach.points} pathOptions={{ color: '#ffcd00', weight: 6, dashArray: '8 8' }} />}
        <Marker position={pickup} icon={dotIcon('from')}><Tooltip permanent direction="top" offset={[0, -8]}>탑승 스팟</Tooltip></Marker>
        {dest && <Marker position={[dest.lat, dest.lon]} icon={dotIcon('to')} />}
        {myTaxi && <Marker position={myTaxi.pos} icon={taxiIcon(0, true)} />}
      </MapView>

      <div className="top-float">
        <div className="brand-chip">🚕 같이타</div>
        <span className="pill">{user.name}님</span>
        <span className="pill dark" style={{ marginLeft: 'auto' }}>{spot.tier}</span>
      </div>
      {toast && <div className="toast">{toast}</div>}

      {step === 'home' && (
        <div className="sheet">
          <h2>어디로 갈까요?</h2>
          <p className="sub">탑승 스팟에서 같은 방향 손님과 묶어 드려요</p>
          <div className="chips">
            {[...spots].sort((a, b) => a.rank - b.rank).map((s) => (
              <button key={s.id} className={`chip ${s.id === spot.id ? 'on' : ''}`} onClick={() => setSpot(s)}>📍 {s.name}</button>
            ))}
          </div>
          <div className="route-box">
            <div className="route-row"><span className="mk from" />{spot.name}<small>{spot.zone}</small></div>
          </div>
          <button className="search" onClick={() => setStep('search')}>🔍 도착지를 검색하세요</button>
          <p className="note">지금 {spot.name} 스팟 · 하루 택시 승차 {spot.pickups_per_day.toLocaleString()}건 중 할증 구간 약 {spot.surcharge_trips_per_day.toLocaleString()}건 (2025 TIMS)</p>
        </div>
      )}

      {step === 'search' && (
        <div className="sheet" style={{ maxHeight: '85%' }}>
          <div className="search"><span>🔍</span><input autoFocus placeholder="동·읍·면, 스팟 이름" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
          <ul className="list">
            {results.map((p) => (
              <li key={p.id} onClick={() => chooseDest(p)}>
                <span className="ic">{p.id.startsWith('spot:') ? '📍' : '🏘️'}</span>
                <div><div className="tt">{p.name}</div><div className="ss">{p.sub}</div></div>
              </li>
            ))}
          </ul>
          <button className="cta ghost" onClick={() => setStep('home')}>닫기</button>
        </div>
      )}

      {step === 'options' && dest && qSolo && (
        <div className="sheet">
          <div className="route-box">
            <div className="route-row"><span className="mk from" />{spot.name}</div>
            <div className="route-row"><span className="mk to" />{dest.name}<small>{(route?.km ?? qSolo.km).toFixed(1)}km · 약 {Math.round(route?.min ?? qSolo.km * 2.5)}분</small></div>
          </div>
          {qSolo.surcharged && <p className="note" style={{ margin: '0 0 10px' }}><span className="badge red">복합할증 35%</span> 이 구간은 혼자 타면 할증 {won(qSolo.surchargeWon)}이 붙어요</p>}
          <button className={`option ${mode === 'share' ? 'on' : ''}`} onClick={() => setMode('share')}>
            <span className="ic">👥</span>
            <div><div className="nm">같이타기 <span className="badge">추천</span></div><div className="ds">같은 스팟 · {prefs.sameGender ? '동성' : '성별 무관'} · 최대 {prefs.maxParty}명 · {prefs.maxWaitMin}분 내 매칭</div></div>
            <div className="pr"><b>{won(qShare.share)}~</b><s>{won(qSolo.fare)}</s></div>
          </button>
          <button className={`option ${mode === 'solo' ? 'on' : ''}`} onClick={() => setMode('solo')}>
            <span className="ic">🚕</span>
            <div><div className="nm">혼자타기</div><div className="ds">바로 배차 · 일반 요금</div></div>
            <div className="pr"><b>{won(qSolo.fare)}</b></div>
          </button>
          {qSolo.surcharged && mode === 'share' && qShare.share < qSolo.fareDongRate && (
            <p className="note" style={{ margin: '0 0 10px' }}>✅ 같이 타면 <b>할증이 아예 없는 혼자 요금({won(qSolo.fareDongRate)})보다 {won(qSolo.fareDongRate - qShare.share)} 싸요</b></p>
          )}
          <div className="row-btns">
            <button className="cta ghost" onClick={reset}>취소</button>
            <button className="cta" onClick={() => (mode === 'share' ? startMatching() : dispatch())}>{mode === 'share' ? '같이타기 호출' : '호출하기'}</button>
          </div>
        </div>
      )}

      {step === 'matching' && (
        <div className="sheet agent">
          <div className="radar">🚕</div>
          <h2>{agentStep < 5 ? '매칭 에이전트가 동승자를 찾고 있어요' : riders.length ? `동승자 ${riders.length}명을 찾았어요` : '아직 동승자가 없어요'}</h2>
          <div className="agent-steps">
            {[`${spot.name} 스팟 대기 승객 탐색`, `${prefs.sameGender ? '동성 · ' : ''}본인인증 · 평점 ${prefs.minRating}+ 필터`, '목적지 3km 이내 · 우회 15분 이하', '귀로(빈 차 복귀) 택시 우선 배정'].map((t, i) => (
              <div key={t} className={agentStep > i ? 'ok' : ''}>{agentStep > i ? '✅' : '⏳'} {t}</div>
            ))}
          </div>
          {agentStep >= 5 && (
            <>
              <div className="riders">
                <span className="rider">🙋 나</span>
                {riders.map((r, i) => <span key={i} className="rider">👤 {r.nickname} ⭐{(r.rating ?? 4.8).toFixed(1)} {r.sim && <span className="badge gray">시뮬</span>}</span>)}
              </div>
              <p className="note">1인 예상 {won(q.share)} · 혼자보다 {won(qSolo.fare - q.share)} 절약</p>
              <div className="row-btns">
                <button className="cta ghost" onClick={reset}>취소</button>
                <button className="cta" onClick={() => setStep('notice')}>동승 확인</button>
              </div>
            </>
          )}
        </div>
      )}

      {step === 'notice' && (
        <div className="sheet">
          <h2>탑승 전 안내</h2>
          <p className="sub">법령에 따라 동승자의 탑승 위치·시각과 좌석을 미리 알려 드려요</p>
          {[{ nickname: `${user.name} (나)` }, ...riders].map((r, i) => (
            <div key={i} className="kv"><span>{r.nickname}</span><b>{SEATS[i]} · {spot.name} 탑승</b></div>
          ))}
          <div className="kv"><span>하차</span><b>{dest.name} (목적지 3km 이내 순차 하차)</b></div>
          <div className="kv"><span>요금</span><b>미터 요금을 단독요금 비례로 분담</b></div>
          <p className="note">기사님이 임의로 다른 승객을 태우는 합승은 불법이에요. 같이타 동승자는 모두 앱에서 직접 신청한 분들입니다.</p>
          <button className="cta" onClick={dispatch}>확인하고 택시 부르기</button>
        </div>
      )}

      {(step === 'dispatch' || step === 'arrived') && (
        <div className="sheet">
          <div className="driver-card">
            <div className="av">🧑‍✈️</div>
            <div style={{ flex: 1 }}>
              <div className="plate">{driver.plate}</div>
              <div className="note" style={{ margin: 0 }}>{driver.car} · {driver.name} ⭐{driver.rating}</div>
              <span className="badge green">귀로 택시 · 빈 차 복귀 대신 영업 중</span>
            </div>
            <div style={{ textAlign: 'right' }}>
              {step === 'dispatch' ? <><div className="eta">{etaMin ?? '-'}분</div><div className="note" style={{ margin: 0 }}>도착 예정</div></> : <div className="eta">도착</div>}
            </div>
          </div>
          <div className="safety">
            <a className="sos" href="tel:112">🚨 112</a>
            <button onClick={async () => { try { await navigator.share?.({ title: '같이타 안심귀가', text: `${driver.plate} 탑승 · ${spot.name}→${dest?.name ?? ''}` }) } catch { /* 공유 취소 */ } setToast('안심 공유를 보냈어요') }}>📍 안심공유</button>
            <button onClick={() => setToast('신고가 접수됐어요. 해당 사용자는 다시 매칭되지 않아요')}>🚫 신고</button>
          </div>
          {step === 'arrived' && <button className="cta" onClick={ride}>탑승했어요</button>}
          {step === 'dispatch' && <p className="note">{approach?.road ? '실제 도로 경로' : '예상 경로'}로 이동 중 · 시연을 위해 시간을 압축했어요</p>}
        </div>
      )}

      {step === 'riding' && (
        <div className="sheet">
          <h2>{dest.name}(으)로 가는 중</h2>
          <p className="sub">{party}명 탑승 · 남은 거리 {((route?.km ?? q.km) * (1 - progress)).toFixed(1)}km</p>
          <div className="safety">
            <a className="sos" href="tel:112">🚨 112</a>
            <button onClick={() => setToast('안심 공유를 보냈어요')}>📍 안심공유</button>
          </div>
        </div>
      )}

      {step === 'pay' && (
        <div className="sheet">
          <div className="paybox">
            <div style={{ fontSize: 13, opacity: .8 }}>내 분담 금액 ({party}명 n분의 1)</div>
            <div className="big">{won(q.share)}</div>
            <div style={{ fontSize: 12, opacity: .8 }}>미터 요금 {won(q.fare)} · 혼자였다면 {won(qSolo.fare)}</div>
          </div>
          <div className="paymethods">
            {[['card', '💳 카드'], ['toss', '토스페이'], ['kakao', '카카오페이']].map(([id, l]) => (
              <button key={id} className={pay === id ? 'on' : ''} onClick={() => setPay(id)}>{l}</button>
            ))}
          </div>
          <p className="note">테스트 결제입니다. 실제 금액은 청구되지 않아요.</p>
          <button className="cta" onClick={finish}>{won(q.share)} 결제하기</button>
        </div>
      )}

      {step === 'done' && (
        <div className="sheet" style={{ textAlign: 'center' }}>
          <h2>도착했어요 🎉</h2>
          <p className="sub">같이 타서 <b style={{ color: 'var(--green)' }}>{won(qSolo.fare - q.share)}</b> 아꼈어요{qSolo.surcharged ? ` · 할증 ${won(qSolo.surchargeWon)}을 ${party}명이 나눴어요` : ''}</p>
          <div className="stars">{[1, 2, 3, 4, 5].map((n) => <span key={n} className={n <= stars ? 'on' : ''} onClick={() => setStars(n)}>★</span>)}</div>
          <p className="note">기사님과 동승자 평가는 다음 매칭의 신뢰 점수에 반영돼요</p>
          <button className="cta" onClick={() => { setToast('평가를 남겼어요'); reset() }}>완료</button>
        </div>
      )}
    </>
  )
}

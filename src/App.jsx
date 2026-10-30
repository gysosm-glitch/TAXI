import { useEffect, useMemo, useState } from 'react'
import fareRules from '../data/web/02_fare_rules/fare_rules.json'
import zoneList from '../data/web/01_zones/zones.json'
import scenarios from '../data/web/04_scenarios/scenarios.json'
import pairs from '../data/web/03_demand/taxi_od_pairs.min.json'
import policy from '../data/web/06_policy/policy_params.json'
import matching from '../data/web/05_matching/matching_rules.json'
import sources from '../data/web/07_sources/sources.json'
import synthetic from '../data/web/05_matching/synthetic_ride_requests.json'
import legal from '../data/web/09_compliance/legal_requirements.json'
import { CATEGORY_LABEL, haversineM, quote, splitFare } from './lib/fare.js'
import { simulateDay, simulateHour } from './lib/simulate.js'
import { supabase } from './lib/supabase.js'

const rules = fareRules.regions.cheongju
const zones = [...zoneList].sort((a, b) => a.name.localeCompare(b.name, 'ko'))
const zoneById = Object.fromEntries(zones.map((z) => [z.zone_id, z]))
const won = (n) => `${Math.round(n).toLocaleString('ko-KR')}원`
const eok = (n) => `${(n / 1e8).toFixed(1)}억 원`
const pct = (r) => `${(r * 100).toFixed(1)}%`

// 브라우저 저장소는 동의·차단 목록 같은 개인 편의용으로만 사용 (사생활 모드에서 실패해도 앱은 동작)
const store = {
  get(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* 저장 불가 환경 */ }
  },
  clear() {
    try { ['consent_v1', 'blocked_v1'].forEach((k) => localStorage.removeItem(k)) } catch { /* 저장 불가 환경 */ }
  },
}

const TABS = [
  ['fare', '요금'],
  ['match', '합승'],
  ['sim', '시뮬레이션'],
  ['policy', '정책'],
  ['legal', '법·안전'],
  ['about', '출처'],
]

export default function App() {
  const [tab, setTab] = useState('fare')
  const [consent, setConsent] = useState(() => store.get('consent_v1', null))

  if (!consent) {
    return <Onboarding onDone={(c) => { store.set('consent_v1', c); setConsent(c) }} />
  }
  return (
    <div className="app">
      <header>
        <h1>청주 택시 합승 · 할증 계산기</h1>
        <p className="sub">남은 35% 복합할증, 2~3명이 함께 타면 부담이 사라집니다.</p>
      </header>
      <nav className="tabs">
        {TABS.map(([id, label]) => (
          <button key={id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>{label}</button>
        ))}
      </nav>
      <main>
        {tab === 'fare' && <FareTab />}
        {tab === 'match' && <MatchTab />}
        {tab === 'sim' && <SimTab />}
        {tab === 'policy' && <PolicyTab />}
        {tab === 'legal' && <LegalTab onWithdraw={() => { store.clear(); setConsent(null) }} />}
        {tab === 'about' && <AboutTab />}
      </main>
      <footer className="notice">{matching.legal_notice}</footer>
    </div>
  )
}

const CONSENTS = [
  { id: 'terms', label: '서비스 이용약관 동의', required: true,
    detail: '본 서비스는 등록 플랫폼을 통한 합승을 가정한 시뮬레이션입니다. 요금은 미터기(시 고시 요율)로만 부과되며, 앱은 분담 금액을 안내만 합니다.' },
  { id: 'privacy', label: '개인정보 수집·이용 동의', required: true,
    detail: '항목: 닉네임, 성별, 출발·도착 읍면동, 출발 시각 / 목적: 합승 매칭과 안전 고지 / 보유기간: 운행 종료 후 30일 (데모 데이터는 발표 후 일괄 삭제) / 동의를 거부할 수 있으나, 거부 시 매칭을 이용할 수 없습니다.' },
  { id: 'location', label: '위치정보 이용 동의', required: true,
    detail: '출발·도착 위치는 읍면동 단위로만 사용하며, 실시간 GPS 궤적은 저장하지 않습니다. 법·안전 탭에서 언제든 동의를 철회하고 데이터를 삭제할 수 있습니다.' },
  { id: 'age14', label: '만 14세 이상입니다', required: true,
    detail: '만 14세 미만은 법정대리인 동의가 필요하여 가입할 수 없습니다.' },
  { id: 'marketing', label: '이벤트·혜택 알림 수신', required: false, detail: '동의하지 않아도 서비스 이용에 제한이 없습니다.' },
]

function Onboarding({ onDone }) {
  const [step, setStep] = useState(0)
  const [checked, setChecked] = useState({})
  const [open, setOpen] = useState(null)
  const allRequired = CONSENTS.filter((c) => c.required).every((c) => checked[c.id])

  return (
    <div className="app">
      <header>
        <h1>청주 택시 합승</h1>
        <p className="sub">복합할증 구간, 같이 타면 할증 없는 요금보다 싸집니다.</p>
      </header>
      <Hero />
      {step === 0 && (
        <div className="card">
          <h3>약관 및 동의</h3>
          <label className="consent all">
            <input type="checkbox" checked={CONSENTS.every((c) => checked[c.id])}
              onChange={(e) => setChecked(Object.fromEntries(CONSENTS.map((c) => [c.id, e.target.checked])))} />
            <b>전체 동의</b>
          </label>
          {CONSENTS.map((c) => (
            <div key={c.id} className="consent-row">
              <div className="consent-line">
                <label className="consent">
                  <input type="checkbox" checked={!!checked[c.id]} onChange={(e) => setChecked({ ...checked, [c.id]: e.target.checked })} />
                  {c.required ? <span className="req">[필수]</span> : <span className="opt">[선택]</span>} {c.label}
                </label>
                <button type="button" className="link" onClick={() => setOpen(open === c.id ? null : c.id)}>보기</button>
              </div>
              {open === c.id && <p className="hint">{c.detail}</p>}
            </div>
          ))}
          <button className="primary" disabled={!allRequired} onClick={() => setStep(1)}>다음</button>
        </div>
      )}
      {step === 1 && (
        <div className="card">
          <h3>본인확인</h3>
          <p className="hint">택시 합승은 법령상 <b>본인확인을 거친 승객끼리만</b> 가능합니다. 실제 서비스에서는 휴대폰 본인인증(PASS 등)을 연동합니다.</p>
          <p className="hint"><span className="tag">데모</span> 이 데모는 실제 인증을 하지 않으며, 전화번호를 수집하지 않습니다.</p>
          <button className="primary" onClick={() => onDone({ ...checked, verified: true, at: new Date().toISOString() })}>
            본인확인 완료 (데모)
          </button>
        </div>
      )}
      <footer className="notice">{matching.legal_notice}</footer>
    </div>
  )
}

// 첫 화면 핵심 메시지: 할증 구간도 2~3명이면 할증 없는 단독요금보다 싸다
function Hero() {
  const s = scenarios.find((x) => x.id === 'cbnu_to_osong')
  const q = quote({ origin: zoneById[s.origin.zone], dest: zoneById[s.dest.zone], distanceM: estKm(s.origin.zone, s.dest.zone) * 1000, rules })
  const [two, three] = [2, 3].map((n) => splitFare(q.fare, Array(n).fill(1))[0])
  return (
    <div className="card hero">
      <div className="hero-title">{s.origin.name} → {s.dest.name}</div>
      <div className="hero-grid">
        <div><span>혼자 (할증)</span><b className="red">{won(q.fare)}</b></div>
        <div><span>할증 없다면</span><b>{won(q.fareDongRate)}</b></div>
        <div><span>2명 1인</span><b className="green">{won(two)}</b></div>
        <div><span>3명 1인</span><b className="green">{won(three)}</b></div>
      </div>
      <p className="hint">2명만 타도 할증이 아예 없는 혼자 요금보다 <b>{won(q.fareDongRate - two)}</b> 싸요. 거리는 추정치입니다.</p>
    </div>
  )
}

function ZoneSelect({ value, onChange, label }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(Number(e.target.value))}>
        {zones.map((z) => (
          <option key={z.zone_id} value={z.zone_id}>{z.name} ({z.type_ko})</option>
        ))}
      </select>
    </label>
  )
}

function estKm(o, d) {
  const pair = pairs.find((p) => p.o === o && p.d === d)
  return pair ? pair.km : 5
}

function FareTab() {
  const [o, setO] = useState(130)
  const [d, setD] = useState(131)
  const [km, setKm] = useState(estKm(130, 131))
  const [people, setPeople] = useState(2)

  const pick = (s) => {
    setO(s.origin.zone); setD(s.dest.zone); setKm(s.distance_km_estimated)
  }
  const changeZone = (setter, other, isOrigin) => (v) => {
    setter(v); setKm(isOrigin ? estKm(v, other) : estKm(other, v))
  }
  const q = quote({ origin: zoneById[o], dest: zoneById[d], distanceM: km * 1000, rules })
  const share = splitFare(q.fare, Array(people).fill(1))[0]

  return (
    <section>
      <Hero />
      <div className="chips">
        {scenarios.map((s) => (
          <button key={s.id} className="chip" onClick={() => pick(s)}>{s.origin.name} → {s.dest.name}</button>
        ))}
      </div>
      <div className="card">
        <ZoneSelect label="출발" value={o} onChange={changeZone(setO, d, true)} />
        <ZoneSelect label="도착" value={d} onChange={changeZone(setD, o, false)} />
        <label className="field">
          <span>거리 {km.toFixed(1)}km <em>(추정치, 지도 API로 교체 예정)</em></span>
          <input type="range" min="1" max="40" step="0.1" value={km} onChange={(e) => setKm(Number(e.target.value))} />
        </label>
      </div>

      <div className={`card result ${q.surcharged ? 'warn' : 'ok'}`}>
        <div className="badge">{CATEGORY_LABEL[q.category]}</div>
        <div className="big">{won(q.fare)}</div>
        <div className="row"><span>할증 없는 동 요율이라면</span><b>{won(q.fareDongRate)}</b></div>
        <div className="row"><span>할증으로 더 내는 돈</span><b className="red">{won(q.surchargeWon)}</b></div>
      </div>

      <div className="card">
        <label className="field">
          <span>함께 타는 인원: {people}명</span>
          <input type="range" min="1" max="4" value={people} onChange={(e) => setPeople(Number(e.target.value))} />
        </label>
        <div className="row"><span>1인 부담</span><b className="big2">{won(share)}</b></div>
        <div className="row"><span>합승으로 아낀 돈 (1인)</span><b className="green">{won(q.fare - share)}</b></div>
        {q.surcharged && share < q.fareDongRate && (
          <p className="hint">✅ {people}명이 타면 할증 구간이어도 1인 부담이 <b>할증 없는 단독요금보다 낮아요</b>.</p>
        )}
      </div>
    </section>
  )
}

function minutesApart(a, b) {
  return Math.abs(new Date(a) - new Date(b)) / 60000
}

const SEATS = ['조수석', '뒷좌석 왼쪽', '뒷좌석 오른쪽', '뒷좌석 가운데']

function MatchTab() {
  const [requests, setRequests] = useState(synthetic)
  const [source, setSource] = useState('local')
  const [form, setForm] = useState({ nickname: '', gender: 'F', vehicle: 'mid', anyGender: false, origin: 130, dest: 131, time: '2026-11-10T23:10' })
  const [mine, setMine] = useState(null)
  const [blocked, setBlocked] = useState(() => store.get('blocked_v1', []))
  const [confirmed, setConfirmed] = useState(false)
  const [shareMsg, setShareMsg] = useState('')

  useEffect(() => {
    if (!supabase) return
    let channel
    supabase.from('ride_requests').select('*').order('depart_at').limit(500).then(({ data, error }) => {
      if (error || !data) return
      setRequests(data); setSource('supabase')
      channel = supabase.channel('ride_requests')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ride_requests' },
          (p) => setRequests((rs) => [...rs, p.new]))
        .subscribe()
    })
    return () => { if (channel) supabase.removeChannel(channel) }
  }, [])

  // 경·소·중형택시는 동성 합승만 허용 → 대형(승합)을 고를 때만 성별 무관 선택 가능
  const sameGenderOnly = form.vehicle === 'mid' || !form.anyGender

  const submit = async (e) => {
    e.preventDefault()
    const oz = zoneById[form.origin], dz = zoneById[form.dest]
    const row = {
      nickname: form.nickname || '익명', gender: form.gender, age_group: '20s',
      origin_zone: oz.zone_id, origin_name: oz.name, origin_lon: oz.centroid_lon, origin_lat: oz.centroid_lat,
      dest_zone: dz.zone_id, dest_name: dz.name, dest_lon: dz.centroid_lon, dest_lat: dz.centroid_lat,
      depart_at: `${form.time}:00+09:00`, seats: 1, same_gender_only: sameGenderOnly,
      category: quote({ origin: oz, dest: dz, distanceM: 1000, rules }).category,
      status: 'waiting', is_synthetic: false,
    }
    if (supabase) await supabase.from('ride_requests').insert(row)
    setMine(row); setConfirmed(false)
  }

  // 데모 매칭 규칙: 존 중심 기준이라 반경을 matching_rules보다 넓게(1.5km) 적용
  const RADIUS_M = 1500
  const candidates = useMemo(() => {
    if (!mine) return []
    return requests.filter((r) =>
      r.status === 'waiting' && r.nickname !== mine.nickname && !blocked.includes(r.nickname) &&
      (!mine.same_gender_only || r.gender === mine.gender) &&
      minutesApart(r.depart_at, mine.depart_at) <= matching.depart_window_min &&
      haversineM(r.origin_lon, r.origin_lat, mine.origin_lon, mine.origin_lat) <= RADIUS_M &&
      haversineM(r.dest_lon, r.dest_lat, mine.dest_lon, mine.dest_lat) <= RADIUS_M,
    ).slice(0, matching.max_party_size - 1)
  }, [mine, requests, blocked])

  const myQuote = mine && quote({
    origin: zoneById[mine.origin_zone], dest: zoneById[mine.dest_zone],
    distanceM: estKm(mine.origin_zone, mine.dest_zone) * 1000, rules,
  })
  const party = mine ? [mine, ...candidates] : []
  const share = myQuote && candidates.length > 0 ? splitFare(myQuote.fare, Array(party.length).fill(1))[0] : null

  const block = (nickname) => {
    const next = [...blocked, nickname]
    setBlocked(next); store.set('blocked_v1', next); setConfirmed(false)
  }

  const shareLocation = async () => {
    const text = `[청주 택시 합승] ${mine.origin_name}→${mine.dest_name}, ${mine.depart_at.slice(11, 16)} 출발. 동승 ${candidates.length}명.`
    try {
      if (navigator.share) { await navigator.share({ title: '안심 귀가 공유', text }); return }
      await navigator.clipboard.writeText(text); setShareMsg('공유 문구를 복사했어요.')
    } catch { setShareMsg('공유를 취소했어요.') }
  }

  return (
    <section>
      <p className="hint">데이터: {source === 'supabase' ? 'Supabase 실시간 DB' : '로컬 합성 데이터'} · 요청 {requests.length}건 · <span className="tag">합성 데이터 포함</span></p>
      <form className="card" onSubmit={submit}>
        <label className="field"><span>닉네임</span>
          <input value={form.nickname} onChange={(e) => setForm({ ...form, nickname: e.target.value })} placeholder="예: 졸린수달" />
        </label>
        <label className="field"><span>성별</span>
          <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
            <option value="F">여성</option><option value="M">남성</option>
          </select>
        </label>
        <label className="field"><span>차종</span>
          <select value={form.vehicle} onChange={(e) => setForm({ ...form, vehicle: e.target.value, anyGender: false })}>
            <option value="mid">중형택시 (동성 합승만 허용)</option>
            <option value="large">대형·승합택시</option>
          </select>
        </label>
        <label className="consent">
          <input type="checkbox" checked={sameGenderOnly} disabled={form.vehicle === 'mid'}
            onChange={(e) => setForm({ ...form, anyGender: !e.target.checked })} />
          동성끼리만 매칭 {form.vehicle === 'mid' && <span className="tag">법령상 필수</span>}
        </label>
        <ZoneSelect label="출발" value={form.origin} onChange={(v) => setForm({ ...form, origin: v })} />
        <ZoneSelect label="도착" value={form.dest} onChange={(v) => setForm({ ...form, dest: v })} />
        <label className="field"><span>출발 시각</span>
          <input type="datetime-local" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
        </label>
        <button className="primary" type="submit">합승 신청하기</button>
        <p className="hint">동승자 모두가 앱에서 각자 신청해야 합승이 성립합니다. 기사님이 임의로 다른 승객을 태우는 합승은 불법입니다.</p>
      </form>

      {mine && (
        <div className="card">
          <h3>매칭 후보 {candidates.length}명</h3>
          {candidates.length === 0 && <p className="hint">조건(±{matching.depart_window_min}분, 출발·도착 1.5km 이내{mine.same_gender_only ? ', 동성' : ''})에 맞는 상대가 아직 없어요. 충북대↔오송 23시, 오창→가경 8시를 시도해 보세요.</p>}
          {candidates.map((c) => (
            <div key={c.id ?? c.nickname} className="row">
              <span>{c.nickname} · {c.origin_name}→{c.dest_name} · {c.depart_at.slice(11, 16)} {c.is_synthetic && <span className="tag">합성</span>}</span>
              <button type="button" className="link" onClick={() => block(c.nickname)}>차단</button>
            </div>
          ))}
          {share && (
            <>
              <div className="row"><span>미터 예상 총요금</span><b>{won(myQuote.fare)}</b></div>
              <div className="row"><span>{party.length}명 1인 분담</span><b className="green">{won(share)}</b></div>
              {!confirmed && <button type="button" className="primary" onClick={() => setConfirmed(true)}>탑승 전 고지 확인</button>}
            </>
          )}
        </div>
      )}

      {mine && share && confirmed && (
        <div className="card disclosure">
          <h3>탑승 전 고지</h3>
          <p className="hint">법령에 따라 탑승 전 동승자의 탑승 시각·위치와 좌석을 알려 드립니다.</p>
          <table className="mini">
            <thead><tr><th>동승자</th><th>탑승</th><th>좌석</th></tr></thead>
            <tbody>
              {party.map((p, i) => (
                <tr key={p.id ?? p.nickname}>
                  <td>{i === 0 ? `${p.nickname} (나)` : p.nickname}</td>
                  <td>{p.depart_at.slice(11, 16)} · {p.origin_name}</td>
                  <td>{SEATS[i]}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="row"><span>하차</span><b>{mine.dest_name} (같은 목적지 · 균등 분담)</b></div>
          <div className="row"><span>결제</span><b>미터 요금 기준, 앱은 분담 안내만</b></div>
          <div className="safety">
            <a className="btn danger" href="tel:112">🚨 112 신고</a>
            <button type="button" onClick={shareLocation}>📍 안심 공유</button>
            <button type="button" onClick={() => block(candidates[candidates.length - 1].nickname)}>🚫 신고·차단</button>
          </div>
          {shareMsg && <p className="hint">{shareMsg}</p>}
        </div>
      )}
    </section>
  )
}

const SCOPES = {
  all: { label: '청주 전체', filter: () => true },
  oo: { label: '오송·오창 관련 구간', filter: (p) => ['오송읍', '오창읍'].includes(p.on) || ['오송읍', '오창읍'].includes(p.dn) },
  surcharged: { label: '할증 구간만', filter: (p) => p.cat === 'dong_to_eupmyeon' || p.cat === 'eupmyeon_to_other_eupmyeon' },
}
const LEVELS = [0.01, 0.02, 0.05, 0.1, 0.2]

function SimTab() {
  const [scope, setScope] = useState('oo')
  const [participation, setParticipation] = useState(5)
  const [hour, setHour] = useState(23)
  const [windowMin, setWindowMin] = useState(15)
  const [maxParty, setMaxParty] = useState(3)

  const base = { windowMin, maxParty, filter: SCOPES[scope].filter }
  const h = useMemo(() => simulateHour(pairs, { ...base, hour, participation: participation / 100 }), [scope, participation, hour, windowMin, maxParty])
  const day = useMemo(() => simulateDay(pairs, { ...base, participation: participation / 100 }), [scope, participation, windowMin, maxParty])
  const curve = useMemo(() => LEVELS.map((p) => ({ p, ...simulateDay(pairs, { ...base, participation: p }) })), [scope, windowMin, maxParty])

  return (
    <section>
      <p className="hint">청주 OD 택시통행(평일)에서 앱 참여율만큼 가상 사용자를 만들고, 출발·도착 읍면동이 같고 동성이며 {windowMin}분 안에 출발하는 사람끼리 묶습니다. <span className="tag">시뮬레이션</span></p>
      <div className="card">
        <label className="field"><span>범위</span>
          <select value={scope} onChange={(e) => setScope(e.target.value)}>
            {Object.entries(SCOPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </label>
        <label className="field"><span>앱 참여율: 택시 이용자의 {participation}%</span>
          <input type="range" min="1" max="20" value={participation} onChange={(e) => setParticipation(Number(e.target.value))} />
        </label>
        <label className="field"><span>시간대: {hour}시</span>
          <input type="range" min="0" max="23" value={hour} onChange={(e) => setHour(Number(e.target.value))} />
        </label>
        <div className="two">
          <label className="field"><span>최대 대기</span>
            <select value={windowMin} onChange={(e) => setWindowMin(Number(e.target.value))}>
              {[10, 15, 20].map((m) => <option key={m} value={m}>{m}분</option>)}
            </select>
          </label>
          <label className="field"><span>최대 인원</span>
            <select value={maxParty} onChange={(e) => setMaxParty(Number(e.target.value))}>
              {[2, 3].map((m) => <option key={m} value={m}>{m}명</option>)}
            </select>
          </label>
        </div>
      </div>

      <div className="card result">
        <h3>{hour}시 한 시간</h3>
        <div className="row"><span>합승 요청</span><b>{h.requests.toLocaleString()}명</b></div>
        <div className="row"><span>매칭 성공</span><b className="green">{h.matched.toLocaleString()}명 ({pct(h.matchRate)})</b></div>
        <div className="row"><span>평균 대기</span><b>{h.avgWaitMin.toFixed(1)}분</b></div>
        <div className="row"><span>1인 평균 부담</span><b>{won(h.avgSoloFare)} → <span className="green">{won(h.avgPaid)}</span></b></div>
        {h.surchargedRiders > 0 && (
          <div className="row"><span>할증 구간 이용자 중 '할증 없는 혼자 요금'보다 싸게 탄 비율</span><b className="green">{pct(h.surchargedBeatDongRate)}</b></div>
        )}
      </div>

      <div className="card">
        <h3>하루 전체 (평일)</h3>
        <div className="row"><span>합승 요청</span><b>{day.requests.toLocaleString()}명</b></div>
        <div className="row"><span>매칭 성공률</span><b className="green">{pct(day.matchRate)}</b></div>
        <div className="row"><span>시민 절감액</span><b className="green">{won(day.savingTotal)}/일</b></div>
        <div className="row"><span>연간 환산 (×300일)</span><b className="big2">{eok(day.savingTotal * 300)}</b></div>
      </div>

      <div className="card">
        <h3>참여율별 매칭 성공률</h3>
        {curve.map((c) => (
          <div key={c.p} className="bar-row">
            <span>{c.p * 100}%</span>
            <div className="bar"><div style={{ width: `${c.matchRate * 100}%` }} /></div>
            <b>{pct(c.matchRate)}</b>
          </div>
        ))}
        <p className="hint">참여율이 오를수록 같이 탈 사람을 찾을 확률이 오릅니다. 수요가 몰리는 오송·오창 구간은 청주 전체보다 같은 참여율에서 매칭이 훨씬 잘 됩니다.</p>
      </div>
      <p className="hint">가정: 시간대별 택시 이용 비중은 일반적인 분포를 사용했고(TIMS 격자 영업통계로 교체 예정), 성별은 5:5, 거리는 추정치입니다. OD 택시통행은 실제보다 많게 추정됐을 수 있습니다(정책 탭 보정계수 참고).</p>
    </section>
  )
}

const SURCHARGED = new Set(['dong_to_eupmyeon', 'eupmyeon_to_other_eupmyeon'])

function PolicyTab() {
  const [optId, setOptId] = useState('P1')
  const [rate, setRate] = useState(35)
  const opt = policy.options.find((o) => o.id === optId)
  const calib = policy.model_calibration.calibration_factor_to_anchor
  const days = policy.annualization_days
  const phase1 = policy.anchors.find((a) => a.id === 'phase1_compensation').value_won_per_year

  const result = useMemo(() => {
    const effRate = opt.id === 'P2' ? 20 : opt.id === 'P3' ? 0 : rate
    let dailySaving = 0, trips = 0
    for (const p of pairs) {
      if (!SURCHARGED.has(p.cat)) continue
      const removed = opt.remove_categories.includes(p.cat) ||
        (opt.remove_zone_pairs_with || []).some((n) => p.on === n || p.dn === n)
      const factor = removed ? 1 : 1 - effRate / 35
      if (factor > 0) { dailySaving += p.taxi * (p.fe - p.fd) * factor; trips += p.taxi }
    }
    const annual = dailySaving * days * calib
    return { annual, perTrip: trips ? dailySaving / trips : 0, total: phase1 + annual }
  }, [opt, rate])

  return (
    <section>
      <div className="card">
        <label className="field"><span>정책 옵션</span>
          <select value={optId} onChange={(e) => setOptId(e.target.value)}>
            {policy.options.map((o) => <option key={o.id} value={o.id}>{o.id} · {o.label}</option>)}
          </select>
        </label>
        {(optId === 'P0' || optId === 'P1' || optId === 'P4') && (
          <label className="field"><span>남은 구간 할증률: {rate}%</span>
            <input type="range" min="0" max="35" value={rate} onChange={(e) => setRate(Number(e.target.value))} />
          </label>
        )}
        {opt.note && <p className="hint">{opt.note}</p>}
      </div>
      <div className="card result">
        <div className="row"><span>현행 1단계 보전비 (시 발표)</span><b>{eok(phase1)}/년</b></div>
        <div className="row"><span>추가 보전비 (= 승객 절감액)</span><b className="red">{eok(result.annual)}/년</b></div>
        <div className="row"><span>총 보전비 추정</span><b className="big2">{eok(result.total)}/년</b></div>
        <div className="row"><span>해당 운행 1회 평균 절감</span><b className="green">{won(result.perTrip)}</b></div>
      </div>
      <p className="hint">
        계산: OD 택시통행 × (읍·면요율 − 동요율) × {days}일 × 보정계수 {calib}.
        보정계수는 같은 방식으로 계산한 1단계 비용을 시 보전액 4억 원에 맞춘 값입니다.
        이 계수로 전면 해제(P3)를 계산하면 약 39억 원으로, 별도 보도된 "약 40억 원"과 일치합니다.
      </p>
    </section>
  )
}

function LegalTab({ onWithdraw }) {
  return (
    <section>
      <div className="card">
        <h3>법적 요건 → 구현 대응표</h3>
        <p className="hint">{legal.note}</p>
      </div>
      {legal.requirements.map((r) => (
        <div key={r.id} className="card legal">
          <div className="legal-law">{r.law} {!r.verified && <span className="tag">원문 대조 필요</span>}</div>
          <div className="legal-req">{r.requirement}</div>
          <div className="row"><span>구현</span><b>{r.implemented}</b></div>
          <div className="row"><span>화면</span><b>{r.screen}</b></div>
          <a className="src" href={r.source} target="_blank" rel="noreferrer">근거 보기</a>
        </div>
      ))}
      <div className="card">
        <h3>동의 철회 · 데이터 삭제</h3>
        <p className="hint">이 기기에 저장된 동의 기록과 차단 목록을 지우고 처음 화면으로 돌아갑니다.</p>
        <button className="primary danger" onClick={onWithdraw}>동의 철회하고 데이터 삭제</button>
      </div>
    </section>
  )
}

function AboutTab() {
  return (
    <section>
      <div className="card">
        <h3>데이터 신뢰 등급</h3>
        <p className="hint"><b>보도 기준</b>: 요율·보전비 / <b>공공데이터 추정</b>: OD 통행, 노드링크 통행량 / <b>합성 데이터</b>: 합승 요청 목록 / <b>시뮬레이션</b>: 참여율별 매칭 결과</p>
        <p className="hint">요율은 청주시 운임·요율 고시 원문 확보 후 교체 예정. 심야할증은 미확인이라 계산에서 제외.</p>
      </div>
      <div className="card">
        <h3>출처</h3>
        <ul className="sources">
          {sources.map((s) => (
            <li key={s.id}><a href={s.url} target="_blank" rel="noreferrer">{s.publisher} ({s.date})</a> — {s.claim}</li>
          ))}
        </ul>
      </div>
    </section>
  )
}

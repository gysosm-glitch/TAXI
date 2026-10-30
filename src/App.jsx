import { useEffect, useMemo, useState } from 'react'
import fareRules from '../data/web/02_fare_rules/fare_rules.json'
import zoneList from '../data/web/01_zones/zones.json'
import scenarios from '../data/web/04_scenarios/scenarios.json'
import pairs from '../data/web/03_demand/taxi_od_pairs.min.json'
import policy from '../data/web/06_policy/policy_params.json'
import matching from '../data/web/05_matching/matching_rules.json'
import sources from '../data/web/07_sources/sources.json'
import synthetic from '../data/web/05_matching/synthetic_ride_requests.json'
import { CATEGORY_LABEL, haversineM, quote, splitFare } from './lib/fare.js'
import { supabase } from './lib/supabase.js'

const rules = fareRules.regions.cheongju
const zones = [...zoneList].sort((a, b) => a.name.localeCompare(b.name, 'ko'))
const zoneById = Object.fromEntries(zones.map((z) => [z.zone_id, z]))
const won = (n) => `${Math.round(n).toLocaleString('ko-KR')}원`
const eok = (n) => `${(n / 1e8).toFixed(1)}억 원`

const TABS = [
  ['fare', '요금 계산'],
  ['match', '합승 매칭'],
  ['policy', '정책 시뮬레이터'],
  ['about', '출처·고지'],
]

export default function App() {
  const [tab, setTab] = useState('fare')
  return (
    <div className="app">
      <header>
        <h1>청주 택시 복합할증 계산기</h1>
        <p className="sub">9/28 1단계 개편 이후에도 남은 35% 할증, 합승으로 얼마나 줄일 수 있을까?</p>
      </header>
      <nav className="tabs">
        {TABS.map(([id, label]) => (
          <button key={id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>{label}</button>
        ))}
      </nav>
      <main>
        {tab === 'fare' && <FareTab />}
        {tab === 'match' && <MatchTab />}
        {tab === 'policy' && <PolicyTab />}
        {tab === 'about' && <AboutTab />}
      </main>
      <footer className="notice">{matching.legal_notice}</footer>
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

function MatchTab() {
  const [requests, setRequests] = useState(synthetic)
  const [source, setSource] = useState('local')
  const [form, setForm] = useState({ nickname: '', gender: 'F', origin: 130, dest: 131, time: '2026-11-10T23:00' })
  const [mine, setMine] = useState(null)

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

  const submit = async (e) => {
    e.preventDefault()
    const oz = zoneById[form.origin], dz = zoneById[form.dest]
    const row = {
      nickname: form.nickname || '익명', gender: form.gender, age_group: '20s',
      origin_zone: oz.zone_id, origin_name: oz.name, origin_lon: oz.centroid_lon, origin_lat: oz.centroid_lat,
      dest_zone: dz.zone_id, dest_name: dz.name, dest_lon: dz.centroid_lon, dest_lat: dz.centroid_lat,
      depart_at: `${form.time}:00+09:00`, seats: 1, same_gender_only: true,
      category: quote({ origin: oz, dest: dz, distanceM: 1000, rules }).category,
      status: 'waiting', is_synthetic: false,
    }
    if (supabase) await supabase.from('ride_requests').insert(row)
    setMine(row)
  }

  // 데모 매칭 규칙: 존 중심 기준이라 반경을 matching_rules보다 넓게(1.5km) 적용
  const RADIUS_M = 1500
  const candidates = useMemo(() => {
    if (!mine) return []
    return requests.filter((r) =>
      r.status === 'waiting' && r.nickname !== mine.nickname &&
      (!mine.same_gender_only || r.gender === mine.gender) &&
      minutesApart(r.depart_at, mine.depart_at) <= matching.depart_window_min &&
      haversineM(r.origin_lon, r.origin_lat, mine.origin_lon, mine.origin_lat) <= RADIUS_M &&
      haversineM(r.dest_lon, r.dest_lat, mine.dest_lon, mine.dest_lat) <= RADIUS_M,
    ).slice(0, matching.max_party_size - 1)
  }, [mine, requests])

  const myQuote = mine && quote({
    origin: zoneById[mine.origin_zone], dest: zoneById[mine.dest_zone],
    distanceM: estKm(mine.origin_zone, mine.dest_zone) * 1000, rules,
  })

  return (
    <section>
      <p className="hint">데이터: {source === 'supabase' ? 'Supabase 실시간 DB' : '로컬 합성 데이터'} · 요청 {requests.length}건 · <span className="tag">합성 데이터 포함</span></p>
      <form className="card" onSubmit={submit}>
        <label className="field"><span>닉네임</span>
          <input value={form.nickname} onChange={(e) => setForm({ ...form, nickname: e.target.value })} placeholder="예: 졸린수달" />
        </label>
        <label className="field"><span>성별 (중형택시는 동성 합승만 허용)</span>
          <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
            <option value="F">여성</option><option value="M">남성</option>
          </select>
        </label>
        <ZoneSelect label="출발" value={form.origin} onChange={(v) => setForm({ ...form, origin: v })} />
        <ZoneSelect label="도착" value={form.dest} onChange={(v) => setForm({ ...form, dest: v })} />
        <label className="field"><span>출발 시각</span>
          <input type="datetime-local" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
        </label>
        <label className="consent"><input type="checkbox" required /> 위치·개인정보 수집에 동의합니다 (데모: 실제 GPS는 저장하지 않음)</label>
        <button className="primary" type="submit">합승 상대 찾기</button>
      </form>

      {mine && (
        <div className="card">
          <h3>매칭 후보 {candidates.length}명</h3>
          {candidates.length === 0 && <p className="hint">조건(±{matching.depart_window_min}분, 출발·도착 1.5km 이내, 동성)에 맞는 상대가 아직 없어요. 오송역·충북대 23시 전후를 시도해 보세요.</p>}
          {candidates.map((c) => (
            <div key={c.id ?? c.nickname} className="row">
              <span>{c.nickname} · {c.origin_name}→{c.dest_name} · {c.depart_at.slice(11, 16)} {c.is_synthetic && <span className="tag">합성</span>}</span>
            </div>
          ))}
          {candidates.length > 0 && myQuote && (
            <>
              <div className="row"><span>예상 총요금</span><b>{won(myQuote.fare)}</b></div>
              <div className="row"><span>{candidates.length + 1}명 1인 부담</span><b className="green">{won(splitFare(myQuote.fare, Array(candidates.length + 1).fill(1))[0])}</b></div>
              <div className="safety">
                <button type="button">🚨 112 긴급신고</button>
                <button type="button">📍 위치 공유</button>
                <button type="button">🚫 신고·차단</button>
              </div>
              <p className="hint">탑승 전 동승자의 탑승 시각·위치·좌석이 고지됩니다 (목업).</p>
            </>
          )}
        </div>
      )}
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

function AboutTab() {
  return (
    <section>
      <div className="card">
        <h3>데이터 신뢰 등급</h3>
        <p className="hint"><b>보도 기준</b>: 요율·보전비 / <b>공공데이터 추정</b>: OD 통행, 노드링크 통행량 / <b>합성 데이터</b>: 합승 요청 목록</p>
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

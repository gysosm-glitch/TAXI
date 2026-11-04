// 교통: 열차와 버스를 나눠 보여 준다. 시연 데이터가 아니라 실제 공공데이터다.
import { useState } from 'react'
import Icon from '../components/Icon.jsx'
import { spots } from '../data.js'
import { useLive, useLastBus, lastBusState, useTrains, useTerminal, minutesUntil } from '../lib/live.js'
import { useNow } from '../lib/demoRides.js'

const clock = (d) => d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
const DIRS = [['all', '전체', []], ['seoul', '서울', ['서울', '용산']], ['busan', '부산·대구', ['부산', '동대구']], ['honam', '호남', ['광주송정', '목포', '익산']]]
const BUS_PLACES = ['osong_stn', 'bus_terminal', 'cbnu', 'ochang_lake', 'downtown'].map((id) => spots.find((s) => s.id === id))
const left = (m) => (m <= 0 ? '곧 도착' : m < 60 ? `${m}분 후` : `${Math.floor(m / 60)}시간 ${m % 60}분 후`)

function Source({ at, note, children }) {
  return (
    <details className="source">
      <summary>{at ? `${clock(at)} 확인 · ${note}` : '출처'}</summary>
      <p>{children}</p>
    </details>
  )
}

function Trains({ onRide }) {
  const data = useTrains(true)
  const [dir, setDir] = useState('all')
  const froms = DIRS.find(([k]) => k === dir)[2]
  const list = data?.ok ? data.next.filter((t) => minutesUntil(t.time) >= 0 && (!froms.length || froms.includes(t.from))).slice(0, 8) : []
  return (
    <>
      <div className="card">
        <p className="card-title"><span className="with-badge"><span className="ibadge blue"><Icon name="train" size={16} /></span>오송역 도착 열차</span></p>
        <div className="chips wrap">{DIRS.map(([k, l]) => <button key={k} className={`chip ${dir === k ? 'on' : ''}`} onClick={() => setDir(k)}>{l}</button>)}</div>
        {!data && <p className="sub">불러오는 중…</p>}
        {data && !data.ok && <p className="sub">열차 정보를 불러오지 못했어요.</p>}
        {data?.ok && list.length === 0 && <p className="sub">오늘 남은 열차가 없어요.</p>}
        {list.map((t) => (
          <div key={t.no} className="info-row">
            <div className="info-time"><b>{t.time}</b><small>{left(minutesUntil(t.time))}</small></div>
            <div className="info-main"><b>{t.grade}</b><small>{t.from} 출발 · {t.no}</small></div>
          </div>
        ))}
        {list.length > 0 && <button className="btn ghost" style={{ marginTop: 12 }} onClick={onRide}>같이 탈 사람 찾기</button>}
      </div>
      <Source at={data?.at} note="5분마다 확인">국토교통부 TAGO 열차정보의 운행 계획입니다. 서울·용산·부산·동대구·광주송정·목포·익산에서 출발해 오송역에 서는 열차를 모았어요. 예정 시각이라 지연은 반영되지 않아요.</Source>
    </>
  )
}

function Terminal({ onRide }) {
  const data = useTerminal()
  const [kind, setKind] = useState('all')
  const list = data?.ok ? data.next.filter((t) => minutesUntil(t.time) >= 0 && (kind === 'all' || t.kind === kind)).slice(0, 10) : []
  return (
    <>
      <div className="card">
        <p className="card-title"><span className="with-badge"><span className="ibadge blue"><Icon name="bus" size={16} /></span>청주 터미널 출발</span></p>
        <div className="chips">{[['all', '전체'], ['고속', '고속'], ['시외', '시외']].map(([k, l]) => <button key={k} className={`chip ${kind === k ? 'on' : ''}`} onClick={() => setKind(k)}>{l}</button>)}</div>
        {!data && <p className="sub">불러오는 중…</p>}
        {data && !data.ok && <p className="sub">터미널 정보를 불러오지 못했어요.</p>}
        {data?.ok && list.length === 0 && <p className="sub">오늘 남은 버스가 없어요.</p>}
        {list.map((t, i) => (
          <div key={`${t.kind}-${t.to}-${t.time}-${i}`} className="info-row">
            <div className="info-time"><b>{t.time}</b><small>{left(minutesUntil(t.time))}</small></div>
            <div className="info-main"><b>{t.to}</b><small>{t.kind} · {t.grade}{t.charge ? ` · ${t.charge.toLocaleString()}원` : ''}</small></div>
          </div>
        ))}
        {list.length > 0 && <button className="btn ghost" style={{ marginTop: 12 }} onClick={onRide}>터미널까지 같이 갈 사람 찾기</button>}
      </div>
      <Source at={data?.at} note="5분마다 확인">국토교통부 TAGO 고속버스·시외버스정보의 오늘 배차입니다. 주요 도착지 위주로 보여 줘요.</Source>
    </>
  )
}

function Buses() {
  const [id, setId] = useState(BUS_PLACES[0].id)
  const p = BUS_PLACES.find((s) => s.id === id)
  const { bus, at } = useLive(p)
  const last = lastBusState(useLastBus(p))
  return (
    <>
      <div className="card">
        <p className="card-title"><span className="with-badge"><span className="ibadge blue"><Icon name="bus" size={16} /></span>정류장 버스 도착</span></p>
        <div className="chips">{BUS_PLACES.map((s) => <button key={s.id} className={`chip ${id === s.id ? 'on' : ''}`} onClick={() => setId(s.id)}>{s.name}</button>)}</div>
        {!bus && <p className="sub">불러오는 중…</p>}
        {bus && !bus.ok && <p className="sub">버스 정보를 불러오지 못했어요.</p>}
        {bus?.ok && bus.stations.filter((s) => s.arrivals.length).slice(0, 4).map((s) => (
          <div key={s.id} className="stop">
            <b>{s.name}</b>
            {s.arrivals.slice(0, 4).map((a, i) => <div key={i} className="stop-row"><span>{a.route}번</span><span>{left(a.min)}</span></div>)}
          </div>
        ))}
        {bus?.ok && !bus.stations.some((s) => s.arrivals.length) && <p className="sub">지금 도착 예정인 버스가 없어요.</p>}
        {last && <div className={`last-bus ${last.ended ? 'ended' : last.soon ? 'soon' : ''}`}><span>가장 늦은 막차</span><b>{last.latest.route}번 {last.latest.last}{last.ended ? ' · 운행 끝' : last.soon ? ` · ${last.left}분 남음` : ''}</b></div>}
      </div>
      <Source at={at} note="1분마다 확인">국토교통부 TAGO 버스도착정보의 실시간 값입니다. 고른 곳 주변 정류장을 보여 줘요.</Source>
    </>
  )
}

export default function Transit({ onRide }) {
  const [mode, setMode] = useState('train')
  const now = useNow(1000)
  return (
    <>
      <div className="page-head">
        <h1 className="page-title">교통 정보</h1>
        <span className="live-clock"><i />{clock(new Date(now))}</span>
      </div>
      <div className="seg" style={{ marginBottom: 12 }}>
        <button className={mode === 'train' ? 'on' : ''} onClick={() => setMode('train')}>열차</button>
        <button className={mode === 'terminal' ? 'on' : ''} onClick={() => setMode('terminal')}>터미널</button>
        <button className={mode === 'bus' ? 'on' : ''} onClick={() => setMode('bus')}>시내버스</button>
      </div>
      {mode === 'train' ? <Trains onRide={() => onRide('osong')} /> : mode === 'terminal' ? <Terminal onRide={() => onRide('terminal')} /> : <Buses />}
    </>
  )
}

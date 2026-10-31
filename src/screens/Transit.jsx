import { useState } from 'react'
import Icon from '../components/Icon.jsx'
import { BusStop, Badge } from '../components/Illust.jsx'
import { spots } from '../data.js'
import { useLive, useLastBus, lastBusState } from '../lib/live.js'
import { HOUR_PROFILE } from '../lib/simulate.js'

const SUM = HOUR_PROFILE.reduce((a, b) => a + b, 0)

function Waiting({ data }) {
  if (!data) return <p className="sub">불러오는 중…</p>
  const msg = data.reason === 'key_pending' ? '실시간 도착 정보 승인을 기다리고 있어요.'
    : data.reason === 'api_error' ? '잠시 정보를 가져오지 못했어요.'
    : data.reason ? '실시간 연결을 준비하고 있어요.' : null
  if (msg) return <div className="empty"><BusStop /><p className="sub">{msg}</p></div>
  return null
}

export default function Transit() {
  const [id, setId] = useState('osong_stn')
  const spot = spots.find((s) => s.id === id)
  const { bus, at } = useLive(spot)
  const lastData = useLastBus(spot)
  const last = lastBusState(lastData)
  const hour = new Date().getHours()
  const busy = Math.round(spot.pickups_per_day * HOUR_PROFILE[hour] / SUM)

  return (
    <>
      <h1 className="page-title">교통</h1>
      <p className="page-sub">{at ? `${at.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 기준 · 1분마다 새로고침` : '불러오는 중'}</p>
      <div className="chips">
        {spots.map((s) => <button key={s.id} className={`chip ${s.id === id ? 'on' : ''}`} onClick={() => setId(s.id)}>{s.name}</button>)}
      </div>

      <div className="card">
        <p className="card-title"><span className="with-badge"><Badge tone="blue"><Icon name="bus" size={16} /></Badge>버스 도착</span></p>
        <Waiting data={bus} />
        {bus?.ok && bus.stations.length === 0 && <p className="sub">가까운 정류장 정보가 없어요.</p>}
        {bus?.ok && bus.stations.map((s) => (
          <div key={s.id} className="row-item" style={{ alignItems: 'flex-start' }}>
            <span>{s.name}<span className="meta">{s.arrivals.length ? s.arrivals.slice(0, 3).map((a) => `${a.route}번 ${a.min}분`).join(' · ') : '도착 예정 버스 없음'}</span></span>
            <span className={`r ${s.arrivals.length ? '' : 'off'}`}>{s.arrivals[0] ? `${s.arrivals[0].min}분` : '–'}</span>
          </div>
        ))}
      </div>


      <div className="card">
        <p className="card-title"><span className="with-badge"><Badge tone="blue"><Icon name="bus" size={16} /></Badge>막차</span>
          {last && <span className={`tag ${last.ended ? 'red' : last.soon ? 'amber' : ''}`}>{last.ended ? '운행 끝' : `막차까지 ${Math.floor(last.left / 60) ? `${Math.floor(last.left / 60)}시간 ` : ''}${last.left % 60}분`}</span>}</p>
        {!lastData && <p className="sub">불러오는 중…</p>}
        {lastData && !lastData.ok && <Waiting data={lastData} />}
        {lastData?.ok && lastData.routes.length === 0 && <p className="sub">이 주변 노선 정보가 없어요.</p>}
        {lastData?.ok && lastData.routes.slice(0, 6).map((r) => (
          <div key={r.route} className="row-item"><span>{r.route}번<span className="meta">{r.toward} 방면 · 첫차 {r.first}</span></span><span className="r">{r.last}</span></div>
        ))}
        {last?.ended && <p className="sub" style={{ marginTop: 8 }}>버스가 끊긴 시간이에요. 같이타기로 택시비를 나눠 보세요.</p>}
      </div>

      <div className="card">
        <p className="card-title">지금 이곳 택시 수요 <small>시간당 약 {busy}명</small></p>
        <div className="bars">
          {HOUR_PROFILE.map((v, h) => <div key={h} className={h === hour ? 'now' : ''} style={{ height: `${(v / Math.max(...HOUR_PROFILE)) * 100}%` }} />)}
        </div>
        <div className="axis"><span>0시</span><span>6시</span><span>12시</span><span>18시</span><span>23시</span></div>
        <p className="sub" style={{ marginTop: 8 }}>버스가 뜸한 시간에 같이타기 수요가 늘어요.</p>
      </div>
    </>
  )
}

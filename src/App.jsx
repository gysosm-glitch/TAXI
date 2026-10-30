import { useState } from 'react'
import SpotsView from './screens/SpotsView.jsx'
import TrafficView from './screens/TrafficView.jsx'
import MatchInfoView from './screens/MatchInfoView.jsx'

const TABS = [
  ['spots', '매칭 스팟'],
  ['traffic', '실시간 교통'],
  ['info', '매칭에 필요한 정보'],
]

export default function App() {
  const [tab, setTab] = useState('spots')
  const [spotId, setSpotId] = useState('osong_stn')
  return (
    <>
      <header className="top">
        <div className="top-inner">
          <h1 className="title">청주 복합할증 개선 · 택시 매칭 스팟<small>충북대학교 경영대 캡스톤 데모 · 국토부 TIMS 2025 · 청주시 BIS</small></h1>
          <nav className="nav">
            {TABS.map(([id, label]) => <button key={id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>{label}</button>)}
          </nav>
        </div>
      </header>
      <main className="page">
        {tab === 'spots' && <SpotsView spotId={spotId} onSelect={setSpotId} onTraffic={(id) => { setSpotId(id); setTab('traffic') }} />}
        {tab === 'traffic' && <TrafficView spotId={spotId} onSelect={setSpotId} />}
        {tab === 'info' && <MatchInfoView />}
      </main>
      <footer className="foot">데이터: 국토교통부 택시운행정보관리시스템(TIMS) 격자별·지자체별 영업통계 2025 · 청주시 버스정보시스템 2026-10 · 국토교통부 TAGO · 국가교통정보센터 ITS</footer>
    </>
  )
}

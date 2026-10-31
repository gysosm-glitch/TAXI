import { useMemo } from 'react'
import Icon from '../components/Icon.jsx'
import { SharedTaxi, Badge } from '../components/Illust.jsx'
import { waitingBySpot, tripQuote, zoneById, won } from '../data.js'
import { useLive, nextBus, taxiDemandNow } from '../lib/live.js'

const GOAL = 50000
const DAYS = ['일', '월', '화', '수', '목', '금', '토']

function savedThisMonth() {
  try {
    const list = JSON.parse(localStorage.getItem('history_v1')) ?? []
    const m = new Date().toISOString().slice(0, 7)
    const mine = list.filter((h) => h.at?.startsWith(m))
    return { won: mine.reduce((a, h) => a + (h.saving || 0), 0), count: mine.length }
  } catch { return { won: 0, count: 0 } }
}

function Ring({ ratio }) {
  const c = 2 * Math.PI * 31
  return (
    <svg width="78" height="78" viewBox="0 0 76 76" aria-hidden="true">
      <circle cx="38" cy="38" r="31" fill="none" stroke="var(--teal-soft)" strokeWidth="9" />
      <circle cx="38" cy="38" r="31" fill="none" stroke="var(--teal)" strokeWidth="9" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(1, ratio))} transform="rotate(-90 38 38)" />
      <text x="38" y="43" textAnchor="middle" fontSize="15" fontWeight="700" fill="var(--teal)">{Math.round(ratio * 100)}%</text>
    </svg>
  )
}

export default function Home({ user, onGo }) {
  const now = new Date()
  const groups = useMemo(() => waitingBySpot(now), [now.getHours()])
  const top = groups[0]
  const people = Math.max(2, top.waiting + 1)
  const q = top.destZone ? tripQuote(top.zone, top.destZone, people) : null
  const solo = top.destZone ? tripQuote(top.zone, top.destZone, 1) : null
  const saved = savedThisMonth()
  const { bus } = useLive(top.spot)
  const nb = nextBus(bus)
  const demand = taxiDemandNow(top.spot)

  return (
    <>
      <div className="hello">
        <div>
          <div className="date">{now.getMonth() + 1}월 {now.getDate()}일 {DAYS[now.getDay()]}요일</div>
          <h1>안녕하세요{user ? `, ${user.name}님` : ''}</h1>
        </div>
        <div className="avatar">{user ? user.name.slice(0, 1) : <Icon name="user" size={20} />}</div>
      </div>

      <div className="card ring-card">
        <Ring ratio={saved.won / GOAL} />
        <div>
          <p className="label">이번 달 같이 타서 아낀 돈</p>
          <p className="big">{won(saved.won)}</p>
          <p className="sub">{saved.count ? `같이 탄 횟수 ${saved.count}회 · 목표 ${won(GOAL)}` : '같이 타면 할증 붙는 요금도 n분의 1이에요'}</p>
        </div>
      </div>

      {q && (
        <div className="hero">
          <div className="hero-art"><SharedTaxi /></div>
          <p className="label">지금 같이 타기</p>
          <h2>{top.spot.name} → {zoneById[top.destZone].name}</h2>
          <p className="sub">{top.waiting ? `${top.waiting}명 모집 중 · 10분 안에 출발` : '아직 모집이 없어요 · 2명이 모이면 출발'}</p>
          <div className="row">
            <div>
              <p className="sub">1인 예상</p>
              <p className="big" style={{ margin: 0 }}>{won(q.share)}</p>
              <s>혼자 {won(solo.fare)}</s>
            </div>
            <button className="pill-btn" onClick={() => onGo('together')}>{top.waiting ? '참여하기' : '모집 열기'}</button>
          </div>
        </div>
      )}

      <div className="grid2">
        <div className="card">
          <Badge tone="blue"><Icon name="bus" size={18} /></Badge>
          <p className="label">다음 버스</p>
          {nb ? <><p className="mid">{nb.min}분</p><p className="sub">{nb.route}번 · {nb.station}</p></>
            : <><p className="mid" style={{ color: 'var(--muted)' }}>–</p><p className="sub">{bus ? '실시간 연결 준비 중' : '불러오는 중'}</p></>}
        </div>
        <div className="card">
          <Badge tone="amber"><Icon name="users" size={18} /></Badge>
          <p className="label">지금 택시 수요</p>
          <p className={`mid ${demand.level === '많음' ? 'warn' : ''}`}>{demand.level}</p>
          <p className="sub">{top.spot.name} 시간당 약 {demand.perHour}명</p>
        </div>
      </div>

      <div className="card">
        <p className="card-title">가까운 같이타기 스팟 <small onClick={() => onGo('together')} style={{ cursor: 'pointer' }}>전체 보기 ›</small></p>
        {groups.slice(0, 4).map((g) => (
          <div key={g.spot.id} className="row-item">
            <span className="with-badge"><Badge><Icon name="pin" size={16} /></Badge>{g.spot.name}</span>
            <span className={`r ${g.waiting ? '' : 'off'}`}>{g.waiting ? `${g.waiting}명 대기` : '대기 없음'}</span>
          </div>
        ))}
      </div>
    </>
  )
}

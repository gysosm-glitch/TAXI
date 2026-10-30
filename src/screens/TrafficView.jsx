import { useEffect, useState } from 'react'
import { spots, tims, zoneByName } from '../data.js'
import { HOUR_PROFILE } from '../lib/simulate.js'

const PROFILE_SUM = HOUR_PROFILE.reduce((a, b) => a + b, 0)
const levelTag = { 원활: 'green', 서행: 'amber', 정체: 'red' }

async function getJSON(url) {
  try {
    const res = await fetch(url)
    if (!res.ok || !(res.headers.get('content-type') || '').includes('json')) return { ok: false, reason: 'no_server' }
    return await res.json()
  } catch { return { ok: false, reason: 'no_server' } }
}

function KeyGuide({ which }) {
  return (
    <div className="notice">
      {which === 'bus' ? '버스 실시간 정보 API 키가 아직 등록되지 않았어요.' : '도로 소통 정보 API 키가 아직 등록되지 않았어요.'}
      <ol>
        {which === 'bus' ? (
          <>
            <li>공공데이터포털에서 <a href="https://www.data.go.kr/data/15098534/openapi.do" target="_blank" rel="noreferrer">버스정류소정보(15098534)</a>와 <a href="https://www.data.go.kr/data/15098530/openapi.do" target="_blank" rel="noreferrer">버스도착정보(15098530)</a> 활용신청</li>
            <li>마이페이지 › 일반 인증키(Decoding) 복사</li>
            <li>Vercel › Settings › Environment Variables에 <b>TAGO_API_KEY</b>로 저장 후 Redeploy</li>
          </>
        ) : (
          <>
            <li><a href="https://www.its.go.kr/opendata/" target="_blank" rel="noreferrer">국가교통정보센터 공개API</a>에서 회원가입 후 인증키 신청</li>
            <li>Vercel › Settings › Environment Variables에 <b>ITS_API_KEY</b>로 저장 후 Redeploy</li>
          </>
        )}
      </ol>
    </div>
  )
}

export default function TrafficView({ spotId, onSelect }) {
  const spot = spots.find((s) => s.id === spotId)
  const [bus, setBus] = useState(null)
  const [road, setRoad] = useState(null)
  const [at, setAt] = useState(null)
  const hour = new Date().getHours()

  useEffect(() => {
    let alive = true
    const load = async () => {
      const q = `lat=${spot.lat}&lon=${spot.lon}`
      const [b, r] = await Promise.all([getJSON(`/api/bus?${q}`), getJSON(`/api/traffic?${q}`)])
      if (alive) { setBus(b); setRoad(r); setAt(new Date()) }
    }
    setBus(null); setRoad(null); load()
    const t = setInterval(load, 60000)
    return () => { alive = false; clearInterval(t) }
  }, [spotId])

  // 평소 이 시간 택시 수요: 스팟 하루 승차 × 시간대 비중
  const usual = Math.round(spot.pickups_per_day * HOUR_PROFILE[hour] / PROFILE_SUM)
  const zone = tims.zones.find((z) => z.zone_id === zoneByName[spot.zone]?.zone_id)

  return (
    <>
      <p className="lead">스팟을 고르면 주변 <b>버스 실시간 도착</b>과 <b>도로 소통 상황</b>을 1분마다 새로 불러옵니다. 버스가 끊기거나 도로가 막히는 시간이 택시 합승 수요가 몰리는 시간이에요.</p>
      <div className="chips">
        {spots.map((s) => <button key={s.id} className={`chip ${s.id === spotId ? 'on' : ''}`} onClick={() => onSelect(s.id)}>{s.name}</button>)}
      </div>

      <div className="stats">
        <div className="stat"><span>지금 시각</span><b>{hour}시</b><small> {at ? `갱신 ${at.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}` : '불러오는 중'}</small></div>
        <div className="stat"><span>평소 이 시간 택시 승차</span><b>약 {usual}건</b><small> /시간 · TIMS 2025</small></div>
        <div className="stat"><span>그중 할증 구간 이동</span><b>약 {Math.round(usual * spot.surcharge_trip_ratio)}건</b><small> 매칭 대상</small></div>
        <div className="stat"><span>{spot.zone} 하루 승차</span><b>{zone ? Math.round(zone.rides_per_day).toLocaleString() : '-'}건</b></div>
      </div>

      <div className="grid two">
        <div className="card">
          <h2>🚌 주변 버스 실시간 도착</h2>
          <p className="desc">{spot.name} 가까운 정류장 · 국토교통부 TAGO</p>
          {!bus && <p className="muted">불러오는 중…</p>}
          {bus?.reason === 'no_key' && <KeyGuide which="bus" />}
          {bus?.reason === 'no_server' && <p className="muted">로컬 개발 화면에서는 서버 함수가 동작하지 않아요. 배포 주소에서 확인해 주세요.</p>}
          {bus?.reason === 'api_error' && <p className="muted">API 응답 오류: 키 승인 대기 중이거나 일시 장애일 수 있어요.</p>}
          {bus?.ok && bus.stations.length === 0 && <p className="muted">주변 정류장 정보가 없어요.</p>}
          {bus?.ok && bus.stations.map((s) => (
            <div key={s.id} className="station">
              <b>{s.name}</b>
              <div className="arr">
                {s.arrivals.length === 0 && <span>도착 예정 버스 없음 · <b>택시 수요 ↑</b></span>}
                {s.arrivals.map((a, i) => <span key={i}>{a.route}번 <b>{a.min}분</b> ({a.stops}정거장 전)</span>)}
              </div>
            </div>
          ))}
        </div>

        <div className="card">
          <h2>🚗 주변 도로 소통</h2>
          <p className="desc">반경 약 2km · 국가교통정보센터 ITS</p>
          {!road && <p className="muted">불러오는 중…</p>}
          {road?.reason === 'no_key' && <KeyGuide which="road" />}
          {road?.reason === 'no_server' && <p className="muted">로컬 개발 화면에서는 서버 함수가 동작하지 않아요. 배포 주소에서 확인해 주세요.</p>}
          {road?.reason === 'api_error' && <p className="muted">API 응답 오류: 키 승인 대기 중이거나 일시 장애일 수 있어요.</p>}
          {road?.ok && road.roads.length === 0 && <p className="muted">이 범위에 수집되는 도로 구간이 없어요 (ITS는 국도·주요 간선 위주).</p>}
          {road?.ok && road.roads.map((r) => (
            <div key={r.road} className="road">
              <span>{r.road}</span>
              <span><b>{r.speed}km/h</b> <span className={`tag ${levelTag[r.level]}`}>{r.level}</span></span>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h2>시간대별 평소 택시 수요 ({spot.name})</h2>
        <p className="desc">TIMS 2025 하루 승차 × 시간대 비중(일반적 분포 가정). 지금 시각을 진하게 표시했어요.</p>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 120 }}>
          {HOUR_PROFILE.map((v, h) => (
            <div key={h} title={`${h}시 약 ${Math.round(spot.pickups_per_day * v / PROFILE_SUM)}건`}
              style={{ flex: 1, height: `${(v / Math.max(...HOUR_PROFILE)) * 100}%`, background: h === hour ? '#2563eb' : '#cbd5e1', borderRadius: 3 }} />
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }} className="muted"><span>0시</span><span>6시</span><span>12시</span><span>18시</span><span>23시</span></div>
      </div>
    </>
  )
}

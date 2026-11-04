import { useEffect, useState } from 'react'
import Login from './Login.jsx'
import Logo from '../components/Logo.jsx'
import Icon from '../components/Icon.jsx'
import { supabase } from '../lib/supabase.js'
import { DEMO, startDemo, enterDemo, leaveDemoFlag } from '../lib/demo.js'
import { demoTab } from '../lib/store.js'
import { authError } from '../lib/auth.js'

// 이럴 때 쓰세요: 앱을 처음 보는 사람이 바로 이해하도록 상황 3개 + 기사님
const MOMENTS = [
  ['train', 'KTX로 오송역에 내렸을 때', '시내 가는 손님과 돌아가는 택시를 이어요'],
  ['bus', '막차가 끊긴 밤', '같은 방향끼리 나눠 타요'],
  ['users', '오창·오송 출퇴근', '매일 같은 시간, 같은 방향끼리'],
]

export default function Welcome({ onBrowse, onDemo }) {
  const [busy, setBusy] = useState(null)
  const [err, setErr] = useState(null)

  // 체험 버튼 → 탭을 체험 전용으로 다시 연 뒤 여기서 로그인
  useEffect(() => {
    const d = DEMO.find((x) => x.key === demoTab)
    if (!d || !supabase) return
    setBusy(d.key)
    startDemo(d)
      .then((r) => {
        if (!r.error) return onDemo(r.profile)
        leaveDemoFlag(); setErr(authError(r.error))
      })
      .catch(() => { leaveDemoFlag(); setErr('인터넷 연결을 확인하고 다시 시도해 주세요.') })
      .finally(() => setBusy(null))
  }, [])

  return (
    <div className="welcome">
      <div className="welcome-top">
        <Logo size={40} light />
        <h1>빈 차로 돌아가는 택시,<br />시내 가는 손님과 잇다</h1>
        <p>택시 앱과 함께 쓰는 할증 도우미 · 오송·오창 35% 할증을 줄여요</p>
      </div>

      <div className="welcome-body">
        <p className="label section-label">이럴 때 쓰세요</p>
        <div className="moments">
          {MOMENTS.map(([icon, t, d]) => (
            <div key={t} className="moment">
              <span className="ibadge"><Icon name={icon} size={18} /></span>
              <div><b>{t}</b><span>{d}</span></div>
            </div>
          ))}
          <button className="moment driver" onClick={() => onBrowse('driver')}>
            <span className="ibadge amber"><Icon name="car" size={18} /></span>
            <div><b>기사님이라면</b><span>돌아갈 때 태울 손님 확인 ›</span></div>
          </button>
        </div>

        {supabase && (
          <div className="card demo-card">
            <p className="card-title">바로 체험하기 <small>시연용 계정</small></p>
            <div className="grid2" style={{ marginBottom: 0 }}>
              {DEMO.map((d) => (
                <button key={d.key} className="demo-btn" disabled={!!busy} onClick={() => enterDemo(d.key)}>
                  <b>체험 계정 {d.key}</b>
                  <span>{busy === d.key ? '들어가는 중…' : `${d.role} · ${d.nickname}`}</span>
                </button>
              ))}
            </div>
            <p className="sub" style={{ marginTop: 8 }}>탭 두 개나 휴대폰 두 대에서 A·B로 모집과 참여를 해 보세요. 탭을 닫거나 30분 동안 쓰지 않으면 로그아웃되고, 기록은 다음에 들어올 때 지워져요.</p>
            {err && <p className="form-msg bad" style={{ marginTop: 10, marginBottom: 0 }}>{err}</p>}
          </div>
        )}
        <Login />
        <button className="more" style={{ width: '100%' }} onClick={() => onBrowse('ride')}>로그인 없이 둘러보기</button>
      </div>
    </div>
  )
}

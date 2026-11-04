import { useState } from 'react'
import Login from './Login.jsx'
import Logo from '../components/Logo.jsx'
import Icon from '../components/Icon.jsx'
import HeroArt from '../components/HeroArt.jsx'
import { supabase } from '../lib/supabase.js'
import { DEMO, startDemo } from '../lib/demo.js'
import { authError } from '../lib/auth.js'

// 이럴 때 쓰세요: 앱을 처음 보는 사람이 바로 이해하도록 상황 3개 + 기사님
const MOMENTS = [
  ['train', 'KTX로 오송역에 내렸을 때', '시내 가는 손님과 돌아가는 택시를 이어요'],
  ['moon', '막차가 끊긴 밤', '같은 방향끼리 나눠 타요'],
  ['work', '오창·오송 출퇴근', '매일 같은 시간, 같은 방향끼리'],
]

export default function Welcome({ onBrowse, onDemo, onAbout }) {
  const [busy, setBusy] = useState(null)
  const [err, setErr] = useState(null)

  const demo = async (d) => {
    setBusy(d.key); setErr(null)
    try {
      const r = await startDemo(d)
      if (r.error) setErr(authError(r.error))
      else onDemo(r.profile)
    } catch { setErr('인터넷 연결을 확인하고 다시 시도해 주세요.') }
    finally { setBusy(null) }
  }

  return (
    <div className="welcome">
      <section className="hero-tile">
        <Logo size={44} light sub />
        <h1>빈 차로 돌아가는 택시,<br />시내 가는 손님과 잇다</h1>
        <p>택시 앱과 함께 쓰는 할증 도우미.<br />오송·오창 35% 할증을 줄여요.</p>
        <div className="hero-cta">
          <button className="btn" onClick={() => onBrowse('ride')}>로그인 없이 둘러보기</button>
          <button className="btn secondary on-dark" onClick={onAbout}>쉐어택 알아보기</button>
        </div>
        <HeroArt />
      </section>

      <div className="welcome-body">
        <p className="group-label">이럴 때 쓰세요</p>
        <div className="group">
          {MOMENTS.map(([icon, t, d]) => (
            <div key={t} className="cell with-icon">
              <span className="cell-icon"><Icon name={icon} size={18} /></span>
              <span className="grow"><b>{t}</b><small>{d}</small></span>
            </div>
          ))}
          <button className="cell with-icon" onClick={() => onBrowse('driver')}>
            <span className="cell-icon ink"><Icon name="car" size={18} /></span>
            <span className="grow"><b>기사님이라면</b><small>돌아갈 때 태울 손님 확인</small></span>
            <span className="chev"><Icon name="chevron" size={18} /></span>
          </button>
        </div>

        {supabase && (
          <>
            <p className="group-label">바로 체험하기 · 시연용 계정</p>
            <div className="card tight">
              <div className="demo-grid">
                {DEMO.map((d) => (
                  <button key={d.key} className="utility" disabled={!!busy} onClick={() => demo(d)}>
                    <span className="u-badge">{d.key}</span>
                    <b>체험 계정 {d.key}</b>
                    <span>{busy === d.key ? '들어가는 중…' : <>{d.role}<br />{d.nickname}</>}</span>
                  </button>
                ))}
              </div>
              <p className="caption" style={{ marginTop: 12 }}>휴대폰 두 대(또는 일반 창·시크릿 창)에서 A·B로 모집과 참여를 해 보세요.</p>
              {err && <p className="form-msg bad" style={{ marginTop: 10, marginBottom: 0 }}>{err}</p>}
            </div>
          </>
        )}

        <p className="group-label">계정</p>
        <Login />
      </div>

      <footer className="footer">
        <p>시범 서비스 · 실제 결제와 배차는 하지 않아요<br />배차는 등록 호출 플랫폼과 제휴하는 것을 전제로 해요<br />충북대 경영대 캡스톤 · 고경택시</p>
      </footer>
    </div>
  )
}

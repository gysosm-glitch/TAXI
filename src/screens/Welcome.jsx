import { useState } from 'react'
import Login from './Login.jsx'
import Logo from '../components/Logo.jsx'
import Icon from '../components/Icon.jsx'
import { supabase } from '../lib/supabase.js'
import { DEMO, startDemo } from '../lib/demo.js'
import { authError } from '../lib/auth.js'

// 이럴 때 쓰세요: 앱을 처음 보는 사람이 바로 이해하도록 상황 3개 + 기사님
const MOMENTS = [
  ['train', 'KTX로 오송역에 내렸을 때', '시내 가는 사람끼리 모아, 오송에 손님을 내려준 택시와 이어 드려요'],
  ['bus', '막차가 끊긴 밤', '같은 방향 손님과 택시비를 나눠요. 혼자 탈 때보다 절반 이하'],
  ['users', '오창·오송 출퇴근', '산단·바이오단지에서 시내까지, 매일 같은 시간 같은 방향끼리'],
]

export default function Welcome({ onBrowse, onDemo }) {
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
      <div className="welcome-top">
        <Logo size={40} light />
        <h1>빈 차로 돌아가는 택시,<br />시내 가는 손님과 잇다</h1>
        <p>오송·오창의 35% 할증은 택시가 빈 차로 돌아오기 때문이에요. 그 빈자리를 손님으로 채우면 더 싸게, 기사님은 더 벌어요.</p>
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
            <div><b>기사님이라면</b><span>읍·면에 손님을 내린 뒤, 시내로 가는 귀로 손님을 바로 확인하세요 ›</span></div>
          </button>
        </div>

        {supabase && (
          <div className="card demo-card">
            <p className="card-title">바로 체험하기 <small>시연용 계정</small></p>
            <div className="grid2" style={{ marginBottom: 0 }}>
              {DEMO.map((d) => (
                <button key={d.key} className="demo-btn" disabled={!!busy} onClick={() => demo(d)}>
                  <b>체험 계정 {d.key}</b>
                  <span>{busy === d.key ? '들어가는 중…' : `${d.role} · ${d.nickname}`}</span>
                </button>
              ))}
            </div>
            <p className="sub" style={{ marginTop: 8 }}>휴대폰 두 대(또는 일반 창·시크릿 창)에서 A·B로 모집과 참여를 해 보세요.</p>
            {err && <p className="form-msg bad" style={{ marginTop: 10, marginBottom: 0 }}>{err}</p>}
          </div>
        )}
        <Login />
        <button className="more" style={{ width: '100%' }} onClick={() => onBrowse('ride')}>로그인 없이 둘러보기</button>
      </div>
    </div>
  )
}

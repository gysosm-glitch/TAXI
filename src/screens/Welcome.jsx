import { useState } from 'react'
import Login from './Login.jsx'
import { CityScene } from '../components/Illust.jsx'
import { supabase } from '../lib/supabase.js'
import { DEMO, startDemo } from '../lib/demo.js'
import { authError } from '../lib/auth.js'

// 첫 화면: 로그인·회원가입 + 공모전 체험 계정
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
        <div className="logo">같이타</div>
        <h1>빈 차로 돌아가는 택시,<br />시내 가는 손님과 이어요</h1>
        <p>오송·오창의 할증은 빈 차 귀로 때문이에요. 귀로를 채우면 할증의 이유가 사라져요.</p>
        <div className="scene"><CityScene /></div>
      </div>
      <div className="welcome-body">
        {supabase && (
          <div className="card demo-card">
            <p className="card-title">체험해 보기 <small>공모전 시연용</small></p>
            <p className="sub" style={{ marginBottom: 10 }}>두 계정으로 모집과 참여를 직접 해 볼 수 있어요. 휴대폰 두 대나 일반 창·시크릿 창에서 각각 눌러 보세요.</p>
            <div className="grid2" style={{ marginBottom: 0 }}>
              {DEMO.map((d) => (
                <button key={d.key} className="demo-btn" disabled={!!busy} onClick={() => demo(d)}>
                  <b>체험 계정 {d.key}</b>
                  <span>{busy === d.key ? '들어가는 중…' : `${d.role} · ${d.nickname}`}</span>
                </button>
              ))}
            </div>
            {err && <p className="form-msg bad" style={{ marginTop: 10, marginBottom: 0 }}>{err}</p>}
          </div>
        )}
        <Login />
        <button className="more" style={{ width: '100%' }} onClick={onBrowse}>로그인 없이 둘러보기</button>
      </div>
    </div>
  )
}

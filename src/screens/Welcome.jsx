import { useEffect, useState } from 'react'
import Login from './Login.jsx'
import Logo from '../components/Logo.jsx'
import { supabase } from '../lib/supabase.js'
import { DEMO, startDemo, enterDemo, leaveDemoFlag } from '../lib/demo.js'
import { demoTab } from '../lib/store.js'
import { authError } from '../lib/auth.js'

export default function Welcome({ onBrowse, onDemo }) {
  const [busy, setBusy] = useState(!!demoTab)
  const [err, setErr] = useState(null)
  const [emailOpen, setEmailOpen] = useState(false)

  // 시작 버튼을 눌렀거나 전에 쓰던 체험 계정이 있으면 바로 들어간다
  useEffect(() => {
    const d = DEMO.find((x) => x.key === demoTab)
    if (!d || !supabase) return setBusy(false)
    startDemo(d)
      .then((r) => {
        if (!r.error) return onDemo(r.profile)
        leaveDemoFlag(); setErr(authError(r.error))
      })
      .catch(() => { leaveDemoFlag(); setErr('인터넷 연결을 확인하고 다시 시도해 주세요.') })
      .finally(() => setBusy(false))
  }, [])

  return (
    <div className="welcome">
      <div className="welcome-top">
        <Logo size={40} />
        <h1>같은 방향<br />택시비 절반</h1>
        <div className="welcome-chips"><span className="hue-blue">오송역</span><span className="hue-orange">오창</span><span className="hue-violet">터미널</span><span className="hue-pink">충북대</span></div>
      </div>
      <div className="welcome-body">
        {busy ? <p className="sub welcome-busy">들어가는 중</p> : (
          <>
            {supabase && <button className="btn" onClick={() => enterDemo('A')}>시작</button>}
            {err && <p className="form-msg bad" style={{ marginTop: 10 }}>{err}</p>}
            <button className="more" style={{ width: '100%', marginTop: 8 }} onClick={() => onBrowse('ride')}>둘러보기</button>
            {supabase && <button className="more" style={{ width: '100%' }} onClick={() => enterDemo('B')}>체험 계정 B</button>}
            <button className="more" style={{ width: '100%' }} onClick={() => setEmailOpen(!emailOpen)}>이메일 로그인</button>
            {emailOpen && <div style={{ marginTop: 10 }}><Login /></div>}
          </>
        )}
      </div>
    </div>
  )
}

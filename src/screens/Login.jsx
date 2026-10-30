import { useState } from 'react'
import { supabase } from '../lib/supabase.js'

export default function Login({ onLogin }) {
  const [mode, setMode] = useState('main')
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState('')

  const sendLink = async (e) => {
    e.preventDefault()
    if (!supabase) { setMsg('서버 연결 전이라 게스트로 시작합니다.'); return onLogin({ kind: 'guest', name: '게스트' }) }
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } })
    setMsg(error ? `메일 전송 실패: ${error.message}` : '메일함에서 로그인 링크를 눌러 주세요.')
  }

  return (
    <div className="login">
      <div className="logo">🚕</div>
      <h1>같이타 청주</h1>
      <p>오송역·터미널·공항에서<br />같은 방향 손님과 택시를 나눠 타요.<br /><b>복합할증, 같이 타면 n분의 1.</b></p>
      <div className="btns">
        {mode === 'main' && (
          <>
            <button className="cta kakao" onClick={() => setMsg('카카오 로그인은 앱 등록 후 연결됩니다. 이메일이나 둘러보기로 시작해 주세요.')}>
              💬 카카오로 시작하기
            </button>
            <button className="cta dark" onClick={() => setMode('email')}>✉️ 이메일로 시작하기</button>
            <button className="cta ghost" onClick={() => onLogin({ kind: 'guest', name: '게스트' })}>로그인 없이 둘러보기</button>
          </>
        )}
        {mode === 'email' && (
          <form onSubmit={sendLink} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input type="email" required placeholder="학교·회사 이메일 (예: name@chungbuk.ac.kr)" value={email} onChange={(e) => setEmail(e.target.value)} />
            <button className="cta dark" type="submit">로그인 링크 받기</button>
            <button className="cta ghost" type="button" onClick={() => setMode('main')}>뒤로</button>
          </form>
        )}
        {msg && <p style={{ fontSize: 13, textAlign: 'center' }}>{msg}</p>}
      </div>
    </div>
  )
}

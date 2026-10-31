import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { signInWithGoogle, signInWithEmail, signUpWithEmail, authError } from '../lib/auth.js'

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  )
}

export default function Login() {
  const [mode, setMode] = useState('login')      // login | signup
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)

  if (!supabase) return <div className="card"><p className="sub">서버 연결 설정(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)이 필요해요.</p></div>

  const google = async () => {
    setMsg(null)
    const { error } = await signInWithGoogle()
    if (error) setMsg({ bad: true, text: authError(error) })
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!email.includes('@')) return setMsg({ bad: true, text: '이메일 주소를 확인해 주세요.' })
    if (pw.length < 6) return setMsg({ bad: true, text: '비밀번호는 6자 이상이어야 해요.' })
    setBusy(true); setMsg(null)
    const { data, error } = mode === 'signup' ? await signUpWithEmail(email, pw) : await signInWithEmail(email, pw)
    setBusy(false)
    if (error) return setMsg({ bad: true, text: authError(error) })
    if (mode === 'signup' && !data.session) setMsg({ text: `${email}로 가입 확인 메일을 보냈어요. 링크를 누르면 바로 시작할 수 있어요.` })
  }

  return (
    <div className="card">
      <p className="card-title">{mode === 'login' ? '로그인' : '회원가입'}</p>
      <button className="btn social" onClick={google}><GoogleMark /> 구글로 계속하기</button>
      <div className="divider"><span>또는 이메일</span></div>
      <form onSubmit={submit}>
        <label className="field"><span>이메일</span>
          <input type="email" autoComplete="email" placeholder="name@chungbuk.ac.kr" value={email} onChange={(e) => { setEmail(e.target.value); setMsg(null) }} />
        </label>
        <label className="field"><span>비밀번호</span>
          <input type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder="6자 이상" value={pw} onChange={(e) => { setPw(e.target.value); setMsg(null) }} />
        </label>
        {msg && <p className={`form-msg ${msg.bad ? 'bad' : ''}`}>{msg.text}</p>}
        <button className="btn" type="submit" disabled={busy}>{busy ? '잠시만요…' : mode === 'login' ? '로그인' : '가입하기'}</button>
      </form>
      <button className="more" style={{ width: '100%' }} onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMsg(null) }}>
        {mode === 'login' ? '처음이세요? 이메일로 회원가입' : '이미 계정이 있어요. 로그인'}
      </button>
    </div>
  )
}

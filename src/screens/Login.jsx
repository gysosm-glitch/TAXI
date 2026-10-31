import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { signInWithEmail, signUpWithEmail, authError } from '../lib/auth.js'

export default function Login() {
  const [mode, setMode] = useState('login')      // login | signup
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)

  if (!supabase) return <div className="card"><p className="sub">서버 연결 설정(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)이 필요해요.</p></div>

  const submit = async (e) => {
    e.preventDefault()
    if (!email.includes('@')) return setMsg({ bad: true, text: '이메일 주소를 확인해 주세요.' })
    if (pw.length < 6) return setMsg({ bad: true, text: '비밀번호는 6자 이상이어야 해요.' })
    setBusy(true); setMsg(null)
    try {
      const { data, error } = mode === 'signup' ? await signUpWithEmail(email.trim(), pw) : await signInWithEmail(email.trim(), pw)
      if (error) return setMsg({ bad: true, text: authError(error) })
      if (mode === 'signup' && !data.session) setMsg({ text: `${email}로 가입 확인 메일을 보냈어요. 링크를 누른 뒤 이 화면에서 로그인해 주세요.` })
    } catch {
      setMsg({ bad: true, text: '인터넷 연결을 확인하고 다시 시도해 주세요.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card">
      <p className="card-title">{mode === 'login' ? '로그인' : '회원가입'}</p>
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

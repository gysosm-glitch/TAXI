import { useState } from 'react'
import Icon from './components/Icon.jsx'
import Welcome from './screens/Welcome.jsx'
import ProfileForm from './screens/ProfileForm.jsx'
import Home from './screens/Home.jsx'
import Together from './screens/Together.jsx'
import Transit from './screens/Transit.jsx'
import Me from './screens/Me.jsx'
import { useAccount, signOut } from './lib/auth.js'

const TABS = [
  ['home', 'home', '홈'],
  ['together', 'users', '같이타기'],
  ['transit', 'pin', '교통'],
  ['me', 'user', '내 정보'],
]

export default function App() {
  const [tab, setTab] = useState('home')
  const [browsing, setBrowsing] = useState(false)
  const account = useAccount()
  const { session, profile, loading, setProfile } = account

  if (loading) return <div className="shell"><main className="content"><p className="sub">불러오는 중…</p></main></div>

  // 1) 처음 화면: 로그인·회원가입 (둘러보기를 고르면 통과)
  if (!session && !browsing) return <div className="shell"><Welcome onBrowse={() => setBrowsing(true)} /></div>

  // 2) 로그인했지만 가입 정보가 없으면 입력부터
  if (session && !profile) return (
    <div className="shell">
      <main className="content">
        <h1 className="page-title">가입 정보 입력</h1>
        <p className="page-sub">안전한 같이타기를 위해 꼭 필요한 정보만 받아요</p>
        <ProfileForm session={session} profile={null} onSaved={setProfile} />
        <button className="more" style={{ width: '100%' }} onClick={signOut}>다른 계정으로 로그인</button>
      </main>
    </div>
  )

  // 3) 앱 본 화면
  return (
    <div className="shell">
      <main className="content">
        {tab === 'home' && <Home user={profile ? { name: profile.nickname } : null} onGo={setTab} />}
        {tab === 'together' && <Together />}
        {tab === 'transit' && <Transit />}
        {tab === 'me' && <Me account={account} onLogin={() => setBrowsing(false)} />}
      </main>
      <nav className="tabbar">
        {TABS.map(([id, icon, label]) => (
          <button key={id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>
            <Icon name={icon} />{label}
          </button>
        ))}
      </nav>
    </div>
  )
}

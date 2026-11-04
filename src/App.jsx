import { useEffect, useState } from 'react'
import Icon from './components/Icon.jsx'
import { LogoMark } from './components/Logo.jsx'
import Welcome from './screens/Welcome.jsx'
import ProfileForm from './screens/ProfileForm.jsx'
import Ride from './screens/Ride.jsx'
import Driver from './screens/Driver.jsx'
import Me from './screens/Me.jsx'
import About from './screens/About.jsx'
import { useAccount, signOut } from './lib/auth.js'
import { useRideAlerts } from './lib/alerts.js'

const TABS = [
  ['ride', 'taxi', '타기'],
  ['driver', 'car', '기사'],
  ['me', 'user', '내 정보'],
]

export default function App() {
  const [tab, setTab] = useState('ride')
  const [browsing, setBrowsing] = useState(false)
  const [about, setAbout] = useState(false)       // '쉐어택 알아보기' (로그인 전 첫 화면에서도 열 수 있음)
  const account = useAccount()
  const { session, profile, loading, setProfile } = account
  const { toast, close } = useRideAlerts(profile ? session?.user?.id : null)
  // 로그아웃하면 첫 화면(로그인)으로, 타기 탭부터 다시 시작
  useEffect(() => { if (!session) { setBrowsing(false); setTab('ride') } }, [session])
  // 탭을 바꾸면 맨 위부터
  useEffect(() => { document.querySelector('.content')?.scrollTo(0, 0) }, [tab, about])

  if (loading) return (
    <div className="shell" style={{ display: 'grid', placeItems: 'center' }}>
      <div style={{ textAlign: 'center' }}><LogoMark size={72} /><p className="caption" style={{ marginTop: 14 }}>불러오는 중…</p></div>
    </div>
  )

  if (about) return (
    <div className="shell"><main className="content"><About onBack={() => setAbout(false)} backLabel={session || browsing ? '돌아가기' : '처음으로'} /></main></div>
  )

  // 1) 처음 화면: 무엇을 하는 앱인지 + 로그인 (둘러보기·기사 화면 보기로 통과)
  if (!session && !browsing) return (
    <div className="shell">
      <Welcome onBrowse={(t) => { setBrowsing(true); setTab(t ?? 'ride') }} onDemo={(p) => { setProfile(p); setTab('ride') }} onAbout={() => setAbout(true)} />
    </div>
  )

  // 2) 로그인했지만 가입 정보가 없으면 입력부터
  if (session && !profile) return (
    <div className="shell">
      <main className="content">
        <h1 className="large-title">가입 정보</h1>
        <p className="lead-sub">안전하게 같이 타기 위해 꼭 필요한 정보만 받아요</p>
        <ProfileForm session={session} profile={null} onSaved={setProfile} />
        <button className="btn gray" style={{ marginTop: 10 }} onClick={signOut}>다른 계정으로 로그인</button>
      </main>
    </div>
  )

  // 3) 앱 본 화면
  return (
    <div className="shell">
      {toast && (
        <button className="toast" onClick={() => { close(); setTab('ride') }}>
          <LogoMark size={38} />
          <span className="t-text"><b>{toast.title.replace('쉐어택 · ', '')}</b><span>{toast.body}</span></span>
          <small>지금</small>
        </button>
      )}
      <main className={`content ${tab === 'ride' ? 'flush' : ''}`}>
        {tab === 'ride' && <Ride account={account} onLogin={() => setBrowsing(false)} />}
        {tab === 'driver' && <Driver account={account} onLogin={() => setBrowsing(false)} />}
        {tab === 'me' && <Me account={account} onLogin={() => setBrowsing(false)} onAbout={() => setAbout(true)} />}
      </main>
      <nav className="tabbar" aria-label="탭">
        {TABS.map(([id, icon, label]) => (
          <button key={id} className={tab === id ? 'on' : ''} aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)}>
            <Icon name={icon} size={26} stroke={tab === id ? 2.2 : 1.8} />{label}
          </button>
        ))}
      </nav>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase.js'
import { store } from './lib/store.js'
import Login from './screens/Login.jsx'
import Consent from './screens/Consent.jsx'
import Ride from './screens/Ride.jsx'
import Driver from './screens/Driver.jsx'
import Spots from './screens/Spots.jsx'
import My from './screens/My.jsx'

const TABS = [
  ['ride', '🚕', '호출'],
  ['driver', '🧑‍✈️', '기사'],
  ['spots', '📍', '매칭 스팟'],
  ['my', '👤', 'MY'],
]

export default function App() {
  const [user, setUser] = useState(() => store.get('user_v1', null))
  const [consent, setConsent] = useState(() => store.get('consent_v1', null))
  const [tab, setTab] = useState('ride')

  // 이메일 로그인(매직링크)으로 돌아오면 세션을 사용자로 등록
  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      const email = data.session?.user?.email
      if (email && !user) { const u = { kind: 'email', name: email.split('@')[0], email }; store.set('user_v1', u); setUser(u) }
    })
  }, [])

  const logout = async () => {
    if (supabase) await supabase.auth.signOut()
    store.clear(); setUser(null); setConsent(null); setTab('ride')
  }

  if (!user) return <div className="shell"><Login onLogin={(u) => { store.set('user_v1', u); setUser(u) }} /></div>
  if (!consent) return <div className="shell"><Consent onDone={(c) => { store.set('consent_v1', c); setConsent(c) }} /></div>

  return (
    <div className="shell">
      <div className="screen">
        {tab === 'ride' && <Ride user={user} />}
        {tab === 'driver' && <Driver />}
        {tab === 'spots' && <Spots />}
        {tab === 'my' && <My user={user} onLogout={logout} />}
      </div>
      <nav className="bottom-nav">
        {TABS.map(([id, ico, label]) => (
          <button key={id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>
            <span className="ico">{ico}</span>{label}
          </button>
        ))}
      </nav>
    </div>
  )
}

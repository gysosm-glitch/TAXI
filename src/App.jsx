import { useEffect, useState } from 'react'
import Icon from './components/Icon.jsx'
import Home from './screens/Home.jsx'
import Together from './screens/Together.jsx'
import Transit from './screens/Transit.jsx'
import Me from './screens/Me.jsx'
import { useAccount } from './lib/auth.js'

const TABS = [
  ['home', 'home', '홈'],
  ['together', 'users', '같이타기'],
  ['transit', 'pin', '교통'],
  ['me', 'user', '내 정보'],
]

export default function App() {
  const [tab, setTab] = useState('home')
  const account = useAccount()
  // 로그인했는데 가입 정보가 없으면 내 정보 탭에서 입력하게 안내
  useEffect(() => { if (account.session && !account.loading && !account.profile) setTab('me') }, [account.session, account.loading, account.profile])
  return (
    <div className="shell">
      <main className="content">
        {tab === 'home' && <Home user={account.profile ? { name: account.profile.nickname } : null} onGo={setTab} />}
        {tab === 'together' && <Together />}
        {tab === 'transit' && <Transit />}
        {tab === 'me' && <Me account={account} />}
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

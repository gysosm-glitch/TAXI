import { useState } from 'react'
import Icon from './components/Icon.jsx'
import Home from './screens/Home.jsx'
import Together from './screens/Together.jsx'
import Transit from './screens/Transit.jsx'
import Me from './screens/Me.jsx'

const TABS = [
  ['home', 'home', '홈'],
  ['together', 'users', '같이타기'],
  ['transit', 'pin', '교통'],
  ['me', 'user', '내 정보'],
]

export default function App() {
  const [tab, setTab] = useState('home')
  return (
    <div className="shell">
      <main className="content">
        {tab === 'home' && <Home user={null} onGo={setTab} />}
        {tab === 'together' && <Together />}
        {tab === 'transit' && <Transit />}
        {tab === 'me' && <Me />}
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

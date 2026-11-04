import { useEffect, useState } from 'react'
import Icon from '../components/Icon.jsx'
import ProfileForm from './ProfileForm.jsx'
import { FIELDS, NOT_COLLECTED, RULES } from '../privacy.js'
import { signOut, deleteProfile } from '../lib/auth.js'
import { myTripsThisMonth } from '../lib/rides.js'
import { store, demoTab } from '../lib/store.js'
import { resetDemo } from '../lib/demo.js'
import { won } from '../data.js'

const AGE = { '10s': '10대', '20s': '20대', '30s': '30대', '40s': '40대', '50s+': '50대 이상' }

function Guide() {
  const [open, setOpen] = useState(null)
  const Item = (f) => (
    <div key={f.item} className="info-item" onClick={() => setOpen(open === f.item ? null : f.item)} style={{ cursor: 'pointer' }}>
      <div className="top"><span>{f.item}</span><span className="tag gray">{f.shown.startsWith('동승자에게 공개') ? '동승자에게 보임' : f.shown.startsWith('공개 안 함') ? '비공개' : '일부 공개'}</span></div>
      {open === f.item && <p>{f.why}<br />보관: {f.keep}{f.law !== '-' ? ` · 근거: ${f.law}` : ''}</p>}
    </div>
  )
  return (
    <>
      <div className="card">
        <p className="card-title">같이타기 기준</p>
        {RULES.map(([k, v]) => <div key={k} className="row-item"><span>{k}</span><span className="sub" style={{ textAlign: 'right', maxWidth: '65%' }}>{v}</span></div>)}
      </div>
      <div className="card">
        <p className="card-title">받는 정보 <small>눌러서 이유 보기</small></p>
        {FIELDS.map(Item)}
      </div>
      <div className="card">
        <p className="card-title"><span><Icon name="shield" size={18} /> 받지 않는 정보</span></p>
        {NOT_COLLECTED.map((x) => <div key={x} className="row-item"><span>{x}</span></div>)}
      </div>
    </>
  )
}

const GOAL = 50000
function savedLocal() {
  try {
    const m = new Date().toISOString().slice(0, 7)
    const mine = (JSON.parse(store.getItem('history_v1')) ?? []).filter((h) => h.at?.startsWith(m))
    return { won: mine.reduce((a, h) => a + (h.saving || 0), 0), count: mine.length }
  } catch { return { won: 0, count: 0 } }
}

// 시연 모집은 서버에 쌓지 않으므로 이 기기 기록에서 더한다
function savedDemo() {
  try {
    const m = new Date().toISOString().slice(0, 7)
    const mine = (JSON.parse(store.getItem('history_v1')) ?? []).filter((h) => h.virtual && h.at?.startsWith(m))
    return { won: mine.reduce((a, h) => a + (h.saving || 0), 0), count: mine.length }
  } catch { return { won: 0, count: 0 } }
}

function Ring({ ratio }) {
  const c = 2 * Math.PI * 31
  return (
    <svg width="78" height="78" viewBox="0 0 76 76" aria-hidden="true">
      <circle cx="38" cy="38" r="31" fill="none" stroke="var(--teal-soft)" strokeWidth="9" />
      <circle cx="38" cy="38" r="31" fill="none" stroke="var(--teal)" strokeWidth="9" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(1, ratio))} transform="rotate(-90 38 38)" />
      <text x="38" y="43" textAnchor="middle" fontSize="15" fontWeight="700" fill="var(--teal)">{Math.round(ratio * 100)}%</text>
    </svg>
  )
}

// 이번 달 아낀 돈
function Savings({ userId }) {
  const [server, setServer] = useState(null)
  useEffect(() => {
    if (userId) myTripsThisMonth(userId).then((t) => t && setServer({ won: t.reduce((a, x) => a + x.saving, 0), count: t.length }))
  }, [userId])
  const saved = server ? { won: server.won + savedDemo().won, count: server.count + savedDemo().count } : savedLocal()
  return (
    <div className="card ring-card">
      <Ring ratio={saved.won / GOAL} />
      <div>
        <p className="label">이번 달 아낀 돈</p>
        <p className="big">{won(saved.won)}</p>
        <p className="sub">{saved.count ? `${saved.count}회 · 목표 ${won(GOAL)}` : '같이 타면 쌓여요'}</p>
      </div>
    </div>
  )
}

export default function Me({ account, onLogin }) {
  const { session, profile, loading, setProfile } = account
  const [confirmDel, setConfirmDel] = useState(false)

  if (loading) return <p className="sub">불러오는 중…</p>

  // 1) 둘러보기 중 (로그인 전)
  if (!session) return (
    <>
      <h1 className="page-title">내 정보</h1>
      <p className="page-sub">가입하면 모집을 열거나 참여할 수 있어요</p>
      <button className="btn" style={{ marginBottom: 12 }} onClick={onLogin}>로그인 · 회원가입</button>
      <Savings />
      <details className="guide-more"><summary>이용 기준·개인정보</summary><Guide /></details>
    </>
  )

  // 2) 로그인했지만 가입 정보가 없음 → 가입 정보 입력
  if (!profile) return (
    <>
      <h1 className="page-title">가입 정보 입력</h1>
      <p className="page-sub">안전하게 같이 타기 위해 꼭 필요한 정보만 받아요</p>
      <ProfileForm session={session} profile={profile} onSaved={setProfile} onCancel={null} />
      <button className="more" style={{ width: '100%' }} onClick={signOut}>다른 계정으로 로그인</button>
    </>
  )

  // 3) 가입 완료
  return (
    <>
      <div className="page-head">
        <h1 className="page-title">내 정보</h1>
        <button className="logout-btn" onClick={signOut}>로그아웃</button>
      </div>
      <p className="page-sub">{session.user.email}{session.user.email?.startsWith('demo.') ? ' · 시연 계정' : ''}</p>
      <div className="card ring-card">
        <div className="avatar" style={{ width: 52, height: 52, fontSize: 20 }}>{profile.nickname.slice(0, 1)}</div>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 18 }}>{profile.nickname}</p>
          <p className="sub">{profile.gender === 'F' ? '여성' : '남성'}{profile.age_group ? ` · ${AGE[profile.age_group]}` : ''}</p>
        </div>
      </div>
      <Savings userId={session.user.id} />
      <div className="card">
        <div className="row-item" style={{ cursor: 'pointer' }} onClick={signOut}><span>로그아웃</span><span className="r">›</span></div>
        {demoTab
          ? <div className="row-item" style={{ cursor: 'pointer' }} onClick={resetDemo}><span>시연 초기화</span><span className="r">›</span></div>
          : <div className="row-item" style={{ cursor: 'pointer' }} onClick={() => setConfirmDel(true)}><span className="bad">탈퇴 · 정보 삭제</span><span className="r off">›</span></div>}
        {confirmDel && (
          <div className="detail">
            가입 정보가 바로 삭제돼요.
            <div className="grid2" style={{ marginTop: 8, marginBottom: 0 }}>
              <button className="btn ghost" onClick={() => setConfirmDel(false)}>취소</button>
              <button className="btn danger" onClick={async () => { await deleteProfile(session.user.id); await signOut() }}>삭제</button>
            </div>
          </div>
        )}
      </div>
      <details className="guide-more"><summary>이용 기준·개인정보</summary><Guide /></details>
    </>
  )
}

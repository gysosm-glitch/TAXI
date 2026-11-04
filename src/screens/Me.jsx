import { useEffect, useState } from 'react'
import Icon from '../components/Icon.jsx'
import ProfileForm from './ProfileForm.jsx'
import { FIELDS, NOT_COLLECTED, RULES } from '../privacy.js'
import { signOut, deleteProfile } from '../lib/auth.js'
import { getMyRating, sendFeedback, getStats, myTripsThisMonth } from '../lib/rides.js'
import { supabase } from '../lib/supabase.js'
import { won } from '../data.js'

const AGE = { '10s': '10대', '20s': '20대', '30s': '30대', '40s': '40대', '50s+': '50대 이상' }
const mask = (p) => p.replace(/^(\d{3})-?(\d{3,4})-?(\d{4})$/, '$1-****-$3')

// iOS식 하위 화면 머리말 (뒤로)
export function NavBar({ title, back = '내 정보', onBack }) {
  return (
    <div className="nav-bar">
      <button className="nav-back" onClick={onBack}><Icon name="back" size={22} />{back}</button>
      <h1>{title}</h1>
      <span />
    </div>
  )
}

// 같이타기 기준 · 받는 정보 · 받지 않는 정보
function PrivacyPage({ onBack }) {
  const [open, setOpen] = useState(null)
  return (
    <>
      <NavBar title="안전 · 개인정보" onBack={onBack} />
      <h1 className="large-title">안전 · 개인정보</h1>
      <p className="lead-sub">처음 보는 사람과 타도 안심할 수 있게, 꼭 필요한 정보만 받아요.</p>

      <p className="group-label">같이타기 기준</p>
      <div className="group">
        {RULES.map(([k, v]) => (
          <div key={k} className="cell"><span className="grow"><b>{k}</b><small>{v}</small></span></div>
        ))}
      </div>

      <p className="group-label">받는 정보 · 눌러서 이유 보기</p>
      <div className="group">
        {FIELDS.map((f) => (
          <div key={f.item} className="cell-wrap">
            <button className="cell" onClick={() => setOpen(open === f.item ? null : f.item)} aria-expanded={open === f.item}>
              <span className="grow"><b style={{ fontWeight: 400 }}>{f.item}</b><small>{f.need}</small></span>
              <span className={`tag ${f.shown.startsWith('동승자에게 공개') ? 'blue' : ''}`}>{f.shown.startsWith('동승자에게 공개') ? '동승자에게 보임' : f.shown.startsWith('공개 안 함') ? '비공개' : '일부 공개'}</span>
            </button>
            {open === f.item && <p className="info-detail">{f.why}<br />보관: {f.keep}{f.law !== '-' ? ` · 근거: ${f.law}` : ''}</p>}
          </div>
        ))}
      </div>

      <p className="group-label">받지 않는 정보</p>
      <div className="group">
        {NOT_COLLECTED.map((x) => <div key={x} className="cell with-icon"><span className="cell-icon gray"><Icon name="shield" size={18} /></span><span className="grow"><b style={{ fontWeight: 400 }}>{x}</b></span></div>)}
      </div>
      <p className="group-foot">본인 정보는 본인만 보고 고칠 수 있어요(DB 보안 규칙). 탈퇴하면 바로 지워요.</p>
    </>
  )
}

const GOAL = 50000
function savedLocal() {
  try {
    const m = new Date().toISOString().slice(0, 7)
    const mine = (JSON.parse(localStorage.getItem('history_v1')) ?? []).filter((h) => h.at?.startsWith(m))
    return { won: mine.reduce((a, h) => a + (h.saving || 0), 0), count: mine.length }
  } catch { return { won: 0, count: 0 } }
}

function Ring({ ratio }) {
  const c = 2 * Math.PI * 31
  return (
    <svg width="80" height="80" viewBox="0 0 76 76" aria-hidden="true" style={{ flex: 'none' }}>
      <circle cx="38" cy="38" r="31" fill="none" stroke="var(--fill)" strokeWidth="8" />
      <circle cx="38" cy="38" r="31" fill="none" stroke="var(--primary)" strokeWidth="8" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(1, ratio))} transform="rotate(-90 38 38)" />
      <text x="38" y="43" textAnchor="middle" fontSize="15" fontWeight="700" fill="var(--ink)">{Math.round(ratio * 100)}%</text>
    </svg>
  )
}

// 이번 달 아낀 돈 + 시범 운영 현황
function Savings({ userId }) {
  const [server, setServer] = useState(null)
  const [stats, setStats] = useState(null)
  useEffect(() => {
    if (userId) myTripsThisMonth(userId).then((t) => t && setServer({ won: t.reduce((a, x) => a + x.saving, 0), count: t.length }))
    if (supabase) getStats().then(setStats)
  }, [userId])
  const saved = server ?? savedLocal()
  return (
    <>
      <div className="card ring-card">
        <Ring ratio={saved.won / GOAL} />
        <div>
          <p className="caption">이번 달 아낀 돈</p>
          <p className="big">{won(saved.won)}</p>
          <p className="caption">{saved.count ? `같이 탄 횟수 ${saved.count}회 · 목표 ${won(GOAL)}` : '같이 타면 할증 붙는 요금도 나눠 내요'}</p>
        </div>
      </div>
      {stats && (
        <div className="card">
          <p className="card-title">시범 운영 현황 <small>참여자 전체</small></p>
          <div className="stat-grid">
            <div><b>{stats.members}</b><span>가입</span></div>
            <div><b>{stats.rides}</b><span>모집</span></div>
            <div><b>{stats.matched}</b><span>매칭 성공</span></div>
            <div><b>{stats.saving >= 10000 ? `${(stats.saving / 10000).toFixed(1)}만` : stats.saving.toLocaleString()}</b><span>아낀 돈(원)</span></div>
          </div>
        </div>
      )}
    </>
  )
}

function Feedback({ userId }) {
  const [text, setText] = useState('')
  const [msg, setMsg] = useState(null)
  const send = async () => {
    if (text.trim().length < 2) return setMsg({ bad: true, text: '두 글자 이상 적어 주세요.' })
    const { error } = await sendFeedback(text.trim(), userId)
    if (error) return setMsg({ bad: true, text: '보내지 못했어요. 잠시 후 다시 시도해 주세요.' })
    setText(''); setMsg({ text: '고마워요! 다음 개선에 반영할게요.' })
  }
  return (
    <>
      <p className="group-label">의견 보내기 · 시범 운영</p>
      <div className="card">
        <textarea className="fb" rows={3} maxLength={1000} placeholder="불편했던 점, 있었으면 하는 기능을 적어 주세요" value={text} onChange={(e) => { setText(e.target.value); setMsg(null) }} aria-label="의견" />
        {msg && <p className={`form-msg ${msg.bad ? 'bad' : ''}`} style={{ marginTop: 10, marginBottom: 0 }}>{msg.text}</p>}
        <button className="btn" style={{ marginTop: 12 }} onClick={send}>보내기</button>
      </div>
    </>
  )
}

// 쉐어택 알아보기 · 안전과 개인정보 (모든 상태에서 같은 자리)
function InfoLinks({ onAbout, onPrivacy }) {
  return (
    <div className="group">
      <button className="cell with-icon" onClick={onAbout}>
        <span className="cell-icon"><Icon name="sparkle" size={18} /></span>
        <span className="grow"><b>쉐어택 알아보기</b><small>할증을 없애는 방법 · 근거 데이터</small></span>
        <span className="chev"><Icon name="chevron" size={18} /></span>
      </button>
      <button className="cell with-icon" onClick={onPrivacy}>
        <span className="cell-icon gray"><Icon name="shield" size={18} /></span>
        <span className="grow"><b>안전 · 개인정보</b><small>같이타기 기준, 받는 정보와 이유</small></span>
        <span className="chev"><Icon name="chevron" size={18} /></span>
      </button>
    </div>
  )
}

export default function Me({ account, onLogin, onAbout }) {
  const { session, profile, loading, setProfile } = account
  const [editing, setEditing] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const [rate, setRate] = useState(null)
  const [page, setPage] = useState(null)        // 'privacy'
  useEffect(() => { if (session && profile) getMyRating(session.user.id).then(setRate) }, [session, profile])
  useEffect(() => { document.querySelector('.content')?.scrollTo(0, 0) }, [page, editing])

  if (loading) return <p className="caption">불러오는 중…</p>
  if (page === 'privacy') return <PrivacyPage onBack={() => setPage(null)} />

  // 1) 둘러보기 중 (로그인 전)
  if (!session) return (
    <>
      <h1 className="large-title" style={{ marginTop: 44 }}>내 정보</h1>
      <p className="lead-sub">가입하면 모집을 열거나 참여할 수 있어요</p>
      <button className="btn" style={{ marginBottom: 20 }} onClick={onLogin}>로그인 · 회원가입</button>
      <Savings />
      <InfoLinks onAbout={onAbout} onPrivacy={() => setPage('privacy')} />
      <Feedback />
    </>
  )

  // 2) 로그인했지만 가입 정보가 없음 → 가입 정보 입력
  if (!profile || editing) return (
    <>
      {profile && <NavBar title="정보 수정" onBack={() => setEditing(false)} />}
      <h1 className="large-title" style={profile ? undefined : { marginTop: 44 }}>{profile ? '정보 수정' : '가입 정보'}</h1>
      <p className="lead-sub">안전하게 같이 타기 위해 꼭 필요한 정보만 받아요</p>
      <ProfileForm session={session} profile={profile} onSaved={(p) => { setProfile(p); setEditing(false) }} onCancel={profile ? () => setEditing(false) : null} />
      {!profile && <button className="btn gray" style={{ marginTop: 10 }} onClick={signOut}>다른 계정으로 로그인</button>}
    </>
  )

  // 3) 가입 완료
  return (
    <>
      <div className="nav-top"><span /><button className="text-btn" onClick={signOut}>로그아웃</button></div>
      <h1 className="large-title">내 정보</h1>
      <p className="lead-sub">{session.user.email}{session.user.email?.startsWith('demo.') ? ' · 체험 계정' : ''}</p>

      <div className="group">
        <button className="profile-cell cell" onClick={() => setEditing(true)}>
          <span className="avatar">{profile.nickname.slice(0, 1)}</span>
          <span className="grow">
            <span className="name">{profile.nickname}</span>
            <small style={{ display: 'block', fontSize: 15, color: 'var(--ink-48)' }}>{profile.gender === 'F' ? '여성' : '남성'}{profile.age_group ? ` · ${AGE[profile.age_group]}` : ''}</small>
            <span className="tags">
              <span className="tag">본인확인 예정</span>
              {rate && <span className="tag blue">★ {rate.count ? `${rate.avg} (${rate.count}회 평가)` : '아직 평가 없음'}</span>}
              {profile.org_email && <span className="tag">{profile.org_email.split('@')[1]} 인증 예정</span>}
            </span>
          </span>
          <span className="chev"><Icon name="chevron" size={18} /></span>
        </button>
      </div>

      <Savings userId={session.user.id} />
      <InfoLinks onAbout={onAbout} onPrivacy={() => setPage('privacy')} />

      <p className="group-label">계정</p>
      <div className="group">
        <div className="cell"><span className="grow">휴대폰</span><span className="value">{mask(profile.phone)}</span></div>
        <div className="cell"><span className="grow">혜택 알림</span><span className="value">{profile.agree_marketing ? '받음' : '받지 않음'}</span></div>
        <button className="cell" onClick={() => setEditing(true)}><span className="grow">정보 수정</span><span className="chev"><Icon name="chevron" size={18} /></span></button>
        <button className="cell link" onClick={signOut}><span className="grow">로그아웃</span></button>
        <button className="cell danger" onClick={() => setConfirmDel(true)}><span className="grow">탈퇴 · 정보 삭제</span></button>
      </div>
      {confirmDel && (
        <div className="card">
          <p className="card-title">가입 정보를 삭제할까요?</p>
          <p className="caption">가입 정보가 바로 삭제되고 되돌릴 수 없어요.</p>
          <div className="btn-row">
            <button className="btn gray" onClick={() => setConfirmDel(false)}>취소</button>
            <button className="btn danger" onClick={async () => { await deleteProfile(session.user.id); await signOut() }}>삭제</button>
          </div>
        </div>
      )}
      <Feedback userId={session.user.id} />
    </>
  )
}

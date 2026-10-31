import { useState } from 'react'
import Icon from '../components/Icon.jsx'
import ProfileForm from './ProfileForm.jsx'
import { FIELDS, NOT_COLLECTED, RULES } from '../privacy.js'
import { signOut, deleteProfile } from '../lib/auth.js'

const AGE = { '10s': '10대', '20s': '20대', '30s': '30대', '40s': '40대', '50s+': '50대 이상' }
const mask = (p) => p.replace(/^(\d{3})-?(\d{3,4})-?(\d{4})$/, '$1-****-$3')

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

export default function Me({ account, onLogin }) {
  const { session, profile, loading, setProfile } = account
  const [editing, setEditing] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)

  if (loading) return <p className="sub">불러오는 중…</p>

  // 1) 둘러보기 중 (로그인 전)
  if (!session) return (
    <>
      <h1 className="page-title">내 정보</h1>
      <p className="page-sub">가입하면 같이타기 모집·참여를 할 수 있어요</p>
      <button className="btn" style={{ marginBottom: 12 }} onClick={onLogin}>로그인 · 회원가입</button>
      <Guide />
    </>
  )

  // 2) 로그인했지만 가입 정보가 없음 → 가입 정보 입력
  if (!profile || editing) return (
    <>
      <h1 className="page-title">{profile ? '정보 수정' : '가입 정보 입력'}</h1>
      <p className="page-sub">안전한 같이타기를 위해 꼭 필요한 정보만 받아요</p>
      <ProfileForm session={session} profile={profile} onSaved={(p) => { setProfile(p); setEditing(false) }} onCancel={profile ? () => setEditing(false) : null} />
      {!profile && <button className="more" style={{ width: '100%' }} onClick={signOut}>다른 계정으로 로그인</button>}
    </>
  )

  // 3) 가입 완료
  return (
    <>
      <h1 className="page-title">내 정보</h1>
      <p className="page-sub">{session.user.email}</p>
      <div className="card ring-card">
        <div className="avatar" style={{ width: 52, height: 52, fontSize: 20 }}>{profile.nickname.slice(0, 1)}</div>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 18 }}>{profile.nickname}</p>
          <p className="sub">{profile.gender === 'F' ? '여성' : '남성'}{profile.age_group ? ` · ${AGE[profile.age_group]}` : ''}</p>
          <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
            <span className="tag">본인확인 예정</span>
            {profile.org_email && <span className="tag">{profile.org_email.split('@')[1]} 인증 예정</span>}
          </div>
        </div>
      </div>
      <div className="card">
        <div className="row-item"><span>휴대폰</span><span className="r off">{mask(profile.phone)}</span></div>
        <div className="row-item"><span>혜택 알림</span><span className="r off">{profile.agree_marketing ? '받음' : '받지 않음'}</span></div>
        <div className="row-item" style={{ cursor: 'pointer' }} onClick={() => setEditing(true)}><span>정보 수정</span><span className="r">›</span></div>
        <div className="row-item" style={{ cursor: 'pointer' }} onClick={signOut}><span>로그아웃</span><span className="r">›</span></div>
        <div className="row-item" style={{ cursor: 'pointer' }} onClick={() => setConfirmDel(true)}><span className="bad">탈퇴 · 정보 삭제</span><span className="r off">›</span></div>
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
      <Guide />
    </>
  )
}

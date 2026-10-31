import { useState } from 'react'
import Icon from '../components/Icon.jsx'
import { FIELDS, NOT_COLLECTED, RULES } from '../privacy.js'

export default function Me() {
  const [open, setOpen] = useState(null)
  const required = FIELDS.filter((f) => f.need.startsWith('필수'))
  const optional = FIELDS.filter((f) => !f.need.startsWith('필수'))

  const Item = (f) => (
    <div key={f.item} className="info-item" onClick={() => setOpen(open === f.item ? null : f.item)} style={{ cursor: 'pointer' }}>
      <div className="top"><span>{f.item}</span><span className="tag gray">{f.shown.startsWith('동승자에게 공개') ? '동승자에게 보임' : f.shown.startsWith('공개 안 함') ? '비공개' : '일부 공개'}</span></div>
      {open === f.item && <p>{f.why}<br />보관: {f.keep}{f.law !== '-' ? ` · 근거: ${f.law}` : ''}</p>}
    </div>
  )

  return (
    <>
      <h1 className="page-title">내 정보</h1>
      <p className="page-sub">안전하게 같이 타기 위한 정보만 받아요</p>

      <div className="card ring-card">
        <div className="avatar" style={{ width: 52, height: 52 }}><Icon name="user" /></div>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 17 }}>로그인이 필요해요</p>
          <p className="sub">구글·이메일 회원가입은 다음 단계에서 열려요</p>
        </div>
      </div>

      <div className="card">
        <p className="card-title">같이타기 기준</p>
        {RULES.map(([k, v]) => <div key={k} className="row-item"><span>{k}</span><span className="sub" style={{ textAlign: 'right', maxWidth: '65%' }}>{v}</span></div>)}
      </div>

      <div className="card">
        <p className="card-title">가입할 때 받는 정보 <small>눌러서 이유 보기</small></p>
        {required.map(Item)}
      </div>

      <div className="card">
        <p className="card-title">선택 정보</p>
        {optional.map(Item)}
      </div>

      <div className="card">
        <p className="card-title"><span><Icon name="shield" size={18} /> 받지 않는 정보</span></p>
        {NOT_COLLECTED.map((x) => <div key={x} className="row-item"><span>{x}</span></div>)}
      </div>
    </>
  )
}

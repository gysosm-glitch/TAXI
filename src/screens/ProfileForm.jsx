import { useState } from 'react'
import { CONSENTS } from '../privacy.js'
import { saveProfile, authError } from '../lib/auth.js'

const AGES = [['20s', '20대'], ['30s', '30대'], ['40s', '40대'], ['50s+', '50대 이상'], ['10s', '10대']]

// 가입 정보 입력 (처음 로그인 후 1회, 이후 수정에도 사용)
export default function ProfileForm({ session, profile, onSaved, onCancel }) {
  const [f, setF] = useState(() => ({
    nickname: profile?.nickname ?? '', gender: profile?.gender ?? '', phone: profile?.phone ?? '',
    age_group: profile?.age_group ?? '', org_email: profile?.org_email ?? '',
    ...Object.fromEntries(CONSENTS.map((c) => [c.id, profile?.[c.id] ?? false])),
  }))
  const [errs, setErrs] = useState({})
  const [open, setOpen] = useState(null)
  const [busy, setBusy] = useState(false)
  const set = (k, v) => { setF({ ...f, [k]: v }); setErrs({ ...errs, [k]: null, form: null }) }

  const validate = () => {
    const e = {}
    if (f.nickname.trim().length < 2 || f.nickname.trim().length > 12) e.nickname = '닉네임은 2~12자로 정해 주세요.'
    if (!f.gender) e.gender = '성별을 골라 주세요. 같은 성별끼리만 매칭돼요.'
    if (!/^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/.test(f.phone.trim())) e.phone = '휴대폰 번호를 010-1234-5678 형식으로 입력해 주세요.'
    if (f.org_email && !f.org_email.includes('@')) e.org_email = '이메일 주소를 확인해 주세요.'
    if (!CONSENTS.filter((c) => c.required).every((c) => f[c.id])) e.consent = '필수 항목에 모두 동의해 주세요.'
    return e
  }

  const submit = async (ev) => {
    ev.preventDefault()
    const e = validate()
    setErrs(e)
    if (Object.keys(e).length) return
    setBusy(true)
    const { data, error } = await saveProfile(session.user.id, {
      ...f, nickname: f.nickname.trim(), phone: f.phone.trim(), age_group: f.age_group || null, org_email: f.org_email.trim() || null,
    })
    setBusy(false)
    if (error) return setErrs({ form: authError(error) })
    onSaved(data)
  }

  const allOn = CONSENTS.every((c) => f[c.id])

  return (
    <form onSubmit={submit}>
      <div className="card">
        <p className="card-title">{profile ? '정보 수정' : '거의 다 됐어요'} <small>{session.user.email}</small></p>
        <label className="field"><span>닉네임 <b className="req">*</b></span>
          <input value={f.nickname} maxLength={12} placeholder="동승자에게 보이는 이름" onChange={(e) => set('nickname', e.target.value)} />
          {errs.nickname && <em className="err">{errs.nickname}</em>}
        </label>
        <div className="field"><span>성별 <b className="req">*</b></span>
          <div className="seg">
            {[['F', '여성'], ['M', '남성']].map(([v, l]) => <button type="button" key={v} className={f.gender === v ? 'on' : ''} onClick={() => set('gender', v)}>{l}</button>)}
          </div>
          {errs.gender && <em className="err">{errs.gender}</em>}
        </div>
        <label className="field"><span>휴대폰 번호 <b className="req">*</b></span>
          <input type="tel" inputMode="numeric" placeholder="010-1234-5678" value={f.phone} onChange={(e) => set('phone', e.target.value)} />
          <small className="hint">동승자에게는 보이지 않아요. 정식 서비스에서는 문자 인증과 안심번호로 연결돼요.</small>
          {errs.phone && <em className="err">{errs.phone}</em>}
        </label>
        <div className="field"><span>연령대 <small className="hint">선택</small></span>
          <div className="seg wrap">
            {AGES.map(([v, l]) => <button type="button" key={v} className={f.age_group === v ? 'on' : ''} onClick={() => set('age_group', f.age_group === v ? '' : v)}>{l}</button>)}
          </div>
        </div>
        <label className="field"><span>학교·직장 이메일 <small className="hint">선택 · 인증 배지</small></span>
          <input type="email" placeholder="name@chungbuk.ac.kr" value={f.org_email} onChange={(e) => set('org_email', e.target.value)} />
          {errs.org_email && <em className="err">{errs.org_email}</em>}
        </label>
      </div>

      <div className="card">
        <label className="check all">
          <input type="checkbox" checked={allOn} onChange={(e) => { const v = e.target.checked; setF({ ...f, ...Object.fromEntries(CONSENTS.map((c) => [c.id, v])) }); setErrs({ ...errs, consent: null }) }} />
          <b>전체 동의</b>
        </label>
        {CONSENTS.map((c) => (
          <div key={c.id}>
            <div className="check">
              <label><input type="checkbox" checked={f[c.id]} onChange={(e) => set(c.id, e.target.checked)} /> {c.required ? <b className="req">[필수]</b> : <span className="hint">[선택]</span>} {c.label}</label>
              <button type="button" className="more" style={{ padding: 0 }} onClick={() => setOpen(open === c.id ? null : c.id)}>보기</button>
            </div>
            {open === c.id && <p className="detail">{c.detail}</p>}
          </div>
        ))}
        {errs.consent && <em className="err">{errs.consent}</em>}
      </div>

      {errs.form && <p className="form-msg bad">{errs.form}</p>}
      <button className="btn" type="submit" disabled={busy}>{busy ? '저장 중…' : profile ? '저장' : '가입 완료'}</button>
      {onCancel && <button type="button" className="btn ghost" style={{ marginTop: 8 }} onClick={onCancel}>취소</button>}
    </form>
  )
}

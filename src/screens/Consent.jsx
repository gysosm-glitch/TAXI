import { useState } from 'react'

export const CONSENTS = [
  { id: 'terms', label: '서비스 이용약관', required: true,
    detail: '같이타는 등록 운송플랫폼을 통해 합승을 중개하는 것을 전제로 한 시범 서비스입니다. 요금은 미터기(청주시 고시 요율)로만 부과되며, 앱은 분담 금액을 안내합니다.' },
  { id: 'privacy', label: '개인정보 수집·이용', required: true,
    detail: '항목: 닉네임, 성별, 출발·도착 지점, 출발 시각 / 목적: 합승 매칭·안전 고지 / 보유: 운행 종료 후 30일 / 거부할 수 있으나 매칭을 이용할 수 없습니다.' },
  { id: 'location', label: '위치정보 이용', required: true,
    detail: '탑승 스팟 안내와 배차에만 사용하며, 이동 궤적은 저장하지 않습니다. MY > 동의 철회에서 언제든 철회할 수 있습니다.' },
  { id: 'age14', label: '만 14세 이상입니다', required: true, detail: '만 14세 미만은 법정대리인 동의가 필요해 가입할 수 없습니다.' },
  { id: 'marketing', label: '혜택·이벤트 알림', required: false, detail: '동의하지 않아도 이용에 제한이 없습니다.' },
]

export default function Consent({ onDone }) {
  const [checked, setChecked] = useState({})
  const [open, setOpen] = useState(null)
  const [step, setStep] = useState(0)
  const ok = CONSENTS.filter((c) => c.required).every((c) => checked[c.id])

  return (
    <div className="scroll" style={{ background: '#fff' }}>
      {step === 0 ? (
        <>
          <h2 style={{ fontSize: 24, fontWeight: 900, margin: '24px 0 4px' }}>서비스 이용 동의</h2>
          <p className="note" style={{ marginBottom: 12 }}>안전한 합승을 위해 꼭 필요한 동의만 받아요.</p>
          <label className="consent-item" style={{ fontWeight: 800 }}>
            <input type="checkbox" checked={CONSENTS.every((c) => checked[c.id])}
              onChange={(e) => setChecked(Object.fromEntries(CONSENTS.map((c) => [c.id, e.target.checked])))} />
            전체 동의
          </label>
          {CONSENTS.map((c) => (
            <div key={c.id}>
              <label className="consent-item">
                <input type="checkbox" checked={!!checked[c.id]} onChange={(e) => setChecked({ ...checked, [c.id]: e.target.checked })} />
                <span>{c.required ? <span className="req">[필수]</span> : '[선택]'} {c.label}</span>
                <button type="button" className="lnk" onClick={(e) => { e.preventDefault(); setOpen(open === c.id ? null : c.id) }}>보기</button>
              </label>
              {open === c.id && <p className="note">{c.detail}</p>}
            </div>
          ))}
          <div style={{ height: 16 }} />
          <button className="cta" disabled={!ok} onClick={() => setStep(1)}>다음</button>
        </>
      ) : (
        <>
          <h2 style={{ fontSize: 24, fontWeight: 900, margin: '24px 0 4px' }}>본인확인</h2>
          <p className="note">택시 합승은 법령상 본인확인을 마친 승객끼리만 할 수 있어요. 정식 서비스에서는 휴대폰 본인인증(PASS)과 연동됩니다.</p>
          <div className="card" style={{ marginTop: 16 }}>
            <div className="kv"><span>인증 방식</span><b>휴대폰 본인인증</b></div>
            <div className="kv"><span>상태</span><span className="badge gray">시범 서비스: 인증 생략</span></div>
          </div>
          <button className="cta" onClick={() => onDone({ ...checked, verified: true, at: new Date().toISOString() })}>본인확인 완료</button>
        </>
      )}
    </div>
  )
}

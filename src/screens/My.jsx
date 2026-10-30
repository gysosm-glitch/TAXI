import { useState } from 'react'
import { store, DEFAULT_PREFS } from '../lib/store.js'
import { enableNotify, notify, notifyStatus } from '../lib/notify.js'
import { won } from '../data.js'
import legal from '../../data/web/09_compliance/legal_requirements.json'
import solutions from '../../data/web/11_solutions/solutions.json'
import sources from '../../data/web/07_sources/sources.json'

export default function My({ user, onLogout }) {
  const [page, setPage] = useState('main')
  const [prefs, setPrefs] = useState(() => store.get('prefs_v1', DEFAULT_PREFS))
  const [nstat, setNstat] = useState(notifyStatus())
  const history = store.get('history_v1', [])
  const saved = history.reduce((a, h) => a + h.saving, 0)
  const save = (p) => { setPrefs(p); store.set('prefs_v1', p) }
  const Back = () => <button className="back" onClick={() => setPage('main')}>‹ 뒤로</button>

  if (page === 'legal') return (
    <div className="scroll"><Back /><h2>법·안전 기준</h2>
      <p className="note">같이타가 지키는 합승 플랫폼 요건과 앱 구현 위치예요.</p>
      {legal.requirements.map((r) => (
        <div key={r.id} className="legal-item">
          <div className="law">{r.law}{!r.verified && ' · 원문 대조 필요'}</div>
          <div className="req2">{r.requirement}</div>
          <div>→ {r.implemented}</div>
        </div>
      ))}
    </div>
  )
  if (page === 'evidence') return (
    <div className="scroll"><Back /><h2>해결 방안 근거</h2>
      <p className="note">국내외 사례·연구 {solutions.length}건 (상세: docs/복합할증_해결방안_리서치.md)</p>
      {solutions.map((s) => (
        <div key={s.id} className="legal-item">
          <div className="law">{s.category} · {s.where_when}</div>
          <div className="req2">{s.title}</div>
          <div>{s.apply_to_cheongju}</div>
          <div className="note">{s.sources.map((x) => <a key={x.url} href={x.url} target="_blank" rel="noreferrer" style={{ marginRight: 8 }}>{x.publisher}</a>)}</div>
        </div>
      ))}
    </div>
  )
  if (page === 'sources') return (
    <div className="scroll"><Back /><h2>데이터 출처</h2>
      <ul className="sources">
        <li>국토교통부 TIMS 택시운영현황 격자별 영업통계(2025, 500m) · 영업통계(2022~2025) — 공공데이터포털 15160181, 15065131</li>
        <li>청주시 버스정보시스템 정류장(2026-10) — 공공데이터포털 15041896</li>
        <li>청주시 평일 주수단·목적 OD(2024), 노드링크별 택시통행량(2025, 15069016), 읍면동 경계(2025)</li>
        {sources.map((s) => <li key={s.id}><a href={s.url} target="_blank" rel="noreferrer">{s.publisher} ({s.date})</a> — {s.claim}</li>)}
      </ul>
    </div>
  )

  return (
    <div className="scroll">
      <div className="hero">
        <h1>{user.name}님</h1>
        <p>{user.kind === 'email' ? user.email : '게스트 이용 중'} · 본인확인 완료</p>
      </div>
      <div className="kpis" style={{ marginBottom: 12 }}>
        <div className="kpi"><span>같이 탄 횟수</span><b>{history.length}회</b></div>
        <div className="kpi"><span>아낀 금액</span><b style={{ color: 'var(--green)' }}>{won(saved)}</b></div>
      </div>

      <div className="card">
        <h3>동승 기준</h3>
        <div className="setting"><span>내 성별</span>
          <select style={{ width: 100 }} value={prefs.gender} onChange={(e) => save({ ...prefs, gender: e.target.value })}><option value="F">여성</option><option value="M">남성</option></select>
        </div>
        <div className="setting"><span>동성끼리만 매칭<br /><small style={{ color: 'var(--muted)' }}>중형택시는 법령상 필수</small></span><button className="switch on" disabled /></div>
        <div className="setting"><span>본인인증 회원만</span><button className={`switch ${prefs.verifiedOnly ? 'on' : ''}`} onClick={() => save({ ...prefs, verifiedOnly: !prefs.verifiedOnly })} /></div>
        <div className="setting"><span>동승자 최소 평점</span>
          <select style={{ width: 100 }} value={prefs.minRating} onChange={(e) => save({ ...prefs, minRating: Number(e.target.value) })}>{[4.0, 4.5, 4.8].map((v) => <option key={v} value={v}>{v}+</option>)}</select>
        </div>
        <div className="setting"><span>최대 인원</span>
          <select style={{ width: 100 }} value={prefs.maxParty} onChange={(e) => save({ ...prefs, maxParty: Number(e.target.value) })}>{[2, 3].map((v) => <option key={v} value={v}>{v}명</option>)}</select>
        </div>
        <div className="setting"><span>최대 대기</span>
          <select style={{ width: 100 }} value={prefs.maxWaitMin} onChange={(e) => save({ ...prefs, maxWaitMin: Number(e.target.value) })}>{[5, 10, 15].map((v) => <option key={v} value={v}>{v}분</option>)}</select>
        </div>
      </div>

      <div className="card">
        <h3>알림</h3>
        <div className="setting"><span>매칭·배차·도착 알림<br /><small style={{ color: 'var(--muted)' }}>{nstat === 'granted' ? '켜짐' : nstat === 'denied' ? '브라우저 설정에서 차단됨' : nstat === 'unsupported' ? '홈 화면에 추가하면 사용할 수 있어요' : '꺼짐'}</small></span>
          <button className={`switch ${nstat === 'granted' ? 'on' : ''}`} onClick={async () => { const s = await enableNotify(); setNstat(s); if (s === 'granted') notify('같이타', '알림이 켜졌어요') }} />
        </div>
        <p className="note">iPhone은 Safari 공유 › 홈 화면에 추가 후 앱으로 열어야 알림이 와요.</p>
      </div>

      <div className="card">
        <h3>결제 수단</h3>
        <div className="kv"><span>💳 등록 카드</span><b>테스트 카드 ****-1234</b></div>
        <p className="note">시범 서비스는 테스트 결제로 동작해요. 정식 출시 시 PG(토스페이먼츠 등) 가맹 후 실결제로 전환합니다.</p>
      </div>

      <div className="card">
        <h3>이용 내역</h3>
        {history.length === 0 && <p className="note">아직 이용 내역이 없어요.</p>}
        {history.slice(0, 5).map((h, i) => (
          <div key={i} className="kv"><span>{h.from} → {h.to} · {h.people}명</span><b className="g">{won(h.paid)} (−{won(h.saving)})</b></div>
        ))}
      </div>

      <div className="card">
        <h3>서비스 정보</h3>
        <button className="menu-item" onClick={() => setPage('legal')}>법·안전 기준 <span>›</span></button>
        <button className="menu-item" onClick={() => setPage('evidence')}>복합할증 해결 방안 근거 <span>›</span></button>
        <button className="menu-item" onClick={() => setPage('sources')}>데이터 출처 <span>›</span></button>
        <button className="menu-item" onClick={onLogout}>로그아웃 · 동의 철회 <span>›</span></button>
      </div>
    </div>
  )
}

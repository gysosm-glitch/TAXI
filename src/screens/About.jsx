// 쉐어택 알아보기: 문제 → 해결 3가지 → 모두가 이득인 구조 → 2026 실측 → 시뮬레이션·설문 → 호출 앱과 차이 → 안전·법 → 출처
// Apple 제품 페이지처럼 밝은 타일과 어두운 타일을 번갈아 쌓는다 (색 바뀜이 곧 구분선)
import { LogoMark } from '../components/Logo.jsx'
import HeroArt from '../components/HeroArt.jsx'
import { NavBar } from './Me.jsx'
import { ts } from '../lib/ts.js'
import { tims } from '../data.js'
import analysis from '../../data/web/12_simulation/return_matching.json'
import adoption from '../../data/web/12_simulation/adoption.json'

const n = (x) => Math.round(x).toLocaleString('ko-KR')
const g30 = analysis.grid.find((g) => g.appShare === 0.3 && g.exemptRatio === 1)
const joined30 = adoption.drivers.find((d) => d.appShare === 0.3)
const fee = g30.breakEvenFeePerTrip                 // 2,622원: 기사 손해 0이 되는 귀로 1건당 보전
const gain = g30.exemptPerTrip - fee                 // 1,679원: 손님 이득
const emptyPct = Math.round(tims.cheongju_per_vehicle_day_2025.empty_km_ratio * 1000) / 10   // 46.5
const osong = ts.eupmyeon.find((z) => z.name === '오송읍')
const ochang = ts.eupmyeon.find((z) => z.name === '오창읍')
const weakest = [...ts.eupmyeon].filter((z) => z.pickups_per_day > 100).sort((a, b) => a.return_balance - b.return_balance)[0]

const VS = [
  ['가까운 빈 차를 부른다', '돌아가는 빈 차와 손님의 방향을 맞춘다'],
  ['할증은 그대로', '귀로 운행 할증 면제 (시 정책 연동)'],
  ['기사가 호출 수수료를 낸다', `기사가 귀로 수입을 번다 (하루 +${n(joined30.appDriverWonPerDay)}원)`],
  ['혼자 부른다', 'KTX 도착·막차에 맞춰 같은 방향끼리'],
  ['경쟁 관계', '호출 앱 위에 얹는 층 (제휴)'],
]

export default function About({ onBack, backLabel = '돌아가기' }) {
  return (
    <>
      <NavBar title="쉐어택 알아보기" back={backLabel} onBack={onBack} />
      <div className="story">
        {/* 1. 문제 */}
        <section className="tile dark">
          <LogoMark size={56} />
          <p className="eyebrow" style={{ marginTop: 20 }}>같은 청주인데</p>
          <h2>동과 읍·면을 오가면<br />요금이 35% 더</h2>
          <p className="lead">9/28 개편 뒤에도 동↔읍·면 복합할증은 그대로예요. 할증의 이유는 '손님을 내려 준 뒤 빈 차로 돌아오는 손실'이에요.</p>
          <div className="figs">
            <div><b>35<small>%</small></b><span>동↔읍·면 복합할증</span></div>
            <div><b>{emptyPct}<small>%</small></b><span>청주 택시가 빈 차로 달리는 거리 비율</span></div>
          </div>
          <p className="src">요율: 보도 기준(고시 원문 확인 중) · 빈 차 비율: 국토부 TIMS 2025</p>
        </section>

        {/* 2. 해결 */}
        <section className="tile light">
          <p className="eyebrow">쉐어택의 답</p>
          <h2>귀로를 채우면<br />할증의 이유가 사라져요</h2>
          <p className="lead">오송·오창에 손님을 내려 준 택시에, 시내로 가는 손님을 이어 줘요. 할증 없이 가는 방법은 세 가지예요.</p>
          <div className="steps">
            <div className="step"><span className="way-num">1</span><div><b>왕복 매칭</b><p>도착지에서 시내로 갈 손님을 미리 구해요. 양쪽 다 할증이 없고, 합승이 아니라 성별 제한도 없어요.</p></div></div>
            <div className="step"><span className="way-num">2</span><div><b>귀로 연계 결제 (모의)</b><p>할증 포함 금액으로 가승인한 뒤, 내린 지 30분 안에 그 택시가 귀로 손님을 태우면 할증을 뺀 금액으로 결제해요.</p></div></div>
            <div className="step"><span className="way-num">3</span><div><b>앱 없이 현장 승차</b><p>미터기 요금 그대로예요.</p></div></div>
          </div>
          <p className="caption" style={{ marginTop: 16, textAlign: 'left' }}>노쇼가 나면 할증분을 안 온 쪽이 부담해 기사님 손실을 메워요. 같은 방향끼리 나눠 타기(같은 성별·최대 3명)는 보조 기능으로 남겼어요.</p>
        </section>

        {/* 3. 수익 구조 */}
        <section className="tile parch">
          <p className="eyebrow">모두가 이득인 구조</p>
          <h2>손님은 아끼고,<br />기사는 손해 없이</h2>
          <p className="lead">귀로 운행 할증을 면제하면 손님은 1건에 {n(g30.exemptPerTrip)}원을 덜 내요. 그중 {n(fee)}원을 매칭 수수료로 기사님께 돌려 드려요.</p>
          <div className="figs three">
            <div><b>+{n(gain)}<small>원</small></b><span>손님 이득</span></div>
            <div><b>0<small>원</small></b><span>기사 손해</span></div>
            <div><b>0<small>원</small></b><span>시 재정</span></div>
          </div>
          <p className="caption" style={{ marginTop: 22 }}>플랫폼 몫은 운임의 2.8%(약 400원, 카카오T 블루 가맹 수수료 수준)예요.</p>
          <p className="src">행위자 시뮬레이션(택시 2,956대·하루 약 5.6만 건, TIMS 2025 보정) · 앱 이용 30%, 할증 전액 면제 기준</p>
        </section>

        {/* 4. 2026 실측 */}
        <section className="tile dark2">
          <p className="eyebrow">2026년 실측 데이터</p>
          <h2>손님은 있는데<br />빈 차와 엇갈려요</h2>
          <p className="lead">한국교통안전공단에 정보공개를 청구해 받은 2026년 4~9월 청주 택시 승하차 {n(ts.trips_total)}건을 분석했어요.</p>
          <div className="figs">
            <div><b>{n(ts.trips_per_day)}</b><span>청주 시내 택시 하루 승차</span></div>
            <div><b>{n(ts.cross_per_day)}</b><span>그중 동↔읍·면 할증 구간 ({(ts.cross_share * 100).toFixed(1)}%)</span></div>
            <div><b>{Math.round(ts.osong_ochang_share_of_em_pickups * 100)}<small>%</small></b><span>읍·면 승차 중 오송·오창</span></div>
            <div><b>{n(ts.into_em_minus_out_per_day)}</b><span>하루에 읍·면으로 들어간 만큼 나오는 손님이 없는 운행 (단순 차이)</span></div>
          </div>
          <div className="bar-compare" aria-label="시내에서 들어온 택시 100대당 시내로 가는 손님">
            <p className="figure-cap" style={{ textAlign: 'left' }}>시내에서 들어온 택시 100대당 시내로 가는 손님</p>
            {[osong, ochang, weakest].map((z) => (
              <div key={z.name} className="bc-row">
                <span>{z.name}<b>{z.return_balance}명</b></span>
                <div className="bc-track"><i style={{ width: `${z.return_balance}%` }} /></div>
              </div>
            ))}
          </div>
          <p className="lead" style={{ marginTop: 18, textAlign: 'left' }}>오송·오창은 들어온 택시와 나가는 손님이 거의 맞아요. 시간만 맞추면 귀로를 채울 수 있는 곳이에요.</p>
          <p className="src">한국교통안전공단 정보공개(접수번호 17933337) · 행정동 단위 시간대별 승하차 · 시외 통행 제외 · {ts.period.days}일 하루 평균</p>
        </section>

        {/* 5. 시뮬레이션 · 설문 */}
        <section className="tile light">
          <p className="eyebrow">근거</p>
          <h2>참여 기사는 하루<br />+{n(joined30.appDriverWonPerDay)}원</h2>
          <p className="lead">전체 평균(+0.16%)은 참여하지 않은 기사가 섞여 묽어진 값이에요. 오송역·KTX 도착 시간대에 모으면 같은 기사 수로 오송 귀로 매칭이 {adoption.strategy.focus.osongReturnPerDay / adoption.strategy.spread.osongReturnPerDay}배가 돼요.</p>
          <div className="figs">
            <div><b>{adoption.strategy.focus.osongReturnPerDay / adoption.strategy.spread.osongReturnPerDay}<small>배</small></b><span>오송 집중 시 귀로 매칭 (하루 {adoption.strategy.spread.osongReturnPerDay}→{adoption.strategy.focus.osongReturnPerDay}건)</span></div>
            <div><b>−3.7<small>%</small></b><span>합승이 줄이는 할증 부담. 그래서 귀로 매칭으로 바꿨어요</span></div>
            <div><b>63<small>%</small></b><span>할증 때문에 택시를 포기하거나 다른 수단을 탄 적 있음</span></div>
            <div><b>96<small>%</small></b><span>조건이 맞으면 모르는 승객과 나눠 탈 의향</span></div>
          </div>
          <p className="src">시뮬레이션: 2개 시드 평균 · 설문: 시민 57명(2026.10, 대학생 84% — 요금에 가장 민감한 초기 타깃)</p>
        </section>

        {/* 6. 호출 앱과 차이 */}
        <section className="tile parch">
          <p className="eyebrow">택시 앱을 대신하지 않아요</p>
          <h2>택시 앱과 함께 쓰는<br />할증 도우미</h2>
          <p className="lead">반반택시는 동승 단독 앱으로 카카오T에 밀려 동승을 접고 B2B로 바꿔 살아남았어요. 그래서 쉐어택은 경쟁 대신 제휴를 택했어요.</p>
          <div className="vs">
            <div className="vs-row head"><div>호출 앱</div><div>쉐어택</div></div>
            {VS.map(([a, b]) => <div key={a} className="vs-row"><div>{a}</div><div>{b}</div></div>)}
          </div>
        </section>

        {/* 7. 안전 · 법 */}
        <section className="tile light">
          <p className="eyebrow">안전과 법</p>
          <h2>처음 보는 사람과도<br />안심하고</h2>
          <div className="steps">
            <div className="step"><span className="way-num">✓</span><div><b>같은 성별끼리 합승</b><p>택시발전법 시행규칙 제11조의2 · 본인 확인과 탑승 시점·위치·좌석 사전 고지</p></div></div>
            <div className="step"><span className="way-num">✓</span><div><b>지인에게 탑승 알리기 · 112</b><p>탑승 중 한 번에 공유하고 바로 신고해요. 평가와 노쇼 기록도 남아요.</p></div></div>
            <div className="step"><span className="way-num">✓</span><div><b>등록 호출 플랫폼과 제휴</b><p>귀로 매칭은 제휴 또는 규제샌드박스 실증으로, 할증 면제는 실증 결과로 시에 건의해요.</p></div></div>
          </div>
        </section>

        {/* 8. 다음 단계 */}
        <section className="tile dark">
          <p className="eyebrow">2027 실행 계획</p>
          <h2>오송역 한 곳에서<br />시작해요</h2>
          <HeroArt from="시내" to="오송역" />
          <div className="steps" style={{ marginTop: 20 }}>
            {['오송역 · KTX 도착 시간대 시범', '승강장 택시 단체·호출 플랫폼 제휴', '오송·오창으로 넓혀 데이터 축적', '시에 귀로 운행 할증 면제 고시 건의'].map((t, i) => (
              <div key={t} className="step" style={{ background: 'rgba(255,255,255,.08)' }}><span className="way-num" style={{ background: '#fff', color: '#1d1d1f' }}>{i + 1}</span><div><b>{t}</b></div></div>
            ))}
          </div>
          <p className="lead" style={{ marginTop: 18 }}>1차 목표: 오송 귀로 매칭 하루 {adoption.strategy.focus.osongReturnPerDay}건 (시뮬레이션)</p>
          <div className="cta-row"><button className="btn" style={{ width: 'auto' }} onClick={onBack}>쉐어택 써 보기</button></div>
        </section>
      </div>

      <footer className="footer" style={{ margin: '0 -16px' }}>
        <p>데이터: 국토교통부 TIMS 2025 · 한국교통안전공단 정보공개 2026.4~9 · KTDB 2024 평일 여객 OD(비율·순위만 공개) · 청주시 BIS · 공공데이터포털 TAGO<br />시범 서비스 · 실제 결제·배차 없음 · 충북대 경영대 캡스톤 고경택시</p>
      </footer>
    </>
  )
}

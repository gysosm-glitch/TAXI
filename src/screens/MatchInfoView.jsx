// 합승 매칭에 필요한 개인정보: 무엇을, 왜, 누구에게 보이고, 얼마나 보관하는지
const FIELDS = [
  { item: '본인인증 결과 (CI)', need: '필수', why: '법령상 합승은 본인확인을 거친 승객끼리만 가능', shown: '공개 안 함 (인증 완료 여부만 표시)', keep: '회원 탈퇴 시 파기', law: '택시발전법 시행규칙 제11조의2' },
  { item: '성별', need: '필수', why: '경·소·중형택시는 동성끼리만 합승 가능', shown: '동승자에게 공개', keep: '회원 탈퇴 시 파기', law: '택시발전법 시행규칙 제11조의2' },
  { item: '휴대폰 번호', need: '필수', why: '배차 연락, 112 긴급신고·안심귀가 공유', shown: '공개 안 함 (안심번호로 연결)', keep: '회원 탈퇴 시 파기', law: '개인정보 보호법 제15조' },
  { item: '닉네임', need: '필수', why: '탑승 전 동승자 확인', shown: '동승자에게 공개', keep: '회원 탈퇴 시 파기', law: '-' },
  { item: '탑승 스팟 · 출발 시각', need: '필수', why: '같은 스팟·10분 이내 승객끼리 묶기, 탑승 전 고지', shown: '동승자에게 공개', keep: '운행 종료 후 30일', law: '택시발전법 시행규칙 제11조의2' },
  { item: '목적지 (읍면동 단위)', need: '필수', why: '목적지 3km 이내 승객끼리 묶기, 하차 순서·요금 분담', shown: '읍면동 이름만 공개', keep: '운행 종료 후 30일', law: '위치정보법' },
  { item: '탑승 인원', need: '필수', why: '좌석 배정 (최대 3명)', shown: '동승자에게 공개', keep: '운행 종료 후 30일', law: '-' },
  { item: '학교·직장 이메일 인증', need: '선택', why: '신원 신뢰도를 높여 모르는 사람과 타는 불안 감소', shown: '“충북대 인증” 같은 배지만 공개', keep: '인증 해제 시 파기', law: '개인정보 보호법 제15조' },
  { item: '연령대 (20대·30대…)', need: '선택', why: '이용 통계, 같은 연령대 우선 매칭 옵션', shown: '선택 시에만 공개', keep: '회원 탈퇴 시 파기', law: '-' },
  { item: '동승 평점 · 노쇼 이력', need: '자동 생성', why: '평점 낮은 사용자 매칭 제외, 노쇼 방지', shown: '평점만 공개', keep: '최근 1년', law: '-' },
  { item: '결제수단', need: '필수 (정식 서비스)', why: 'n분의 1 자동 정산', shown: '공개 안 함 (PG사 토큰으로만 보관)', keep: 'PG사 보관', law: '전자금융거래법' },
]

const NOT_COLLECTED = ['주민등록번호', '정확한 집 주소', '실시간 GPS 이동 궤적 (탑승 스팟·목적지 읍면동만 사용)', '연락처·사진 등 기기 정보']

const RULES = [
  ['같은 스팟', '오송역·시외버스터미널 등 데이터로 고른 매칭 스팟에서 출발'],
  ['동성', '중형택시 기준 법령 필수 (대형·승합은 선택)'],
  ['시간', '출발 시각 ±10분 안'],
  ['목적지', '3km 이내 또는 같은 방향 (우회 15분 이하)'],
  ['신뢰', '본인인증 완료 + 평점 4.5 이상 (설정 가능)'],
  ['인원', '최대 3명, 요금은 혼자 탈 때 요금 비례로 n분의 1'],
]

export default function MatchInfoView() {
  return (
    <>
      <p className="lead">모르는 사람과 택시를 같이 타려면 <b>신원 보증</b>이 핵심입니다. 법령이 요구하는 것과 안전에 꼭 필요한 것만 받고, 동승자에게는 최소한만 보여 줍니다.</p>

      <div className="card">
        <h2>수집 항목</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>항목</th><th>구분</th><th>왜 필요한가</th><th>동승자에게</th><th>보관</th><th>근거</th></tr></thead>
            <tbody>
              {FIELDS.map((f) => (
                <tr key={f.item} style={{ cursor: 'default' }}>
                  <td><b>{f.item}</b></td>
                  <td><span className={`tag ${f.need === '필수' ? 'req' : f.need === '선택' ? 'opt' : ''}`}>{f.need}</span></td>
                  <td>{f.why}</td><td>{f.shown}</td><td>{f.keep}</td><td className="muted">{f.law}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid two" style={{ marginTop: 16 }}>
        <div className="card">
          <h2>매칭 조건</h2>
          <table><tbody>{RULES.map(([k, v]) => <tr key={k} style={{ cursor: 'default' }}><td style={{ width: 80 }}><b>{k}</b></td><td>{v}</td></tr>)}</tbody></table>
        </div>
        <div className="card">
          <h2>수집하지 않는 정보</h2>
          <ul className="list-plain">{NOT_COLLECTED.map((x) => <li key={x}>{x}</li>)}</ul>
          <h2 style={{ marginTop: 16 }}>안전 장치</h2>
          <ul className="list-plain">
            <li>탑승 전 동승자 닉네임·성별·평점·탑승 위치·좌석 고지</li>
            <li>112 긴급신고, 안심귀가 경로 공유, 신고·차단</li>
            <li>번호는 안심번호로만 연결, 운행 후 30일 뒤 위치 기록 파기</li>
            <li>합승은 등록 플랫폼 제휴 또는 ICT 규제샌드박스를 거쳐 운영</li>
          </ul>
        </div>
      </div>
    </>
  )
}

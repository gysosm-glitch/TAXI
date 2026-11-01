// 쉐어택 캡스톤 발표 8장 (.pptx)
// Usage: npm install && npm run art && npm run build  →  쉐어택_캡스톤발표.pptx
// 내용(문구·숫자)을 바꿀 때는 docs/발표원고.md도 같이 고친다
const path = require('path')
const pptxgen = require('pptxgenjs')

const OUT = process.argv[2] || path.join(__dirname, '쉐어택_캡스톤발표.pptx')
const IMG = (f) => path.join(__dirname, 'img', f)
const QR = path.join(__dirname, '..', 'docs', 'qr_쉐어택.png')

const HEX = { ink: '10231C', white: 'FFFFFF', dark: '0F2A22', light: 'F6F7F3', teal: '1D9E75', amber: 'F2A93B', muted: '4A5A54', mint: '8FCFB8', dark2: '163A2F', soft: 'A9B8B1' }
const THEME = {
  name: '쉐어택', headFontFace: 'Malgun Gothic', bodyFontFace: 'Malgun Gothic',
  colors: { dk1: HEX.ink, lt1: HEX.white, dk2: HEX.dark, lt2: HEX.light, accent1: HEX.teal, accent2: HEX.amber, accent3: HEX.muted, accent4: HEX.mint, accent5: HEX.dark2, accent6: HEX.soft, hlink: HEX.teal, folHlink: HEX.muted },
}

const pres = new pptxgen()
pres.layout = 'LAYOUT_WIDE'   // 13.333 × 7.5 in
pres.title = '쉐어택'
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace }
const K = HEX   // 색은 hex로 바로 지정 (테마 후처리 없이 PowerPoint·Keynote·구글 슬라이드에서 같은 색)
const SH = pres.ShapeType

// ---------------------------------------------------------------- 레이아웃
const titlePh = (color, kicker) => [
  { placeholder: { options: { name: 'kicker', type: 'body', x: 0.6, y: 0.42, w: 9, h: 0.4, fontSize: 14, bold: true, color: kicker, margin: 0, valign: 'middle', align: 'left' }, text: '' } },
  { placeholder: { options: { name: 'title', type: 'title', x: 0.6, y: 0.82, w: 12.1, h: 0.85, fontSize: 32, bold: true, color, margin: 0, valign: 'middle', align: 'left' }, text: '' } },
]
pres.defineSlideMaster({ title: 'COVER', background: { color: K.dark } })
pres.defineSlideMaster({ title: 'LIGHT', background: { color: K.light }, objects: titlePh(K.ink, K.teal), slideNumber: { x: 12.2, y: 6.92, w: 0.5, h: 0.3, fontSize: 10, color: K.muted, align: 'right' } })
pres.defineSlideMaster({ title: 'DARK', background: { color: K.dark }, objects: titlePh(K.white, K.amber), slideNumber: { x: 12.2, y: 6.92, w: 0.5, h: 0.3, fontSize: 10, color: K.soft, align: 'right' } })

const head = (s, kicker, title) => { s.addText(kicker, { placeholder: 'kicker' }); s.addText(title, { placeholder: 'title' }) }
const source = (s, text, dark) => s.addText(text, { x: 0.6, y: 6.92, w: 11.4, h: 0.3, fontSize: 10, color: dark ? K.soft : K.muted, margin: 0, isTextBox: true, valign: 'middle' })
const T = (s, text, o) => s.addText(text, { margin: 0, isTextBox: true, valign: 'top', ...o })
const card = (s, x, y, w, h, fill, extra = {}) => s.addShape(SH.roundRect, { x, y, w, h, rectRadius: 0.16, fill: { color: fill }, line: { color: fill, width: 0 }, ...extra })

// ================================================================ 1. 표지
pres.addSection({ title: '문제' })
{
  const s = pres.addSlide({ masterName: 'COVER', sectionTitle: '문제' })
  s.addImage({ path: IMG('map_dark.png'), x: 5.75, y: 0.5, w: 7.35, h: 6.3, objectName: '청주 읍면동 지도' })
  T(s, '충북대학교 경영대학 캡스톤디자인 · [팀명]', { x: 0.7, y: 0.75, w: 6, h: 0.4, fontSize: 14, bold: true, color: K.teal })
  s.addImage({ path: IMG('logo.png'), x: 0.7, y: 1.45, w: 1.1, h: 1.1, objectName: '쉐어택 로고' })
  T(s, '쉐어택', { x: 2.0, y: 1.45, w: 4.5, h: 1.1, fontSize: 60, bold: true, color: K.white, valign: 'middle' })
  T(s, '빈 차로 돌아가는 택시를 채워\n읍·면 할증의 이유를 없앤다', { x: 0.7, y: 2.75, w: 5.6, h: 1.2, fontSize: 26, color: K.white, lineSpacingMultiple: 1.15 })
  s.addImage({ path: IMG('taxi_amber.png'), x: 0.7, y: 4.35, w: 3.4, h: 1.59, objectName: '택시 일러스트' })
  T(s, '귀로 매칭 플랫폼 · 할증 면제 정책 제안   |   2026. 11', { x: 0.7, y: 6.55, w: 6.5, h: 0.35, fontSize: 14, color: K.soft })
  // 지도 범례
  s.addShape(SH.line, { x: 9.0, y: 6.98, w: 0.45, h: 0, line: { color: HEX.light, width: 2.5 } })
  T(s, '갈 때: 손님 태움', { x: 9.55, y: 6.85, w: 1.5, h: 0.28, fontSize: 11, color: K.soft, valign: 'middle' })
  s.addShape(SH.line, { x: 11.0, y: 6.98, w: 0.45, h: 0, line: { color: HEX.amber, width: 2.5, dashType: 'sysDot' } })
  T(s, '올 때: 빈 차', { x: 11.55, y: 6.85, w: 1.2, h: 0.28, fontSize: 11, color: K.soft, valign: 'middle' })
  s.addNotes('쉐어택은 쉐어와 택시를 합친 이름입니다. 오송·오창처럼 할증이 붙는 읍·면에서 빈 차로 돌아가는 택시에 시내 방향 손님을 이어 주는 귀로 매칭 플랫폼입니다. 지도의 실선은 시내에서 손님을 태우고 가는 길, 점선은 손님을 내린 뒤 빈 차로 돌아오는 길입니다. 오늘은 이 점선을 채우는 방법을 제안합니다.')
}

// ================================================================ 2. 문제
{
  const s = pres.addSlide({ masterName: 'LIGHT', sectionTitle: '문제' })
  head(s, '01  문제', '같은 청주인데, 읍·면만 오가면 35%를 더 낸다')
  card(s, 0.6, 1.95, 5.6, 4.7, K.dark, { objectName: '할증 카드' })
  T(s, '동 ↔ 읍·면 복합할증', { x: 1.0, y: 2.3, w: 4.8, h: 0.4, fontSize: 16, color: K.soft })
  T(s, '35%', { x: 1.0, y: 2.75, w: 4.8, h: 1.9, fontSize: 110, bold: true, color: K.amber, valign: 'middle' })
  T(s, '9월 28일 요금 개편 뒤에도\n동과 읍·면을 오가는 운행에는 그대로', { x: 1.0, y: 4.85, w: 4.8, h: 1.0, fontSize: 18, color: K.white, lineSpacingMultiple: 1.2 })
  s.addImage({ path: IMG('taxi_amber.png'), x: 3.7, y: 5.75, w: 2.1, h: 0.98, objectName: '택시' })

  card(s, 6.5, 1.95, 6.23, 2.2, K.white, { line: { color: 'DDE3DF', width: 1 } })
  T(s, '73%', { x: 6.9, y: 2.2, w: 3, h: 1.0, fontSize: 54, bold: true, color: K.ink, valign: 'middle' })
  T(s, '읍·면 택시 승차 중 오송·오창 비중', { x: 6.9, y: 3.2, w: 4.6, h: 0.35, fontSize: 16, bold: true, color: K.ink })
  T(s, '13개 읍·면 하루 7,712건 중 5,643건', { x: 6.9, y: 3.58, w: 4.6, h: 0.3, fontSize: 13, color: K.muted })
  s.addImage({ path: IMG('i_taxi_t.png'), x: 11.45, y: 2.3, w: 0.95, h: 0.95, objectName: '택시 아이콘' })

  card(s, 6.5, 4.4, 6.23, 2.25, K.white, { line: { color: 'DDE3DF', width: 1 } })
  T(s, '할증을 내는 사람 — 택시 말고는 대안이 적다', { x: 6.9, y: 4.6, w: 5.6, h: 0.35, fontSize: 16, bold: true, color: K.ink })
  const who = [['i_train_a.png', 'KTX 이용객', '오송역'], ['i_people_t.png', '산단 출퇴근자', '오창과학산업단지'], ['i_route_d.png', '바이오단지 종사자', '오송생명과학단지']]
  who.forEach(([ic, a, b], i) => {
    const x = 6.9 + i * 1.95
    s.addImage({ path: IMG(ic), x, y: 5.1, w: 0.7, h: 0.7 })
    T(s, a, { x, y: 5.88, w: 1.85, h: 0.3, fontSize: 14, bold: true, color: K.ink })
    T(s, b, { x, y: 6.18, w: 1.85, h: 0.28, fontSize: 11, color: K.muted })
  })
  source(s, '출처: 국토교통부 택시운행정보관리시스템(TIMS) 격자별 영업통계 2025 · 할증률은 청주시 요금 고시(보도 기준, 고시 원문 확인 중)')
  s.addNotes('청주는 동과 읍·면을 오가는 택시에 35% 복합할증을 붙입니다. 9월 28일 요금 개편 뒤에도 이 구간은 그대로입니다. 읍·면 택시 승차의 73%가 오송과 오창에서 나옵니다. 즉 할증 부담은 KTX 이용객, 산단 출퇴근자, 바이오단지 종사자에게 몰려 있습니다. 개편 내용은 발표 전에 고시 원문으로 다시 확인합니다.')
}

// ================================================================ 3. 원인
pres.addSection({ title: '원인 재정의' })
{
  const s = pres.addSlide({ masterName: 'LIGHT', sectionTitle: '원인 재정의' })
  head(s, '02  원인', '할증의 근거는 손님을 내린 뒤 빈 차로 돌아오는 비용')
  T(s, '46.5%', { x: 0.6, y: 1.95, w: 3.9, h: 0.95, fontSize: 56, bold: true, color: K.ink, valign: 'middle' })
  T(s, '청주 택시 운행거리 중 빈 차 비율\n(TIMS 2025 실측)', { x: 0.6, y: 2.9, w: 3.9, h: 0.65, fontSize: 14, color: K.muted })
  T(s, [
    { text: '그러나 읍·면마다 다르다. ', options: { bold: true } },
    { text: '승차 밀도·대중교통·시내까지 거리로 빈 차 귀로 위험을 매기면, ' },
    { text: '오창·오송·옥산', options: { bold: true, color: K.teal } },
    { text: '은 가중치를 6가지로 바꿔도 늘 저위험이다.' },
  ], { x: 0.6, y: 3.7, w: 3.9, h: 1.7, fontSize: 15, color: K.ink, lineSpacingMultiple: 1.25 })
  T(s, '기준 대비 순위 상관 0.92~0.99 (스피어만)', { x: 0.6, y: 5.55, w: 3.9, h: 0.3, fontSize: 13, color: K.muted })
  T(s, '청주시도 복합할증 도입 목적을 "승차난 방지와 공차 손실 보전"이라고 밝혔다 (2026.9 보도)', { x: 0.6, y: 5.95, w: 3.9, h: 0.75, fontSize: 13, bold: true, color: K.teal })

  s.addImage({ path: IMG('map_risk.png'), x: 4.75, y: 2.0, w: 3.6, h: 3.24, objectName: '공차 위험 지도' })
  const leg = [[HEX.teal, '6/6 저위험'], [HEX.mint, '저위험'], ['E9DFC6', '중간'], [HEX.amber, '고위험'], ['D5DCD8', '동(시내)']]
  leg.forEach(([c, t], i) => {
    const y = 5.4 + Math.floor(i / 3) * 0.36, x = 4.85 + (i % 3) * 1.2
    s.addShape(SH.rect, { x, y: y + 0.06, w: 0.2, h: 0.2, fill: { color: c }, line: { color: c, width: 0 } })
    T(s, t, { x: x + 0.27, y, w: 0.95, h: 0.32, fontSize: 11, color: K.muted, valign: 'middle' })
  })

  const rows = [['오창', 0.014, 'tl'], ['오송', 0.188, 'tl'], ['옥산', 0.376, 'tl'], ['내수', 0.402, 'm'], ['강내', 0.406, 'm'], ['남이', 0.456, 'g'], ['남일', 0.531, 'g'], ['북이', 0.692, 'g'], ['문의', 0.788, 'a'], ['현도', 0.797, 'a'], ['미원', 0.847, 'a'], ['낭성', 0.863, 'a'], ['가덕', 0.877, 'a']]
  const col = { tl: HEX.teal, m: HEX.mint, g: 'C9D1CD', a: HEX.amber }
  s.addChart(pres.ChartType.bar, [{ name: '빈 차 귀로 위험 지수', labels: rows.map((r) => r[0]), values: rows.map((r) => r[1]) }], {
    x: 8.6, y: 1.85, w: 4.15, h: 4.9, barDir: 'bar', catAxisOrientation: 'maxMin', valAxisHidden: true, valAxisMaxVal: 1, valAxisMinVal: 0,
    chartColors: rows.map((r) => col[r[2]]), valueBarColors: true, barGapWidthPct: 45,
    showValue: true, dataLabelPosition: 'outEnd', dataLabelFormatCode: '0.00', dataLabelFontSize: 10, dataLabelColor: HEX.ink, dataLabelFontFace: '+mn-lt',
    catAxisLabelColor: HEX.ink, catAxisLabelFontSize: 11, catAxisLabelFontFace: '+mn-lt', catAxisLineShow: false,
    valGridLine: { style: 'none' }, catGridLine: { style: 'none' }, showLegend: false,
    showTitle: true, title: '빈 차 귀로 위험 지수 (0 낮음 ~ 1 높음)', titleFontSize: 12, titleColor: HEX.muted, titleFontFace: '+mn-lt',
    objectName: '공차 위험 지수 차트',
  })
  source(s, '지수 = 승차 밀도(TIMS 2025) 0.5 + 버스정류장 부족 0.25 + 시내까지 거리 0.25, 각 0~1 정규화 · 경계 admdongkor(2025.4판)')
  s.addNotes('할증의 근거는 기사가 읍·면에 손님을 내려준 뒤 빈 차로 돌아오는 손실입니다. 청주 택시는 운행거리의 46.5%를 빈 차로 달립니다. 그런데 읍·면마다 사정이 다릅니다. 승차 밀도, 대중교통, 시내까지 거리로 위험 지수를 만들면, 가중치를 여섯 가지로 바꿔도 오창·오송·옥산은 늘 저위험입니다. 할증 이용의 73%가 나오는 곳이 오히려 빈 차 귀로 위험이 가장 낮은 곳입니다. 처음 넣었던 귀로 균형 항목은 OD 자료에 너무 의존해 뺐고, 대신 민감도 분석으로 결과가 흔들리지 않음을 보였습니다.')
}

// ================================================================ 4. 근거
{
  const s = pres.addSlide({ masterName: 'DARK', sectionTitle: '원인 재정의' })
  head(s, '03  근거', '오송·오창엔 손님이 있다, 빈 차와 엇갈릴 뿐')
  s.addImage({ path: IMG('map_dark.png'), x: 0.45, y: 1.85, w: 5.4, h: 4.63, objectName: '귀로 지도' })
  const stats = [['3,025', '건', '오송읍 하루 택시 승차', K.white], ['2,617', '건', '오창읍 하루 택시 승차', K.white], ['52', '%', '오송역 승차 중 시내 방향', K.amber]]
  stats.forEach(([n, u, l, c], i) => {
    const x = 6.15 + i * 2.22
    card(s, x, 1.95, 2.05, 1.75, K.dark2)
    T(s, [{ text: n, options: { fontSize: 36, bold: true, color: c } }, { text: ' ' + u, options: { fontSize: 16, color: c } }], { x: x + 0.22, y: 2.15, w: 1.75, h: 0.75, valign: 'middle' })
    T(s, l, { x: x + 0.22, y: 2.95, w: 1.7, h: 0.6, fontSize: 12, color: K.soft })
  })
  const rows2 = [
    ['지금', K.soft, 'i_taxi_a.png', '시내→오송 손님을 내린 택시는 빈 차로 돌아가고,\n오송→시내 손님은 따로 부른 택시에 할증을 낸다'],
    ['쉐어택', K.teal, 'i_check_t.png', '내려준 그 택시가 시내 가는 손님을 태워 돌아온다.\n빈 차 귀로가 사라지면 할증의 근거도 사라진다'],
  ]
  rows2.forEach(([tag, c, ic, txt], i) => {
    const y = 4.05 + i * 1.3
    s.addImage({ path: IMG(ic), x: 6.15, y: y + 0.12, w: 0.75, h: 0.75 })
    T(s, tag, { x: 7.1, y, w: 2, h: 0.35, fontSize: 14, bold: true, color: c })
    T(s, txt, { x: 7.1, y: y + 0.36, w: 5.65, h: 0.8, fontSize: 16, color: K.white, lineSpacingMultiple: 1.2 })
  })
  source(s, '출처: TIMS 격자별 영업통계 2025(500m 격자를 읍면동 경계에 매칭) · 시내 방향 비율은 KTDB 2024 평일 목적통행 OD(2025-OD-PSN-OBJ-04) 기준', true)
  s.addNotes('오송읍은 하루 3,025건, 오창읍은 2,617건의 택시 승차가 있습니다. 오송역만 해도 하루 1,793건이고, 그 52%인 약 930건이 할증이 붙는 시내 방향입니다. 즉 손님이 없는 게 아니라, 시내에서 손님을 내린 택시는 빈 차로 돌아가고, 시내로 가려는 손님은 따로 부른 택시에 할증을 냅니다. 이 둘을 이으면 빈 차 귀로가 사라지고, 할증의 근거도 사라집니다.')
}

// ================================================================ 5. 해법
pres.addSection({ title: '해법과 효과' })
{
  const s = pres.addSlide({ masterName: 'LIGHT', sectionTitle: '해법과 효과' })
  head(s, '04  해법', '내려준 택시가 시내 손님을 태워 온다')
  const steps = [
    ['i_people_t.png', '손님', '어디서든 출발, 어디로든 도착', '출발·도착을 검색·GPS·지도로 정하면 혼자·나눠 타기·귀로 면제 요금을 비교하고, 반경 1.5km 모집에 참여한다'],
    ['i_taxi_a.png', '기사', '하차 직후 귀로 손님 확인', '빈 차 복귀(0원, 연료비 손해)와 귀로 손님 태우기를 금액으로 비교해 고른다'],
    ['i_check_d.png', '호출 앱과 다른 점', '차를 부르지 않고, 방향을 맞춘다', '호출 앱은 가까운 빈 차를 부르고, 쉐어택은 돌아가는 빈 차와 손님의 방향을 잇는다. 할증 면제는 시 정책과 연동'],
  ]
  steps.forEach(([ic, who, t, d], i) => {
    const y = 1.95 + i * 1.55
    card(s, 0.6, y, 6.0, 1.38, K.white, { line: { color: 'DDE3DF', width: 1 } })
    s.addImage({ path: IMG(ic), x: 0.85, y: y + 0.3, w: 0.78, h: 0.78 })
    T(s, `${i + 1}  ${who}`, { x: 1.85, y: y + 0.18, w: 4.5, h: 0.3, fontSize: 12, bold: true, color: K.teal })
    T(s, t, { x: 1.85, y: y + 0.45, w: 4.6, h: 0.35, fontSize: 17, bold: true, color: K.ink })
    T(s, d, { x: 1.85, y: y + 0.82, w: 4.6, h: 0.5, fontSize: 12, color: K.muted })
  })
  const phones = [['shot_ride.png', 2.15, '손님 · 장소 검색, 실제 거리 요금'], ['shot_driver.png', 2.61, '기사 · 귀로 손님과 수입 비교']]
  let x = 7.25
  phones.forEach(([f, w, cap]) => {
    card(s, x - 0.07, 1.88, w + 0.14, 4.44, K.ink)
    s.addImage({ path: IMG(f), x, y: 1.95, w, h: 4.3, rounding: false, objectName: cap })
    T(s, cap, { x: x - 0.07, y: 6.4, w: w + 0.3, h: 0.3, fontSize: 11, color: K.muted })
    x += w + 0.3
  })
  source(s, '시연: taxi-woad-seven.vercel.app (체험 계정 A·B) · 동성끼리·최대 3명·탑승 전 좌석·시각 고지 · 실제 배차는 등록 호출 플랫폼과 제휴')
  s.addNotes('쉐어택은 택시를 직접 부르는 앱이 아닙니다. 읍·면에서 시내로 가려는 손님을 모아, 방금 그곳에 손님을 내려준 택시와 이어 줍니다. 왼쪽은 손님 화면입니다. GPS로 내 위치에서 가장 가까운 승차 지점을 잡고, 목적지를 고르면 혼자 17,500원, 세 명이 나누면 5,900원, 귀로 할증 면제 정책이 시행되면 4,500원으로 비교해 보여 줍니다. 오른쪽은 기사 화면입니다. 빈 차로 돌아가면 0원에 연료비만 들고, 귀로 손님을 태우면 17,500원을 법니다. 실제 배차는 등록된 호출 플랫폼과 제휴해 처리합니다.')
}

// ================================================================ 6. 효과
{
  const s = pres.addSlide({ masterName: 'LIGHT', sectionTitle: '해법과 효과' })
  head(s, '05  효과', '합승은 기사 수입을 깎고, 귀로 매칭은 늘린다')
  const cats = ['합승 매칭', '스팟 합승+귀로', '귀로 매칭\n(앱 30%)', '귀로 매칭\n(앱 100%)']
  s.addChart(pres.ChartType.bar, [{ name: '기사 수입 변화(%)', labels: cats, values: [-0.45, -0.90, 0.16, 0.50] }], {
    x: 0.6, y: 1.9, w: 6.6, h: 4.75, barDir: 'col', chartColors: [HEX.soft, HEX.soft, HEX.teal, HEX.teal], valueBarColors: true, barGapWidthPct: 55,
    showValue: true, dataLabelPosition: 'outEnd', dataLabelFormatCode: '+0.00"%";-0.00"%"', dataLabelFontSize: 13, dataLabelFontBold: true, dataLabelColor: HEX.ink, dataLabelFontFace: '+mn-lt',
    valAxisHidden: true, valAxisMinVal: -1.2, valAxisMaxVal: 0.8, catAxisLabelColor: HEX.ink, catAxisLabelFontSize: 12, catAxisLabelFontFace: '+mn-lt', catAxisLabelPos: 'low',
    valGridLine: { style: 'none' }, catGridLine: { style: 'none' }, showLegend: false,
    showTitle: true, title: '기사 수입 변화 — 현행 대비, 할증 그대로', titleFontSize: 13, titleColor: HEX.muted, titleFontFace: '+mn-lt',
    objectName: '시나리오별 기사 수입 차트',
  })
  const calls = [
    ['−3.7%', K.amber, '합승이 줄이는 승객 할증 부담', '스팟 합승도 동승률 4.9%에 그쳐 할증 문제를 풀지 못한다'],
    ['+5,774원/일', K.teal, '쉐어택 참여 기사 1대 하루 수입 (+1.86%)', '앱 30% 기준. 전체 평균(+0.16%)에는 비참여 기사가 섞여 묽어진다'],
    ['6배', K.teal, '오송 거점 집중 시 귀로 매칭 (하루 6→36건)', '기사 앱 10%는 같고, 승객 앱을 청주 전체 대신 오송에 모았을 때'],
  ]
  calls.forEach(([n, c, l, d], i) => {
    const y = 1.95 + i * 1.6
    T(s, n, { x: 7.7, y, w: 5.0, h: 0.62, fontSize: 30, bold: true, color: c, valign: 'middle' })
    T(s, l, { x: 7.7, y: y + 0.66, w: 5.0, h: 0.3, fontSize: 15, bold: true, color: K.ink })
    T(s, d, { x: 7.7, y: y + 0.98, w: 5.0, h: 0.4, fontSize: 12, color: K.muted })
  })
  source(s, '행위자 기반 시뮬레이션: 택시 2,956대·하루 약 5.6만 건, TIMS 2025 실측(차량당 19.5회·공차 46.5%)에 보정, 2개 시드 평균 · 수요 증가 효과는 기본 0%')
  s.addNotes('청주 택시 2,956대와 하루 약 5.6만 건의 승차를 TIMS 실측에 맞춰 재현한 시뮬레이션입니다. 합승은 택시 운행 건수를 줄이기 때문에 기사 수입이 0.45~0.9% 줄고, 승객의 할증 부담은 3.7%밖에 줄지 않습니다. 반면 귀로 매칭은 빈 차로 돌아오던 길에 손님을 태우므로 기사 수입이 늘어납니다. 앱 이용률 30%면 하루 488건이 귀로 매칭되고, 앱을 쓰는 기사 한 대는 하루 5,774원을 더 법니다. 처음부터 청주 전체가 아니라 오송에 모으면, 같은 기사 수로도 오송의 귀로 매칭이 6배가 됩니다. 할증을 면제해 수요가 10% 늘어난다고 가정하면, 보전 없이도 기사 수입이 1.2% 늘어납니다. 다만 수요 증가는 가정이므로 기본 분석에서는 0%로 두었습니다.')
}

// ================================================================ 7. 정책
pres.addSection({ title: '정책과 실행' })
{
  const s = pres.addSlide({ masterName: 'LIGHT', sectionTitle: '정책과 실행' })
  head(s, '06  정책', '귀로 매칭 운행만 할증 면제, 손실은 수수료로 메운다')
  const th = (t) => ({ text: t, options: { bold: true, color: K.white, fill: { color: K.dark }, fontSize: 12, valign: 'middle', align: 'center' } })
  const td = (t, o = {}) => ({ text: t, options: { fontSize: 13, color: K.ink, valign: 'middle', align: 'center', fill: { color: K.white }, ...o } })
  const hi = { bold: true, color: K.teal }
  s.addTable([
    [th('앱 이용률'), th('귀로 매칭 (하루)'), th('손님 면제액 (1건)'), th('전액 면제 시 기사 수입'), th('보전 없이 가능한 면제'), th('기사 손해 0 보전액 (1건)')],
    [td('30%', { bold: true }), td('488건'), td('4,301원'), td('−0.25%'), td('할증의 39%'), td('2,622원', hi)],
    [td('50%', { bold: true }), td('1,220건'), td('4,285원'), td('−0.83%'), td('할증의 19%'), td('3,462원', hi)],
    [td('100%', { bold: true }), td('4,893건'), td('4,258원'), td('−3.58%'), td('할증의 12%'), td('3,733원', hi)],
  ], { x: 0.6, y: 1.9, w: 12.13, colW: [1.5, 2.0, 2.1, 2.3, 2.1, 2.13], rowH: 0.52, border: { type: 'solid', pt: 1, color: 'DDE3DF' }, objectName: '손익분기 표' })

  card(s, 0.6, 4.4, 5.9, 2.25, K.white, { line: { color: 'DDE3DF', width: 1 } })
  s.addImage({ path: IMG('i_won_d.png'), x: 0.9, y: 4.65, w: 0.7, h: 0.7 })
  T(s, 'A안  시가 보전', { x: 1.8, y: 4.8, w: 4.5, h: 0.4, fontSize: 18, bold: true, color: K.ink })
  T(s, '귀로 1건당 2,600~3,700원을 시 예산으로 지원한다. 손님은 면제액을 모두 받지만, 이용이 늘수록 재정 부담도 커진다.', { x: 0.9, y: 5.55, w: 5.35, h: 1.2, fontSize: 14, color: K.muted, lineSpacingMultiple: 1.25 })

  card(s, 6.83, 4.4, 5.9, 2.25, K.dark)
  s.addImage({ path: IMG('i_phone_a.png'), x: 7.13, y: 4.65, w: 0.7, h: 0.7 })
  T(s, 'B안  매칭 수수료 (제안)', { x: 8.03, y: 4.8, w: 4.5, h: 0.4, fontSize: 18, bold: true, color: K.amber })
  T(s, [
    { text: '앱 30% 기준, 손님이 면제액 4,301원 중 2,622원을 수수료로 내면 ', options: {} },
    { text: '손님 1,679원 이득 · 기사 손해 0 · 시 재정 0', options: { bold: true, color: K.white } },
  ], { x: 7.13, y: 5.55, w: 5.35, h: 1.2, fontSize: 14, color: K.soft, lineSpacingMultiple: 1.25 })
  source(s, '면제는 귀로 매칭 운행에만 적용(시 요금 고시 변경 전제) · 금액은 운행 1건당 기준, 연간 총액은 OD 규모 보정 불확실성 때문에 제시하지 않음')
  s.addNotes('정책 제안은 귀로 매칭으로 이뤄진 운행에만 할증을 면제하는 것입니다. 면제하면 손님은 1건당 약 4,300원을 아끼지만, 기사 수입은 앱 이용 30%일 때 0.25% 줄어듭니다. 이 손실을 누가 메울지가 핵심입니다. A안은 시가 귀로 1건당 2,600~3,700원을 보전하는 방식입니다. B안은 손님이 면제액의 일부를 매칭 수수료로 내는 방식입니다. 앱 30% 기준으로 손님이 2,622원을 내도 1,679원 이득이고, 기사 손해와 시 재정 부담이 모두 0입니다. 그래서 B안을 제안합니다. 보전 없이도 할증의 39%까지는 기사 손해 없이 면제할 수 있습니다.')
}

// ================================================================ 8. 법·실행·한계
{
  const s = pres.addSlide({ masterName: 'DARK', sectionTitle: '정책과 실행' })
  head(s, '07  실행', '법 안에서, 작게 시작해 검증한다')
  const cols = [
    ['i_law_t.png', '법적 장치', ['택시발전법 시행규칙 제11조의2: 본인 확인·좌석 사전 고지·동성끼리', '선례: 반반택시 2019 실증특례 → 2022 동승 합법화', '실명 가입·지인 탑승 알림 반영']],
    ['i_route_a.png', '실행 계획', ['오송역 한 곳·KTX 도착 시간대에 집중해 시작', '오송역 승강장 택시 단체 1곳과 제휴', '기사 인터뷰 [5명] · 설문 [__명] · 현장 관찰', '실증 결과로 귀로 할증 면제 고시 건의']],
    ['i_check_t.png', '한계와 보완', ['결과는 시뮬레이션이며 실측이 아니다', 'OD는 KTDB 2024 평일 자료(비공개 처리)', '요율은 보도 기준(원문 확인 중)']],
  ]
  cols.forEach(([ic, t, items], i) => {
    const x = 0.6 + i * 4.1
    card(s, x, 1.95, 3.9, 3.3, K.dark2)
    s.addImage({ path: IMG(ic), x: x + 0.3, y: 2.2, w: 0.7, h: 0.7 })
    T(s, t, { x: x + 1.15, y: 2.35, w: 2.6, h: 0.4, fontSize: 18, bold: true, color: K.white })
    T(s, items.map((it, j) => ({ text: it, options: { bullet: true, breakLine: j < items.length - 1 } })), { x: x + 0.3, y: 3.15, w: 3.35, h: 2.0, fontSize: 13, color: K.soft, paraSpaceAfter: 4 })
  })
  s.addImage({ path: QR, x: 0.6, y: 5.55, w: 1.2, h: 1.2, objectName: '앱 QR' })
  T(s, '빈 차 귀로를 채우면, 할증의 이유가 사라진다', { x: 2.05, y: 5.6, w: 10.6, h: 0.6, fontSize: 26, bold: true, color: K.white, valign: 'middle' })
  T(s, '앱 체험  taxi-woad-seven.vercel.app', { x: 2.05, y: 6.25, w: 8, h: 0.35, fontSize: 14, color: K.teal })
  s.addNotes('귀로 매칭은 기사가 임의로 손님을 더 태우는 합승이 아니라, 앱으로 미리 확인된 손님을 태우는 운행입니다. 택시발전법 시행규칙 제11조의2에 따라 본인 확인, 탑승 시점·위치·좌석 사전 고지, 동성 탑승을 지킵니다. 배차는 등록된 호출 플랫폼과 제휴하거나 규제샌드박스로 실증합니다. 11월에는 오송역에서 시범 운영을 하고, 기사 인터뷰와 시민 설문으로 검증한 뒤 오송·오창 두 거점에서 실증하고 귀로 할증 면제 고시를 건의하겠습니다. 결과가 시뮬레이션이라는 점, 요율을 보도 기준으로 확인했다는 점은 한계로 밝혀 둡니다. QR로 앱을 바로 체험해 보실 수 있습니다.')
}

// 한글이 단어 중간에서 끊기지 않도록 모든 문단에 eaLnBrk="0"
async function koreanWordWrap(file) {
  const fs = require('fs')
  const JSZip = require(require.resolve('jszip', { paths: [require.resolve('pptxgenjs')] }))
  const zip = await JSZip.loadAsync(fs.readFileSync(file))
  for (const name of Object.keys(zip.files).filter((n) => /^ppt\/(slides|slideLayouts|slideMasters)\/[^/]+\.xml$/.test(n))) {
    let x = await zip.file(name).async('string')
    x = x.replace(/<a:pPr(?![^>]*eaLnBrk)/g, '<a:pPr eaLnBrk="0" latinLnBrk="0"')
    x = x.replace(/lang="en-US"/g, 'lang="ko-KR" altLang="en-US"')
    x = x.replace(/<a:p>(?!<a:pPr)/g, '<a:p><a:pPr eaLnBrk="0" latinLnBrk="0"/>')
    zip.file(name, x)
  }
  fs.writeFileSync(file, await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }))
}

;(async () => {
  await pres.writeFile({ fileName: OUT })
  await koreanWordWrap(OUT)
  console.log('saved', OUT)
})()

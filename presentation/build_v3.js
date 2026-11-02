// 쉐어택 캡스톤 발표 v3 (Uber DESIGN.md 스타일) — 수상작 목차 8장 (배경·페르소나·원인·가치제안·MVP·BMC·검증·실행)
// Usage: npm install && npm run art && node bg.js && node build_v2.js  →  쉐어택_발표_v3.pptx
// 숫자는 docs/자료_출처_정리.md 기준. [ ]는 팀이 채울 자리
const fs = require('fs')
const path = require('path')
const pptxgen = require('pptxgenjs')

const OUT = process.argv[2] || path.join(__dirname, '쉐어택_발표_v3.pptx')
const IMG = (f) => path.join(__dirname, 'img', f)
const QR = path.join(__dirname, '..', 'docs', 'qr_쉐어택.png')
const C = { ink: '000000', white: 'FFFFFF', dark: '000000', dark2: '282828', light: 'F3F3F3', teal: '1D9E75', amber: 'F2A93B', muted: '5E5E5E', mint: 'EFEFEF', soft: 'AFAFAF', line: 'E2E2E2', red: 'C2410C', sand: 'FFF4E5' }
const F = 'Malgun Gothic'

const pres = new pptxgen()
pres.layout = 'LAYOUT_WIDE'
pres.title = '쉐어택'
pres.theme = { headFontFace: F, bodyFontFace: F }

const T = (s, text, o) => s.addText(text, { margin: 0, isTextBox: true, valign: 'top', fontFace: F, ...o })
const shadow = () => undefined   // Uber DESIGN.md: 그림자 없음
const card = (s, x, y, w, h, fill = C.white, o = {}) => s.addShape(pres.ShapeType.roundRect, { x, y, w, h, rectRadius: 0.12, fill: { color: fill }, line: { color: fill === C.white ? C.line : fill, width: 0.75 }, shadow: shadow(), ...o })
const pill = (s, x, y, w, text, fill, color) => { s.addShape(pres.ShapeType.roundRect, { x, y, w, h: 0.34, rectRadius: 0.17, fill: { color: fill }, line: { color: fill, width: 0 } }); T(s, text, { x, y, w, h: 0.34, fontSize: 11, bold: true, color, align: 'center', valign: 'middle' }) }

// 공통 머리: 번호 배지 + 제목 + 한 줄 메시지
function head(s, no, title, msg, dark) {
  s.addShape(pres.ShapeType.roundRect, { x: 0.55, y: 0.4, w: 0.62, h: 0.62, rectRadius: 0.16, fill: { color: C.amber }, line: { color: C.amber, width: 0 }, shadow: shadow() })
  T(s, no, { x: 0.55, y: 0.4, w: 0.62, h: 0.62, fontSize: 18, bold: true, color: C.dark, align: 'center', valign: 'middle' })
  T(s, title, { x: 1.35, y: 0.32, w: 11.3, h: 0.55, fontSize: 30, bold: true, color: dark ? C.white : C.ink, valign: 'middle' })
  T(s, msg, { x: 1.35, y: 0.88, w: 11.3, h: 0.38, fontSize: 15, color: dark ? C.soft : C.muted, valign: 'middle' })
}
const foot = (s, text, dark) => null && T(s, text, { x: 0.55, y: 7.02, w: 11.6, h: 0.32, fontSize: 10.5, color: dark ? C.soft : C.muted, valign: 'middle' })
const pageNo = (s, n, dark) => T(s, `${n} / 8`, { x: 12.1, y: 7.02, w: 0.7, h: 0.32, fontSize: 10.5, color: dark ? C.soft : C.muted, align: 'right', valign: 'middle' })
const bgDark = (s) => s.addImage({ path: IMG('bg3_dark.png'), x: 0, y: 0, w: 13.333, h: 7.5 })
const bgLight = (s) => s.addImage({ path: IMG('bg3_light.png'), x: 0, y: 0, w: 13.333, h: 7.5 })

// ============================================================ 1. 표지 + 연구 배경 + 목차
{
  const s = pres.addSlide(); bgDark(s)
  T(s, '충북대학교 경영대학 캡스톤디자인 · 고경택시', { x: 0.7, y: 0.55, w: 7, h: 0.35, fontSize: 13, bold: true, color: C.amber })
  s.addImage({ path: IMG('logo.png'), x: 0.7, y: 1.1, w: 1.05, h: 1.05 })
  T(s, '쉐어택', { x: 1.95, y: 1.05, w: 5, h: 1.15, fontSize: 54, bold: true, color: C.white, valign: 'middle' })
  T(s, '🚕 택시 앱과 함께 쓰는 할증 도우미', { x: 0.7, y: 2.3, w: 7.2, h: 0.45, fontSize: 20, bold: true, color: C.white })
  T(s, '같은 청주인데, 읍·면만 가면 35% 더 낸다', { x: 0.7, y: 2.78, w: 7.6, h: 0.5, fontSize: 21, bold: true, color: C.amber })
  // 연구 배경 숫자 카드
  const facts = [['💸', '35%', '동↔읍·면 복합할증', C.amber], ['📍', '73%', '읍·면 택시 승차 중\n오송·오창 비중', C.white], ['🚗', '46.5%', '청주 택시\n빈 차 주행 비율', C.white]]
  facts.forEach(([e, n, l, c], i) => {
    const x = 0.7 + i * 2.45
    card(s, x, 3.55, 2.25, 2.0, C.dark2)
    T(s, e, { x: x + 0.2, y: 3.7, w: 0.6, h: 0.5, fontSize: 22 })
    T(s, n, { x: x + 0.2, y: 4.2, w: 2, h: 0.65, fontSize: 32, bold: true, color: c })
    T(s, l, { x: x + 0.2, y: 4.85, w: 2, h: 0.6, fontSize: 11, color: C.soft })
  })
  T(s, '할증은 빈 차로 돌아오는 손실을 메우기 위한 것. 그렇다면 빈 차를 채우면, 할증의 이유도 사라지지 않을까?', { x: 0.7, y: 5.8, w: 7.3, h: 0.8, fontSize: 12.5, italic: true, color: C.white })
  // 목차
  card(s, 8.55, 0.9, 4.2, 5.75, C.white)
  T(s, 'CONTENTS', { x: 8.85, y: 1.1, w: 3.6, h: 0.4, fontSize: 14, bold: true, color: C.teal })
  ;['01 연구 배경', '02 페르소나 · 고객 여정', '03 원인 분석', '04 가치제안 캔버스', '05 MVP · 차별점', '06 비즈니스 모델 캔버스', '07 사업성 검증', '08 실행 계획'].forEach((t, i) => {
    T(s, t, { x: 8.85, y: 1.65 + i * 0.6, w: 3.6, h: 0.45, fontSize: 14, bold: i === 0, color: C.ink, valign: 'middle' })
    if (i < 7) s.addShape(pres.ShapeType.line, { x: 8.85, y: 2.15 + i * 0.6, w: 3.6, h: 0, line: { color: C.line, width: 1 } })
  })
  foot(s, '출처: TIMS 2025 격자·지자체 영업통계(국토교통부), 청주시 요금 보도(천지일보·충청일보)', true)
  s.addNotes('안녕하세요, 고경택시입니다. 같은 청주인데 오송·오창만 가면 택시비가 35% 더 붙습니다. 그런데 시는 이 할증이 빈 차로 돌아오는 손실을 메우기 위한 것이라고 설명합니다. 그렇다면 빈 차를 채우면 할증의 이유도 사라지지 않을까요? 이 질문에서 쉐어택이 시작됐습니다.')
}

// ============================================================ 2. 페르소나 + 고객 여정
{
  const s = pres.addSlide(); bgLight(s)
  head(s, '02', '손님은 할증을, 기사는 빈 차를 떠안는다', '같은 길 위에서 양쪽 모두 손해를 본다 · 팀원들이 직접 겪은 요금 부담')
  const persona = (x, emoji, name, info, quote, pains, tone) => {
    card(s, x, 1.45, 6.0, 2.55)
    T(s, emoji, { x: x + 0.25, y: 1.6, w: 0.9, h: 0.9, fontSize: 40 })
    T(s, name, { x: x + 1.25, y: 1.62, w: 4.5, h: 0.4, fontSize: 16, bold: true, color: C.ink })
    T(s, info, { x: x + 1.25, y: 2.0, w: 4.6, h: 0.32, fontSize: 11, color: C.muted })
    s.addShape(pres.ShapeType.roundRect, { x: x + 1.25, y: 2.4, w: 4.5, h: 0.62, rectRadius: 0.12, fill: { color: tone }, line: { color: tone, width: 0 } })
    T(s, quote, { x: x + 1.4, y: 2.42, w: 4.25, h: 0.58, fontSize: 11.5, italic: true, color: C.ink, valign: 'middle' })
    T(s, pains.map((p, i) => ({ text: p, options: { bullet: true, breakLine: i < pains.length - 1 } })), { x: x + 0.3, y: 3.1, w: 5.5, h: 0.9, fontSize: 14, color: C.ink })
  }
  persona(0.55, '👩‍🔬', '손님 · 팀원의 경험', '충북대 학생 · KTX 타러 오송역을 오가는 길', '"같은 청주인데 오송역만 가면 택시비가 확 뛰어요"', ['😣 35% 할증, 막차 끊기면 대안 없음', '😶 혼자 타기 부담, 같은 방향 사람을 못 찾음'], C.sand)
  persona(6.78, '🧑‍✈️', '기사 · 귀로의 현실', '시내 ↔ 오송·오창을 오가는 택시', '"오송에 손님 내려 주면, 돌아올 땐 빈 차일 때가 많죠"', ['🛣️ 읍·면 하차 후 빈 차 귀로 = 연료·시간 손해', '📱 호출 앱 수수료는 그대로'], C.mint)
  // 고객 여정
  card(s, 0.55, 4.2, 12.23, 2.65)
  T(s, '손님 여정  (지금 → 쉐어택)', { x: 0.8, y: 4.32, w: 6, h: 0.35, fontSize: 13, bold: true, color: C.teal })
  const steps = [['🚄', 'KTX 도착', '😐'], ['🚕', '택시 줄 서기', '😟'], ['💸', '할증 요금 확인', '😡'], ['🧍', '혼자 탑승', '😞'], ['🏠', '시내 도착', '😮‍💨']]
  steps.forEach(([e, t, f], i) => {
    const x = 0.9 + i * 2.38
    s.addShape(pres.ShapeType.ellipse, { x: x + 0.55, y: 4.8, w: 0.7, h: 0.7, fill: { color: C.light }, line: { color: C.line, width: 1 } })
    T(s, e, { x: x + 0.55, y: 4.8, w: 0.7, h: 0.7, fontSize: 20, align: 'center', valign: 'middle' })
    T(s, `${t} ${f}`, { x, y: 5.55, w: 1.8, h: 0.3, fontSize: 11, align: 'center', color: C.ink })
    if (i < 4) s.addShape(pres.ShapeType.line, { x: x + 1.35, y: 5.15, w: 1.6, h: 0, line: { color: C.soft, width: 1.5, dashType: 'dash', endArrowType: 'triangle' } })
  })
  s.addShape(pres.ShapeType.roundRect, { x: 0.8, y: 6.0, w: 11.75, h: 0.7, rectRadius: 0.12, fill: { color: C.mint }, line: { color: C.mint, width: 0 } })
  T(s, 'INSIGHT  ① 손님은 있는데 빈 차와 엇갈린다  ② 기사 손해는 빈 차 귀로다  ③ 할증은 양쪽 모두에게 불만', { x: 1.0, y: 6.0, w: 11.4, h: 0.7, fontSize: 13, bold: true, color: C.dark, valign: 'middle' })
  pageNo(s, 2)
  s.addNotes('손님은 오송역에서 시내까지 할증 포함 요금을 내고, 기사님은 오송에 손님을 내린 뒤 빈 차로 돌아옵니다. 같은 길에서 양쪽 모두 손해를 보고 있는 셈입니다. 이 프로젝트는 팀원들이 오송역을 오가며 직접 겪은 할증 부담에서 시작했습니다.')
}

// ============================================================ 3. 원인 분석
{
  const s = pres.addSlide(); bgLight(s)
  head(s, '03', '할증이 가장 많은 곳이, 빈 차 위험은 가장 낮다', '손님이 없는 게 아니라 엇갈린다 · 9/28 개편은 같은 읍·면 안만 풀어 시내↔오송·오창은 그대로')
  card(s, 0.55, 1.45, 3.7, 5.35)
  T(s, '빈 차 주행 비율', { x: 0.8, y: 1.65, w: 3.3, h: 0.35, fontSize: 13, bold: true, color: C.muted })
  T(s, '46.5%', { x: 0.8, y: 2.0, w: 3.3, h: 0.9, fontSize: 44, bold: true, color: C.ink })
  T(s, '청주 택시 운행거리의 절반 가까이를\n빈 차로 달려요 (TIMS 2025)', { x: 0.8, y: 2.9, w: 3.3, h: 0.6, fontSize: 11, color: C.muted })
  s.addShape(pres.ShapeType.line, { x: 0.8, y: 3.65, w: 3.2, h: 0, line: { color: C.line, width: 1 } })
  T(s, '수요는 충분해요', { x: 0.8, y: 3.8, w: 3.3, h: 0.35, fontSize: 13, bold: true, color: C.muted })
  T(s, [{ text: '오송읍 ', options: {} }, { text: '3,025건/일', options: { bold: true, color: C.teal } }, { text: '\n오창읍 ', options: {} }, { text: '2,617건/일', options: { bold: true, color: C.teal } }, { text: '\n오송역 승차의 ', options: {} }, { text: '52%', options: { bold: true, color: C.amber } }, { text: '가 시내행', options: {} }],
    { x: 0.8, y: 4.15, w: 3.3, h: 1.35, fontSize: 12.5, color: C.ink, lineSpacingMultiple: 1.15 })
  s.addShape(pres.ShapeType.roundRect, { x: 0.8, y: 5.6, w: 3.2, h: 1.0, rectRadius: 0.1, fill: { color: C.sand }, line: { color: C.sand, width: 0 } })
  T(s, '손님이 없는 게 아니라\n빈 차와 손님이 엇갈린다', { x: 0.95, y: 5.6, w: 3.0, h: 1.0, fontSize: 12.5, bold: true, color: C.dark, valign: 'middle' })
  card(s, 4.45, 1.45, 3.6, 5.35)
  s.addImage({ path: IMG('map_risk.png'), x: 4.6, y: 1.75, w: 3.3, h: 2.97 })
  T(s, '🟢 저위험  🟡 중간  🟠 고위험\n가중치를 6가지로 바꿔도 오창·오송·옥산은\n늘 저위험 (순위 상관 0.92~0.99)', { x: 4.65, y: 4.9, w: 3.25, h: 1.4, fontSize: 11, color: C.ink, lineSpacingMultiple: 1.25 })
  card(s, 8.25, 1.45, 4.53, 5.35)
  const rows = [['오창', 0.014], ['오송', 0.188], ['옥산', 0.376], ['내수', 0.402], ['강내', 0.406], ['남이', 0.456], ['남일', 0.531], ['북이', 0.692], ['문의', 0.788], ['현도', 0.797], ['미원', 0.847], ['낭성', 0.863], ['가덕', 0.877]]
  s.addChart(pres.ChartType.bar, [{ name: '빈 차 귀로 위험 지수', labels: rows.map((r) => r[0]), values: rows.map((r) => r[1]) }], {
    x: 8.35, y: 1.6, w: 4.3, h: 5.1, barDir: 'bar', catAxisOrientation: 'maxMin', valAxisHidden: true, valAxisMaxVal: 1, valAxisMinVal: 0,
    chartColors: rows.map((r) => (r[1] < 0.39 ? C.teal : r[1] < 0.7 ? 'C9D1CD' : C.amber)), valueBarColors: true, barGapWidthPct: 40,
    showValue: true, dataLabelPosition: 'outEnd', dataLabelFormatCode: '0.00', dataLabelFontSize: 9, dataLabelColor: C.ink,
    catAxisLabelColor: C.ink, catAxisLabelFontSize: 10, catAxisLineShow: false, valGridLine: { style: 'none' }, showLegend: false,
    showTitle: true, title: '빈 차 귀로 위험 지수 (0 낮음 ~ 1 높음)', titleFontSize: 11, titleColor: C.muted,
  })
  foot(s, '지수 = 승차 밀도 0.5 + 버스정류장 부족 0.25 + 시내까지 거리 0.25 · 시내행 비율은 KTDB 2024 평일 OD 기준 추정')
  pageNo(s, 3)
  s.addNotes('빈 차로 돌아올 위험을 지수로 매겨 보면 오창, 오송, 옥산이 가장 낮습니다. 할증이 가장 많이 붙는 곳이 오히려 빈 차 위험이 가장 낮다는 뜻입니다. 문제는 손님이 없는 게 아니라 엇갈림입니다.')
}

// ============================================================ 4. 가치제안 캔버스
{
  const s = pres.addSlide(); bgLight(s)
  head(s, '04', '손님은 싸게, 기사는 더 번다', '한쪽만 이득이면 오래가지 못한다 · 가치제안 캔버스')
  const cols = [['', 1.95], ['👤 손님', 5.1], ['🚕 기사', 5.1]]
  const rows = [
    ['🎯 하려는 일', '오송역·산단 ↔ 시내 이동', '하루 수입 올리기'],
    ['😣 불편 (Pains)', '35% 할증, 막차 끊김, 혼자 타는 부담', '읍·면 하차 후 빈 차 귀로, 호출 수수료'],
    ['😊 바라는 것 (Gains)', '싸고 빠른 귀가, 같은 방향 동행', '돌아가는 길에도 손님'],
    ['📱 쉐어택 서비스', '주소·GPS 검색, 요금 비교, 주변 모집, 왕복 매칭', '귀로 손님 대기 현황, 빈 차 vs 귀로 수입 비교'],
    ['💊 불편 해소', '3명이면 1인 5,900원 (혼자 17,500원)\n왕복 매칭이면 양쪽 할증 없음', '빈 차 0원 → 귀로 손님 +17,500원'],
    ['🚀 이득 창출', 'KTX 도착·막차 맞춤 모집, 지인 탑승 알림', '참여 기사 하루 +5,774원 (시뮬레이션)'],
  ]
  let y = 1.45
  cols.forEach(([t, w], j) => { const x = 0.55 + (j === 0 ? 0 : j === 1 ? 2.05 : 7.25); if (t) { s.addShape(pres.ShapeType.roundRect, { x, y, w, h: 0.5, rectRadius: 0.1, fill: { color: j === 1 ? C.amber : C.teal }, line: { color: C.white, width: 0 }, shadow: shadow() }); T(s, t, { x, y, w, h: 0.5, fontSize: 15, bold: true, color: j === 1 ? C.dark : C.white, align: 'center', valign: 'middle' }) } })
  rows.forEach((r, i) => {
    const yy = 2.1 + i * 0.8
    card(s, 0.55, yy, 1.95, 0.7, C.dark)
    T(s, r[0], { x: 0.65, y: yy, w: 1.8, h: 0.7, fontSize: 11.5, bold: true, color: C.white, valign: 'middle' })
    ;[[2.6, r[1]], [7.8, r[2]]].forEach(([x, t]) => { card(s, x, yy, 5.1, 0.7, i >= 4 ? C.mint : C.white); T(s, t, { x: x + 0.2, y: yy, w: 4.75, h: 0.7, fontSize: 12.5, color: C.ink, valign: 'middle' }) })
  })
  foot(s, '불편 해소·이득 창출의 금액은 오송역→가경동(13.8km) 예시와 행위자 시뮬레이션(앱 이용 30%) 기준')
  pageNo(s, 4)
  s.addNotes('손님에게는 할증 없는 귀가를, 기사님에게는 빈 차 대신 수입을 줍니다. 한쪽만 이득을 보는 게 아니라 양쪽이 모두 이득을 보는 구조라서 지속될 수 있습니다.')
}

// ============================================================ 5. MVP + 차별점
{
  const s = pres.addSlide(); bgLight(s)
  head(s, '05', '택시 앱을 바꾸지 않고, 할증 없는 길을 더한다', '① 주소·GPS로 출발·도착 → ② 할증 없이 가기 확인 → ③ 모집 열기·참여')
  ;[['shot_ride.png', 2.3, '👤 손님 화면'], ['shot_driver.png', 2.0, '🚕 기사 화면']].forEach(([f, w, cap], i) => {
    const x = 0.55 + i * 2.52
    card(s, x, 1.45, w + 0.14, 3.95, C.ink)
    s.addImage({ path: IMG(f), x: x + 0.07, y: 1.52, w, h: 3.8, sizing: { type: 'crop', w, h: 3.8 } })
    T(s, cap, { x, y: 5.45, w: w + 0.14, h: 0.3, fontSize: 11, bold: true, color: C.ink, align: 'center' })
  })
  s.addImage({ path: QR, x: 0.75, y: 5.85, w: 0.95, h: 0.95 })
  T(s, '직접 써 보기\ntaxi-woad-seven.vercel.app\n체험 계정 A·B', { x: 1.85, y: 5.85, w: 2.6, h: 0.95, fontSize: 10.5, color: C.ink, valign: 'middle' })
  // 할증 없이 가는 3가지 경우
  card(s, 5.25, 1.45, 7.53, 2.45)
  T(s, '할증 없이 가는 3가지 경우 (팀원 아이디어)', { x: 5.5, y: 1.58, w: 7, h: 0.35, fontSize: 13, bold: true, color: C.teal })
  ;[['🔁', '왕복 매칭', '갈 때 탈 사람이 돌아올 손님을 미리 구함 → 양쪽 할증 0원', C.mint], ['⏱️', '귀로 연계 결제', '할증 포함 가승인 → 30분 안 귀로 손님 태우면 할증 빼고 결제', C.sand], ['🧾', '앱 없이 현장 승차', '지금처럼 미터기 요금 · 노쇼는 할증분 부담', C.light]].forEach(([e, t, d, f], i) => {
    const x = 5.5 + i * 2.4
    s.addShape(pres.ShapeType.roundRect, { x, y: 2.02, w: 2.28, h: 1.72, rectRadius: 0.1, fill: { color: f }, line: { color: f, width: 0 } })
    T(s, `${e} ${t}`, { x: x + 0.12, y: 2.12, w: 2.05, h: 0.35, fontSize: 12.5, bold: true, color: C.ink })
    T(s, d, { x: x + 0.12, y: 2.5, w: 2.05, h: 1.2, fontSize: 11.5, color: C.ink })
  })
  // 경쟁 비교
  const th = (t, hi) => ({ text: t, options: { bold: true, color: C.white, fill: { color: hi ? C.teal : C.dark }, fontSize: 12, align: 'center', valign: 'middle' } })
  const td = (t, hi) => ({ text: t, options: { fontSize: 11.5, color: C.ink, fill: { color: hi ? C.mint : C.white }, align: 'center', valign: 'middle', bold: !!hi } })
  s.addTable([
    [th(''), th('호출 앱 (카카오T 등)'), th('반반택시 (동승)'), th('🚕 쉐어택', true)],
    [td('핵심'), td('가까운 빈 차 호출'), td('같은 방향 동승'), td('돌아가는 빈 차와 방향 맞추기', true)],
    [td('할증'), td('그대로'), td('그대로'), td('귀로 운행 면제 (시 정책 연동)', true)],
    [td('기사'), td('호출 수수료 부담'), td('—'), td('귀로 수입 증가', true)],
    [td('관계'), td('—'), td('동승 중단 → B2B 전환'), td('택시 앱 옆 도우미 (제휴)', true)],
  ], { x: 5.25, y: 4.1, w: 7.53, colW: [0.9, 2.0, 2.0, 2.63], rowH: 0.5, border: { type: 'solid', pt: 1, color: C.line } })
  foot(s, '반반택시: 2019 규제샌드박스 실증특례 → 2022 동승 합법화, 이후 동승 중단·B2B 전환(한국경제 2026.4) · 귀로 연계 결제는 시범(모의)')
  pageNo(s, 5)
  s.addNotes('쉐어택은 카카오T 같은 택시 앱을 대신하지 않습니다. 부르기 전에는 같은 방향 손님과 돌아가는 빈 차를 찾아 주고, 부른 뒤에는 할증 없이 가는 방법을 알려 줍니다. 특히 왕복 매칭은 같은 차를 갈 때와 올 때 따로 타는 것이라 합승이 아니고, 성별 제한도 필요 없습니다.')
}

// ============================================================ 6. 비즈니스 모델 캔버스
{
  const s = pres.addSlide(); bgLight(s)
  head(s, '06', '시 예산 0원으로 할증을 없앤다', '손님 1,679원 이득 · 기사 손해 0 · 플랫폼 건당 약 400원 · 비즈니스 모델 캔버스')
  const blk = (x, y, w, h, title, body, fill = C.white) => { card(s, x, y, w, h, fill); T(s, title, { x: x + 0.15, y: y + 0.1, w: w - 0.3, h: 0.32, fontSize: 13.5, bold: true, color: C.teal }); T(s, body, { x: x + 0.15, y: y + 0.5, w: w - 0.3, h: h - 0.6, fontSize: 12.5, color: C.ink, lineSpacingMultiple: 1.3 }) }
  const W = 2.38, X = (i) => 0.55 + i * (W + 0.08)
  blk(X(0), 1.4, W, 3.6, '🤝 핵심 파트너', '청주시 교통정책과\n등록 호출 플랫폼\n택시조합·운수사\n코레일(오송역)')
  blk(X(1), 1.4, W, 1.76, '⚙️ 핵심 활동', '귀로·왕복 매칭 운영\n기사 제휴, 시와 실증')
  blk(X(1), 3.24, W, 1.76, '🧰 핵심 자원', 'TIMS·OD 분석 모델\n매칭 알고리즘, 앱')
  blk(X(2), 1.4, W, 3.6, '💎 가치 제안', '손님: 할증 없는 귀가\n기사: 빈 차 → 수입\n시: 할증 민원·보전 예산 감소\n사회: 빈 차 주행·탄소 감소', C.sand)
  blk(X(3), 1.4, W, 1.76, '💬 고객 관계', '시범 운영, 평가·신뢰 점수\n지인 탑승 알림')
  blk(X(3), 3.24, W, 1.76, '📣 채널', '앱(휴대폰 웹), 오송역 QR\n산단·대학 제휴, 모집 공유')
  blk(X(4), 1.4, W, 3.6, '👥 고객', '오송·오창↔시내 이동 손님\n(KTX·산단·바이오단지)\n읍·면 운행 택시 기사\n청주시 (B2G)')
  blk(0.55, 5.1, 6.0, 1.75, '💰 비용 구조', '서버·검색 API, 기사 모집 인센티브, 홍보\n(지도·결제는 기존 서비스 활용 → 비용 최소화)')
  blk(6.78, 5.1, 6.0, 1.75, '💵 수익원', '귀로 매칭 수수료 2,622원/건 → 기사 보전 (손님은 그래도 1,679원 이득)\n노쇼 수수료 (할증분 → 기사 보전)\n플랫폼 몫: 운임의 2.8%(약 400원/건, 카카오T블루 가맹 수수료 수준) · B2G 데이터 리포트', C.mint)
  foot(s, 'B안: 앱 이용 30% 기준 손님 면제액 4,301원 중 2,622원을 수수료로 → 손님 1,679원 이득 · 기사 손해 0 · 시 재정 0 (시뮬레이션)')
  pageNo(s, 6)
  s.addNotes('핵심은 수익 구조입니다. 귀로 운행 할증을 면제하면 손님은 건당 약 4,300원을 아끼는데, 이 중 2,622원을 매칭 수수료로 받아 기사님에게 보전하면 기사님 손해는 0, 시 재정도 0이 됩니다. 손님은 그래도 1,679원 이득입니다.')
}

// ============================================================ 7. 사업성 검증
{
  const s = pres.addSlide(); bgLight(s)
  head(s, '07', '시민 63%가 할증 때문에 택시를 포기했다', '참여 기사는 하루 5,774원을 더 번다 · 사업성 검증')
  card(s, 0.55, 1.45, 5.2, 5.4)
  s.addChart(pres.ChartType.bar, [{ name: '기사 수입 변화(%)', labels: ['합승', '스팟 합승\n+귀로', '귀로 매칭\n(앱 30%)', '귀로 매칭\n(앱 100%)'], values: [-0.45, -0.9, 0.16, 0.5] }], {
    x: 0.65, y: 1.55, w: 5.0, h: 5.2, barDir: 'col', chartColors: [C.soft, C.soft, C.teal, C.teal], valueBarColors: true, barGapWidthPct: 50,
    showValue: true, dataLabelPosition: 'outEnd', dataLabelFormatCode: '+0.00"%";-0.00"%"', dataLabelFontSize: 11, dataLabelFontBold: true, dataLabelColor: C.ink,
    valAxisHidden: true, valAxisMinVal: -1.2, valAxisMaxVal: 0.8, catAxisLabelColor: C.ink, catAxisLabelFontSize: 10, catAxisLabelPos: 'low',
    valGridLine: { style: 'none' }, showLegend: false, showTitle: true, title: '기사 수입 변화 (현행 대비, 할증 그대로)', titleFontSize: 12, titleColor: C.muted,
  })
  const big = [['+5,774원', '참여 기사 1대 하루 수입 (+1.86%)', C.teal], ['6배', '오송에 집중하면 귀로 매칭 6→36건/일', C.teal], ['−3.7%', '합승이 줄이는 할증 부담은 이 정도뿐', C.amber]]
  big.forEach(([n, l, c], i) => { const x = 5.95 + i * 2.3; card(s, x, 1.45, 2.18, 1.55); T(s, n, { x: x + 0.15, y: 1.55, w: 1.95, h: 0.7, fontSize: 24, bold: true, color: c }); T(s, l, { x: x + 0.15, y: 2.22, w: 1.95, h: 0.75, fontSize: 12, color: C.muted }) })
  const th = (t) => ({ text: t, options: { bold: true, color: C.white, fill: { color: C.dark }, fontSize: 11.5, align: 'center', valign: 'middle' } })
  const td = (t, hi) => ({ text: t, options: { fontSize: 12, color: hi ? C.teal : C.ink, bold: !!hi, fill: { color: C.white }, align: 'center', valign: 'middle' } })
  s.addTable([[th('앱 이용률'), th('귀로 매칭/일'), th('손님 면제액'), th('보전 없이 면제'), th('손해 0 보전액')],
    [td('30%'), td('488건'), td('4,301원'), td('할증의 39%'), td('2,622원', 1)], [td('50%'), td('1,220건'), td('4,285원'), td('19%'), td('3,462원', 1)], [td('100%'), td('4,893건'), td('4,258원'), td('12%'), td('3,733원', 1)]],
    { x: 5.95, y: 3.2, w: 6.83, rowH: 0.4, border: { type: 'solid', pt: 1, color: C.line } })
  card(s, 5.95, 5.0, 6.83, 1.85, C.sand)
  T(s, '시민 설문 57명 (2026.10) · 핵심 타깃 대학생 84%', { x: 6.15, y: 5.08, w: 6.4, h: 0.35, fontSize: 13, bold: true, color: C.dark })
  s.addChart(pres.ChartType.bar, [{ name: '응답 비율', labels: ['할증 때문에 택시 포기·대체', '읍·면 35% 할증 불합리', '할증 없으면 이용 증가', '조건부 나눠 타기 의향'], values: [63, 74, 93, 96] }], {
    x: 6.1, y: 5.42, w: 6.55, h: 1.38, barDir: 'bar', catAxisOrientation: 'maxMin', valAxisHidden: true, valAxisMaxVal: 115, valAxisMinVal: 0,
    chartColors: [C.amber, C.amber, C.teal, C.teal], valueBarColors: true, barGapWidthPct: 35, showValue: true, dataLabelPosition: 'outEnd',
    dataLabelFormatCode: '0"%"', dataLabelFontSize: 12, dataLabelFontBold: true, dataLabelColor: C.ink, catAxisLabelColor: C.ink, catAxisLabelFontSize: 11,
    catAxisLineShow: false, valGridLine: { style: 'none' }, showLegend: false,
  })
  foot(s, '시뮬레이션: 택시 2,956대·하루 약 5.6만 건, TIMS 2025 실측 보정(실측 아님) · 설문: 57명 중 대학생 84% = 요금에 가장 민감한 초기 타깃 · 요금 분담은 거리 비율 선호 68% → 개선 과제')
  pageNo(s, 7)
  s.addNotes('청주 택시를 그대로 재현한 시뮬레이션 결과, 합승은 기사 수입을 깎지만 귀로 매칭은 늘립니다. 앱을 쓰는 기사님은 하루 5,774원을 더 법니다. 처음부터 청주 전체가 아니라 오송에 모으면 같은 기사 수로도 매칭이 6배가 됩니다. 시민 설문 57명에서도 63%가 할증 때문에 택시를 포기하거나 다른 수단을 썼고, 96%가 조건만 맞으면 나눠 타겠다고 답했습니다. 3명이 나눠 타면 66% 저렴해 응답자가 원한 할인 폭을 모두 넘습니다.')
}

// ============================================================ 8. 실행 계획
{
  const s = pres.addSlide(); bgDark(s)
  head(s, '08', '오송역 한 곳에서 시작해 할증 면제까지', '1차 목표: 오송 귀로 매칭 하루 36건 (기사 10%·승객 앱 오송 집중 시뮬레이션) · 참여 기사 하루 +5,774원', true)
  ;[['1️⃣', '오송역 시범', 'KTX 도착 시간대 집중'], ['2️⃣', '제휴', '승강장 택시 단체·호출 플랫폼'], ['3️⃣', '거점 확대', '오송·오창 실증, 데이터 축적'], ['4️⃣', '정책 건의', '귀로 운행 할증 면제 고시']].forEach(([e, t, d], i) => {
    const x = 0.55 + i * 3.1
    card(s, x, 1.45, 2.85, 1.35, C.dark2)
    T(s, `${e} ${t}`, { x: x + 0.2, y: 1.55, w: 2.5, h: 0.45, fontSize: 15, bold: true, color: C.white })
    T(s, d, { x: x + 0.2, y: 2.05, w: 2.5, h: 0.6, fontSize: 12.5, color: C.soft })
    if (i < 3) T(s, '➜', { x: x + 2.83, y: 1.85, w: 0.3, h: 0.5, fontSize: 16, color: C.amber })
  })
  const sw = [['💪 S 강점', '데이터 근거, 시 정책 연동\n손님·기사 모두 이득', C.teal], ['⚠️ W 약점', '초기 이용자 확보\n제휴 필요', 'C9D1CD'], ['🌱 O 기회', '9/28 개편 여론, KTX 수요\n반반택시 선례', C.amber], ['🌩️ T 위협', '대형 호출 앱 진입\n업계 반발', 'E8A87C']]
  sw.forEach(([t, d, c], i) => { const x = 0.55 + (i % 2) * 3.05, y = 3.0 + Math.floor(i / 2) * 1.55; card(s, x, y, 2.9, 1.42, C.white); s.addShape(pres.ShapeType.rect, { x, y, w: 2.9, h: 0.08, fill: { color: c }, line: { color: c, width: 0 } }); T(s, t, { x: x + 0.15, y: y + 0.15, w: 2.6, h: 0.38, fontSize: 14.5, bold: true, color: C.ink }); T(s, d, { x: x + 0.15, y: y + 0.58, w: 2.6, h: 0.8, fontSize: 14, color: C.ink }) })
  card(s, 6.75, 3.0, 6.03, 2.97, C.dark2)
  T(s, '법 · 기대 효과 · 한계', { x: 6.95, y: 3.1, w: 5.6, h: 0.35, fontSize: 13, bold: true, color: C.amber })
  T(s, [
    { text: '법: 왕복 매칭은 동승이 아니라 합승 규제 밖, 합승은 택시발전법 시행규칙 제11조의2 준수', options: { bullet: true, breakLine: true } },
    { text: '효과: 손님 할증↓ · 기사 공차↓ 수입↑ · 시 보전 예산↓ · 빈 차 주행·탄소↓', options: { bullet: true, breakLine: true } },
    { text: '한계: 시뮬레이션 기반, 요율 보도 기준, 면제는 시 고시 변경 필요', options: { bullet: true } },
  ], { x: 6.95, y: 3.6, w: 5.65, h: 2.3, fontSize: 14, color: C.white, paraSpaceAfter: 12, lineSpacingMultiple: 1.2 })
  s.addImage({ path: QR, x: 0.55, y: 6.15, w: 0.8, h: 0.8 })
  T(s, '빈 차를 채우면, 할증의 이유가 사라진다', { x: 1.55, y: 6.15, w: 11, h: 0.5, fontSize: 20, bold: true, color: C.white, valign: 'middle' })
  T(s, '앱 체험 taxi-woad-seven.vercel.app', { x: 1.55, y: 6.62, w: 6, h: 0.3, fontSize: 11, color: C.teal })
  pageNo(s, 8, true)
  s.addNotes('오송역 한 곳, KTX 도착 시간대부터 작게 시작하고, 택시 단체와 제휴한 뒤 데이터를 쌓아 시에 귀로 운행 할증 면제를 건의하겠습니다. 빈 차 귀로를 채우면, 할증의 이유가 사라집니다. 감사합니다.')
}

// 한글 단어가 중간에서 끊기지 않게 + 한국어 언어 태그
async function koreanWordWrap(file) {
  const JSZip = require(require.resolve('jszip', { paths: [require.resolve('pptxgenjs')] }))
  const zip = await JSZip.loadAsync(fs.readFileSync(file))
  for (const name of Object.keys(zip.files).filter((n) => /^ppt\/(slides|slideLayouts|slideMasters)\/[^/]+\.xml$/.test(n))) {
    let x = await zip.file(name).async('string')
    x = x.replace(/<a:pPr(?![^>]*eaLnBrk)/g, '<a:pPr eaLnBrk="0" latinLnBrk="0"').replace(/<a:p>(?!<a:pPr)/g, '<a:p><a:pPr eaLnBrk="0" latinLnBrk="0"/>').replace(/lang="en-US"/g, 'lang="ko-KR" altLang="en-US"')
    zip.file(name, x)
  }
  fs.writeFileSync(file, await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }))
}

;(async () => { await pres.writeFile({ fileName: OUT }); await koreanWordWrap(OUT); console.log('saved', OUT) })()

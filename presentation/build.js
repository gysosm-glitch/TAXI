// 쉐어택 캡스톤 발표자료 (최종본) — 수상작 목차 8장 (배경·페르소나·원인·가치제안·MVP·BMC·검증·실행)
// 디자인: 로고의 '갈 때 실선 · 돌아올 때 점선' 도로, 택시 미터기 숫자, 실사 사진을 바꾼 판화풍 그림
//   색 뜻: 호박색 = 할증·문제, 초록 = 쉐어택의 해결
//   글꼴: 제목 검은고딕(Black Han Sans), 본문 IBM Plex Sans KR — presentation/fonts/ (팀원은 설치 후 수정)
//   흐름: 지금(문제) ↔ 바뀌면(해결)을 번갈아, 3장·7장은 어두운 화면·큰 숫자로 리듬을 끊는다
// Usage: npm install && npm run art && node bg3.js && node photos.js && node build.js && powershell -File embed_fonts.ps1
// 숫자는 docs/자료_출처_정리.md 기준. 사진 출처는 docs/사진_출처.md (화면에는 넣지 않고 발표자 노트에만)
const fs = require('fs')
const path = require('path')
const pptxgen = require('pptxgenjs')

const OUT = process.argv[2] || path.join(__dirname, '쉐어택_발표자료.pptx')
const IMG = (f) => path.join(__dirname, 'img', f)
const QR = path.join(__dirname, '..', 'docs', 'qr_쉐어택.png')
const SEG = JSON.parse(fs.readFileSync(IMG('seg.json'), 'utf8'))
const C = {
  night: '0F2A22', panel: '1A3D32', meter: '08130F', ink: '12201B', white: 'FFFFFF', paper: 'F4F6F3',
  amber: 'F2A93B', amberSoft: 'FCEFD8', teal: '1D9E75', led: '3FD39F', tealSoft: 'DDF1E9',
  muted: '56655F', soft: 'A9BDB4', pale: 'D5E2DC', line: 'DCE3DF', grey: 'C9D1CD', road: 'E2E8E4',
}
const F = 'IBM Plex Sans KR'   // 본문
const TF = 'Black Han Sans'    // 제목·큰 숫자 (굵기 하나뿐이라 bold 쓰지 않음)
const SECTIONS = ['연구 배경', '페르소나·여정', '원인 분석', '가치제안', 'MVP·차별점', '비즈니스 모델', '사업성 검증', '실행 계획']

const pres = new pptxgen()
pres.layout = 'LAYOUT_WIDE'
pres.title = '쉐어택 발표자료'
pres.theme = { headFontFace: TF, bodyFontFace: F }

const T = (s, text, o) => s.addText(text, { margin: 0, isTextBox: true, valign: 'top', fontFace: F, lineSpacingMultiple: 1.15, ...o })
const H = (s, text, o) => T(s, text, { fontFace: TF, bold: false, lineSpacingMultiple: 1.05, ...o })   // 제목 글꼴
const card = (s, x, y, w, h, fill = C.white, o = {}) => s.addShape(pres.ShapeType.roundRect, { x, y, w, h, rectRadius: 0.12, fill: { color: fill }, line: { color: fill === C.white ? C.line : fill, width: 0.75 }, ...o })
const box = (s, x, y, w, h, fill, r = 0.1) => s.addShape(pres.ShapeType.roundRect, { x, y, w, h, rectRadius: r, fill: { color: fill }, line: { color: fill, width: 0 } })
const dot = (s, cx, cy, d, fill, line) => s.addShape(pres.ShapeType.ellipse, { x: cx - d / 2, y: cy - d / 2, w: d, h: d, fill: { color: fill }, line: { color: line ?? fill, width: line ? 1.5 : 0 } })
const dash = (s, x, y, w, color, width = 2.5) => s.addShape(pres.ShapeType.line, { x, y, w, h: 0, line: { color, width, dashType: 'dash' } })
const seg = (s, key, x, y, h) => { const w = h * SEG[key]; s.addImage({ path: IMG(`seg_${key}.png`), x, y, w, h }); return w }
// 도로 한 토막 (회색 바탕 + 호박색 점선 중앙선, 끝은 화살표)
function road(s, x, y, w, h = 0.46, arrow = true) {
  s.addShape(arrow ? pres.ShapeType.homePlate : pres.ShapeType.rect, { x, y, w, h, fill: { color: C.road }, line: { color: C.road, width: 0 } })
  dash(s, x + 0.1, y + h / 2, w - (arrow ? 0.45 : 0.2), C.amber, 2)
}

function head(s, no, title, msg, dark) {
  H(s, [{ text: no, options: { color: C.amber } }, { text: `  ${title}`, options: { color: dark ? C.white : C.ink } }], { x: 0.55, y: 0.3, w: 12.3, h: 0.66, fontSize: 30, valign: 'middle' })
  T(s, msg, { x: 0.55, y: 0.97, w: 12.3, h: 0.36, fontSize: 15, color: dark ? C.soft : C.muted, valign: 'middle' })
}
// 아래쪽: 표지 목차와 같은 노선, 지금 몇 번째 정류장인지
function footer(s, n, dark) {
  const x0 = 0.55, step = 0.28, y = 7.15
  s.addShape(pres.ShapeType.line, { x: x0, y, w: step * 7, h: 0, line: { color: dark ? C.panel : C.line, width: 2 } })
  for (let i = 0; i < 8; i++) {
    if (i === n - 1) dot(s, x0 + i * step, y, 0.17, C.amber)
    else dot(s, x0 + i * step, y, 0.08, i < n - 1 ? C.teal : dark ? C.panel : C.grey)
  }
  T(s, SECTIONS[n - 1], { x: x0 + step * 7 + 0.25, y: y - 0.15, w: 3, h: 0.3, fontSize: 11, color: dark ? C.soft : C.muted, valign: 'middle' })
  T(s, `${n} / 8`, { x: 12.1, y: y - 0.15, w: 0.7, h: 0.3, fontSize: 11, color: dark ? C.soft : C.muted, align: 'right', valign: 'middle' })
}
const bg = (s, f) => s.addImage({ path: IMG(f), x: 0, y: 0, w: 13.333, h: 7.5 })
const bgLight = (s) => bg(s, 'bg3_light.png')
const credit = (t) => `\n\n[사진 출처] ${t} · 위키미디어 공용, 그림풍으로 변경 (docs/사진_출처.md)`
const chartFont = { dataLabelFontFace: F, catAxisLabelFontFace: F, titleFontFace: F, valAxisLabelFontFace: F }

// ============================================================ 1. 표지 + 연구 배경 + 목차(노선)
{
  const s = pres.addSlide(); bg(s, 'p_cover.jpg')
  T(s, '충북대학교 경영대학 캡스톤디자인 · 고경택시', { x: 0.7, y: 0.55, w: 7, h: 0.35, fontSize: 13, bold: true, color: C.amber })
  s.addImage({ path: IMG('logo.png'), x: 0.7, y: 1.1, w: 1.05, h: 1.05 })
  H(s, '쉐어택', { x: 1.98, y: 1.0, w: 5, h: 1.2, fontSize: 64, color: C.white, valign: 'middle' })
  T(s, '택시 앱과 함께 쓰는 할증 도우미', { x: 0.7, y: 2.4, w: 7, h: 0.45, fontSize: 20, bold: true, color: C.white })
  H(s, '같은 청주인데, 읍·면만 가면 35% 더 낸다', { x: 0.7, y: 2.92, w: 7.5, h: 0.55, fontSize: 25, color: C.amber })
  T(s, '할증은 빈 차로 돌아오는 손실을 메우기 위한 것.\n그렇다면 빈 차를 채우면, 할증의 이유도 사라지지 않을까?', { x: 0.7, y: 3.6, w: 6.8, h: 0.85, fontSize: 15, color: C.pale, lineSpacingMultiple: 1.3 })
  // 택시 미터기
  s.addShape(pres.ShapeType.roundRect, { x: 8.25, y: 0.75, w: 4.5, h: 3.65, rectRadius: 0.16, fill: { color: C.meter, transparency: 8 }, line: { color: C.panel, width: 1.5 } })
  box(s, 8.55, 1.02, 0.7, 0.32, C.amber, 0.16)
  T(s, '할증', { x: 8.55, y: 1.02, w: 0.7, h: 0.32, fontSize: 11, bold: true, color: C.night, align: 'center', valign: 'middle' })
  T(s, '동↔읍·면 복합할증', { x: 9.38, y: 1.02, w: 3.2, h: 0.32, fontSize: 12, color: C.soft, valign: 'middle' })
  seg(s, '35p', 8.55, 1.55, 1.3)
  s.addShape(pres.ShapeType.line, { x: 8.55, y: 3.1, w: 3.9, h: 0, line: { color: C.panel, width: 1 } })
  seg(s, '73p', 8.55, 3.28, 0.48)
  T(s, '읍·면 승차 중 오송·오창', { x: 8.55, y: 3.85, w: 2.0, h: 0.35, fontSize: 11, color: C.soft })
  seg(s, '465p', 10.65, 3.28, 0.48)
  T(s, '청주 택시 빈 차 주행', { x: 10.65, y: 3.85, w: 2.0, h: 0.35, fontSize: 11, color: C.soft })
  // 목차 = 노선: 8개 정류장
  T(s, '오늘 가는 길', { x: 0.7, y: 4.72, w: 3, h: 0.35, fontSize: 13, bold: true, color: C.soft })
  s.addShape(pres.ShapeType.rect, { x: 0, y: 5.2, w: 13.333, h: 0.8, fill: { color: '07140F', transparency: 15 }, line: { color: '07140F', width: 0 } })
  dash(s, 0, 5.6, 13.333, C.amber, 2.5)
  SECTIONS.forEach((t, i) => {
    const cx = 0.95 + i * 1.63
    dot(s, cx, 5.6, 0.5, C.amber, C.night)
    T(s, String(i + 1).padStart(2, '0'), { x: cx - 0.25, y: 5.35, w: 0.5, h: 0.5, fontSize: 13, bold: true, color: C.night, align: 'center', valign: 'middle' })
    T(s, t, { x: cx - 0.8, y: 6.12, w: 1.6, h: 0.35, fontSize: 14, bold: true, color: C.white, align: 'center' })
  })
  s.addNotes('안녕하세요, 고경택시입니다. 같은 청주인데 오송·오창만 가면 택시비가 35% 더 붙습니다. 그런데 시는 이 할증이 빈 차로 돌아오는 손실을 메우기 위한 것이라고 설명합니다. 그렇다면 빈 차를 채우면 할증의 이유도 사라지지 않을까요? 이 질문에서 쉐어택이 시작됐습니다.' + credit('Cheongju Old Town at Night, Minseong Kim, CC BY-SA 4.0'))
}

// ============================================================ 2. 페르소나 + 고객 여정 (지금의 문제)
{
  const s = pres.addSlide(); bgLight(s)
  head(s, '02', '손님은 할증을, 기사는 빈 차를 떠안는다', '같은 길 위에서 양쪽 모두 손해를 본다')
  const persona = (x, img, fill, dark, name, info, said, pains) => {
    card(s, x, 1.5, 6.0, 2.6, fill)
    s.addImage({ path: IMG(img), x: x + 0.15, y: 1.65, w: 1.9, h: 2.25 })
    H(s, name, { x: x + 2.3, y: 1.7, w: 3.5, h: 0.4, fontSize: 19, color: dark ? C.white : C.ink })
    T(s, info, { x: x + 2.3, y: 2.12, w: 3.55, h: 0.3, fontSize: 11.5, color: dark ? C.soft : C.muted })
    T(s, said, { x: x + 2.3, y: 2.5, w: 3.55, h: 0.75, fontSize: 15.5, bold: true, color: dark ? C.amber : C.ink, lineSpacingMultiple: 1.2 })
    T(s, pains.map((p, i) => ({ text: p, options: { breakLine: i < pains.length - 1 } })), { x: x + 2.3, y: 3.33, w: 3.6, h: 0.7, fontSize: 12.5, color: dark ? C.pale : C.ink, lineSpacingMultiple: 1.25 })
  }
  persona(0.55, 'p_osong_sign.png', C.amberSoft, false, '손님', '충북대 학생 · KTX 타러 오송역을 오가는 팀원들', '“같은 청주인데 오송역만 가면\n택시비가 확 뛰어요”', ['35% 할증, 막차 끊기면 대안 없음', '혼자 타기 부담, 같은 방향 사람을 못 찾음'])
  persona(6.78, 'p_taxi_stop.png', C.night, true, '기사', '시내 ↔ 오송·오창을 오가는 택시', '오송에 손님을 내려 주면\n돌아오는 길은 빈 차', ['청주 택시 운행거리의 46.5%가 빈 차 (TIMS)', '연료·시간 손해, 호출 앱 수수료는 그대로'])
  // 고객 여정: 도로 위 정류장, 위는 지금 · 아래는 쉐어택
  card(s, 0.55, 4.25, 12.23, 2.6)
  T(s, [{ text: '손님 여정  ', options: { color: C.ink } }, { text: '지금', options: { color: C.muted } }, { text: '  →  ', options: { color: C.soft } }, { text: '쉐어택이 있으면', options: { color: C.teal } }], { x: 0.8, y: 4.36, w: 8, h: 0.35, fontSize: 14, bold: true })
  road(s, 0.8, 5.1, 11.75, 0.44, false)
  const steps = [['KTX 도착', '도착 시각 맞춤 모집'], ['택시 줄 서기', '돌아가는 택시 확인'], ['할증 요금 확인', '할증 없는 요금 확인'], ['혼자 탑승', '같은 방향끼리 탑승'], ['시내 도착', '더 싸게 시내 도착']]
  steps.forEach(([now, after], i) => {
    const cx = 1.85 + i * 2.38
    T(s, now, { x: cx - 1.1, y: 4.74, w: 2.2, h: 0.3, fontSize: 12.5, align: 'center', color: i === 2 ? C.amber : C.muted, bold: i === 2 })
    dot(s, cx, 5.32, 0.3, i === 2 ? C.amber : C.white, i === 2 ? null : C.grey)
    T(s, after, { x: cx - 1.1, y: 5.65, w: 2.2, h: 0.3, fontSize: 13, bold: true, align: 'center', color: C.teal })
  })
  box(s, 0.8, 6.12, 11.75, 0.56, C.night)
  T(s, [{ text: '정리   ', options: { color: C.amber } }, { text: '손님은 있는데 빈 차와 엇갈린다 · 기사 손해는 빈 차 귀로 · 할증은 양쪽 모두에게 불만', options: { color: C.white } }], { x: 1.05, y: 6.12, w: 11.3, h: 0.56, fontSize: 14, bold: true, valign: 'middle' })
  footer(s, 2)
  s.addNotes('손님은 오송역에서 시내까지 할증 포함 요금을 내고, 기사님은 오송에 손님을 내린 뒤 빈 차로 돌아옵니다. 같은 길에서 양쪽 모두 손해를 보고 있는 셈입니다. 이 프로젝트는 팀원들이 오송역을 오가며 직접 겪은 할증 부담에서 시작했습니다.\n\n※ 기사 쪽 문장은 인터뷰 인용이 아니라 TIMS 자료(빈 차 46.5%)에 근거한 설명입니다. 기사 인터뷰는 하지 않았습니다(자료_출처_정리.md).' + credit('Station sign at platform of Osong Station(코레비), Taxi Stand in Ansan3(Gong Ju-young), CC BY-SA 4.0'))
}

// ============================================================ 3. 원인 분석 (어두운 화면 · 큰 숫자)
{
  const s = pres.addSlide(); bg(s, 'bg3_dark.png')
  head(s, '03', '할증이 가장 많은 곳이, 빈 차 위험은 가장 낮다', '손님이 없는 게 아니라 엇갈린다 · 9/28 개편은 같은 읍·면 안만 풀어 시내↔오송·오창은 그대로', true)
  T(s, '청주 택시가 빈 차로 달리는 거리', { x: 0.6, y: 1.6, w: 4.6, h: 0.35, fontSize: 14, bold: true, color: C.soft })
  seg(s, '465p_amber', 0.6, 2.05, 1.25)
  T(s, '운행거리의 절반 가까이 (TIMS 2025)', { x: 0.6, y: 3.42, w: 4.6, h: 0.35, fontSize: 14, color: C.pale })
  s.addShape(pres.ShapeType.line, { x: 0.6, y: 3.98, w: 4.4, h: 0, line: { color: C.panel, width: 1 } })
  T(s, '그런데 손님은 있다', { x: 0.6, y: 4.1, w: 4.6, h: 0.35, fontSize: 14, bold: true, color: C.soft })
  ;[['3,025', '건/일', '오송읍 승차', C.led], ['2,617', '건/일', '오창읍 승차', C.led], ['52', '%', '오송역 승차 중\n시내행', C.amber]].forEach(([n, u, l, c], i) => {
    const x = 0.6 + i * 1.6
    H(s, [{ text: n, options: { color: c } }, { text: u, options: { color: c, fontSize: 12 } }], { x, y: 4.5, w: 1.55, h: 0.5, fontSize: 24, valign: 'bottom' })
    T(s, l, { x, y: 5.05, w: 1.5, h: 0.5, fontSize: 11.5, color: C.pale })
  })
  box(s, 0.6, 5.75, 4.4, 1.0, C.amber)
  H(s, '손님이 없는 게 아니라\n빈 차와 손님이 엇갈린다', { x: 0.82, y: 5.75, w: 4.1, h: 1.0, fontSize: 18, color: C.night, valign: 'middle' })
  // 오른쪽: 지도 + 위험 지수 (흰 판)
  card(s, 5.4, 1.5, 7.38, 5.35)
  s.addImage({ path: IMG('map_risk.png'), x: 5.55, y: 1.75, w: 3.1, h: 2.79 })
  ;[['1D9E75', '저위험'], ['E8DCC0', '중간'], [C.amber, '고위험']].forEach(([c, t], i) => {
    box(s, 5.65 + i * 1.0, 4.78, 0.2, 0.2, c, 0.04)
    T(s, t, { x: 5.92 + i * 1.0, y: 4.73, w: 0.75, h: 0.3, fontSize: 11.5, color: C.ink, valign: 'middle' })
  })
  T(s, '가중치를 6가지로 바꿔도\n오창·오송·옥산은 늘 저위험\n(순위 상관 0.92~0.99)', { x: 5.65, y: 5.2, w: 3.0, h: 1.3, fontSize: 13, color: C.ink, lineSpacingMultiple: 1.3 })
  const rows = [['오창', 0.014], ['오송', 0.188], ['옥산', 0.376], ['내수', 0.402], ['강내', 0.406], ['남이', 0.456], ['남일', 0.531], ['북이', 0.692], ['문의', 0.788], ['현도', 0.797], ['미원', 0.847], ['낭성', 0.863], ['가덕', 0.877]]
  s.addChart(pres.ChartType.bar, [{ name: '빈 차 귀로 위험 지수', labels: rows.map((r) => r[0]), values: rows.map((r) => r[1]) }], {
    x: 8.75, y: 1.6, w: 3.95, h: 5.15, barDir: 'bar', catAxisOrientation: 'maxMin', valAxisHidden: true, valAxisMaxVal: 1, valAxisMinVal: 0,
    chartColors: rows.map((r) => (r[1] < 0.39 ? C.teal : r[1] < 0.7 ? C.grey : C.amber)), valueBarColors: true, barGapWidthPct: 40,
    showValue: true, dataLabelPosition: 'outEnd', dataLabelFormatCode: '0.00', dataLabelFontSize: 10, dataLabelColor: C.ink,
    catAxisLabelColor: C.ink, catAxisLabelFontSize: 11, catAxisLineShow: false, valGridLine: { style: 'none' }, showLegend: false,
    showTitle: true, title: '빈 차 귀로 위험 지수 (0 낮음 ~ 1 높음)', titleFontSize: 11.5, titleColor: C.muted, ...chartFont,
  })
  footer(s, 3, true)
  s.addNotes('빈 차로 돌아올 위험을 지수로 매겨 보면 오창, 오송, 옥산이 가장 낮습니다. 할증이 가장 많이 붙는 곳이 오히려 빈 차 위험이 가장 낮다는 뜻입니다. 문제는 손님이 없는 게 아니라 엇갈림입니다.\n\n지수 = 승차 밀도 0.5 + 버스정류장 부족 0.25 + 시내까지 거리 0.25 · 시내행 비율은 KTDB 2024 평일 OD 기준 추정')
}

// ============================================================ 4. 가치제안 (다리형: 지금의 불편 → 쉐어택 → 바뀌는 것)
{
  const s = pres.addSlide(); bgLight(s)
  head(s, '04', '손님은 싸게, 기사는 더 번다', '한쪽만 이득이면 오래가지 못한다 · 가치제안 캔버스')
  ;[['지금의 불편', 0.55, 3.6], ['쉐어택이 잇는 것', 4.35, 3.75], ['바뀌는 것', 8.3, 4.48]].forEach(([t, x, w]) => T(s, t, { x, y: 1.5, w, h: 0.3, fontSize: 12.5, bold: true, color: C.muted }))
  const lane = (y, who, job, pains, service, big, bigSub, gains) => {
    // 왼쪽: 고객과 불편 (호박색)
    card(s, 0.55, y, 3.6, 2.3, C.amberSoft)
    H(s, who, { x: 0.78, y: y + 0.18, w: 3.2, h: 0.45, fontSize: 22, color: C.ink })
    T(s, job, { x: 0.78, y: y + 0.66, w: 3.2, h: 0.3, fontSize: 12, color: C.muted })
    T(s, pains.map((p, i) => ({ text: p, options: { bullet: { code: '2013', indent: 14 }, breakLine: i < pains.length - 1 } })), { x: 0.78, y: y + 1.05, w: 3.25, h: 1.15, fontSize: 13.5, color: C.ink, lineSpacingMultiple: 1.3 })
    // 가운데: 쉐어택이라는 길
    H(s, '쉐어택', { x: 4.35, y: y + 0.38, w: 3.75, h: 0.4, fontSize: 18, color: C.teal })
    road(s, 4.35, y + 0.9, 3.75, 0.48, true)
    T(s, service, { x: 4.35, y: y + 1.5, w: 3.6, h: 0.75, fontSize: 12.5, color: C.ink, lineSpacingMultiple: 1.3 })
    // 오른쪽: 바뀌는 것 (초록, 큰 숫자)
    card(s, 8.3, y, 4.48, 2.3, C.teal)
    T(s, bigSub, { x: 8.52, y: y + 0.18, w: 4.1, h: 0.3, fontSize: 12.5, color: C.tealSoft })
    H(s, big, { x: 8.52, y: y + 0.48, w: 4.1, h: 0.7, fontSize: 36, color: C.white, valign: 'middle' })
    T(s, gains.map((g, i) => ({ text: g, options: { breakLine: i < gains.length - 1 } })), { x: 8.52, y: y + 1.28, w: 4.1, h: 0.95, fontSize: 12.5, color: C.white, lineSpacingMultiple: 1.3 })
  }
  lane(1.85, '손님', '하려는 일: 오송역·산단 ↔ 시내 이동', ['35% 할증', '막차가 끊기면 대안 없음', '혼자 타는 부담'], '주소·GPS 검색, 요금 비교,\n주변 모집, 왕복 매칭',
    '1인 5,900원', '3명이 나눠 타면 (혼자 17,500원)', ['왕복 매칭이면 양쪽 할증 0원', '바라던 것: 싸고 빠른 귀가 · 같은 방향 동행', 'KTX 도착·막차 맞춤 모집, 지인 탑승 알림'])
  lane(4.4, '기사', '하려는 일: 하루 수입 올리기', ['읍·면 하차 후 빈 차 귀로', '호출 앱 수수료 부담'], '귀로 손님 대기 현황,\n빈 차 vs 귀로 수입 비교',
    '+17,500원', '빈 차로 돌아오던 길에 귀로 손님 (0원 →)', ['바라던 것: 돌아가는 길에도 손님', '참여 기사 하루 +5,774원 (시뮬레이션)'])
  footer(s, 4)
  s.addNotes('손님에게는 할증 없는 귀가를, 기사님에게는 빈 차 대신 수입을 줍니다. 한쪽만 이득을 보는 게 아니라 양쪽이 모두 이득을 보는 구조라서 지속될 수 있습니다.\n\n가치제안 캔버스 항목: 하려는 일(Jobs)·불편(Pains)·바라는 것(Gains)·서비스·불편 해소·이득 창출. 금액은 오송역→가경동(13.8km) 예시와 행위자 시뮬레이션(앱 이용 30%) 기준')
}

// ============================================================ 5. MVP + 차별점
{
  const s = pres.addSlide(); bgLight(s)
  head(s, '05', '택시 앱을 바꾸지 않고, 할증 없는 길을 더한다', '주소·GPS로 출발·도착 → 할증 없이 가기 확인 → 모집 열기·참여')
  ;[['shot_ride.png', 2.3, '손님 화면'], ['shot_driver.png', 2.0, '기사 화면']].forEach(([f, w, cap], i) => {
    const x = 0.55 + i * 2.52
    card(s, x, 1.5, w + 0.14, 3.95, C.night)
    s.addImage({ path: IMG(f), x: x + 0.07, y: 1.57, w, h: 3.8, sizing: { type: 'crop', w, h: 3.8 } })
    T(s, cap, { x, y: 5.52, w: w + 0.14, h: 0.3, fontSize: 12.5, bold: true, color: C.ink, align: 'center' })
  })
  s.addImage({ path: QR, x: 0.75, y: 5.92, w: 0.92, h: 0.92 })
  T(s, [{ text: '직접 써 보기', options: { bold: true, breakLine: true } }, { text: 'taxi-woad-seven.vercel.app', options: { breakLine: true } }, { text: '체험 계정 A·B' }], { x: 1.82, y: 5.92, w: 2.9, h: 0.92, fontSize: 12, color: C.ink, valign: 'middle' })
  // 할증 없이 가는 3가지 경우: 한 줄씩, 왼쪽 색 띠
  H(s, '할증 없이 가는 3가지 경우', { x: 5.3, y: 1.5, w: 7, h: 0.4, fontSize: 18, color: C.ink })
  ;[['왕복 매칭', '갈 때 탄 사람이 돌아올 손님을 미리 구함 → 양쪽 할증 0원', C.teal], ['귀로 연계 결제', '할증 포함 가승인 → 30분 안에 귀로 손님을 태우면 할증 빼고 결제', C.amber], ['앱 없이 현장 승차', '지금처럼 미터기 요금 · 노쇼는 할증분 부담', C.grey]].forEach(([t, d, c], i) => {
    const y = 2.0 + i * 0.68
    card(s, 5.3, y, 7.48, 0.58)
    s.addShape(pres.ShapeType.rect, { x: 5.3, y, w: 0.1, h: 0.58, fill: { color: c }, line: { color: c, width: 0 } })
    T(s, t, { x: 5.55, y, w: 1.9, h: 0.58, fontSize: 13.5, bold: true, color: C.ink, valign: 'middle' })
    T(s, d, { x: 7.45, y, w: 5.25, h: 0.58, fontSize: 12.5, color: C.ink, valign: 'middle' })
  })
  // 경쟁 비교
  const th = (t, hi) => ({ text: t, options: { bold: true, color: C.white, fill: { color: hi ? C.teal : C.night }, fontSize: 12.5, align: 'center', valign: 'middle', fontFace: F } })
  const td = (t, hi) => ({ text: t, options: { fontSize: 12, color: C.ink, fill: { color: hi ? C.tealSoft : C.white }, align: 'center', valign: 'middle', bold: !!hi, fontFace: F } })
  s.addTable([
    [th(''), th('호출 앱 (카카오T 등)'), th('반반택시 (동승)'), th('쉐어택', true)],
    [td('핵심'), td('가까운 빈 차 호출'), td('같은 방향 동승'), td('돌아가는 빈 차와 방향 맞추기', true)],
    [td('할증'), td('그대로'), td('그대로'), td('귀로 운행 면제 (시 정책 연동)', true)],
    [td('기사'), td('호출 수수료 부담'), td('—'), td('귀로 수입 증가', true)],
    [td('관계'), td('—'), td('동승 중단 → B2B 전환'), td('택시 앱 옆 도우미 (제휴)', true)],
  ], { x: 5.3, y: 4.2, w: 7.48, colW: [0.85, 2.0, 2.0, 2.63], rowH: 0.52, border: { type: 'solid', pt: 1, color: C.line } })
  footer(s, 5)
  s.addNotes('쉐어택은 카카오T 같은 택시 앱을 대신하지 않습니다. 부르기 전에는 같은 방향 손님과 돌아가는 빈 차를 찾아 주고, 부른 뒤에는 할증 없이 가는 방법을 알려 줍니다. 특히 왕복 매칭은 같은 차를 갈 때와 올 때 따로 타는 것이라 합승이 아니고, 성별 제한도 필요 없습니다.\n\n반반택시: 2019 규제샌드박스 실증특례 → 2022 동승 합법화, 이후 동승 중단·B2B 전환(한국경제 2026.4) · 귀로 연계 결제는 시범(모의)')
}

// ============================================================ 6. 비즈니스 모델 캔버스 (돈 흐름이 주인공)
{
  const s = pres.addSlide(); bgLight(s)
  head(s, '06', '시 예산 0원으로 할증을 없앤다', '손님 1,679원 이득 · 기사 손해 0 · 플랫폼 건당 약 400원 · 비즈니스 모델 캔버스')
  const blk = (x, y, w, h, title, body, fill = C.white, tc = C.teal, bc = C.ink) => { card(s, x, y, w, h, fill); T(s, title, { x: x + 0.18, y: y + 0.12, w: w - 0.3, h: 0.32, fontSize: 13.5, bold: true, color: tc }); T(s, body, { x: x + 0.18, y: y + 0.5, w: w - 0.32, h: h - 0.58, fontSize: 12.5, color: bc, lineSpacingMultiple: 1.3 }) }
  const W = 2.38, X = (i) => 0.55 + i * (W + 0.08)
  blk(X(0), 1.5, W, 3.05, '핵심 파트너', '청주시 교통정책과\n등록 호출 플랫폼\n택시조합·운수사\n코레일(오송역)')
  blk(X(1), 1.5, W, 1.48, '핵심 활동', '귀로·왕복 매칭 운영\n기사 제휴, 시와 실증')
  blk(X(1), 3.07, W, 1.48, '핵심 자원', 'TIMS·OD 분석 모델\n매칭 알고리즘, 앱')
  blk(X(2), 1.5, W, 3.05, '가치 제안', '손님: 할증 없는 귀가\n기사: 빈 차 → 수입\n시: 할증 민원·보전 예산 감소\n사회: 빈 차 주행·탄소 감소', C.amber, C.night, C.night)
  blk(X(3), 1.5, W, 1.48, '고객 관계', '시범 운영, 평가·신뢰 점수\n지인 탑승 알림')
  blk(X(3), 3.07, W, 1.48, '채널', '앱(휴대폰 웹), 오송역 QR\n산단·대학 제휴, 모집 공유')
  blk(X(4), 1.5, W, 3.05, '고객', '오송·오창↔시내 이동 손님\n(KTX·산단·바이오단지)\n읍·면 운행 택시 기사\n청주시 (B2G)')
  blk(0.55, 4.7, 3.3, 2.15, '비용 구조', '서버·검색 API\n기사 모집 인센티브, 홍보\n지도·결제는 기존 서비스 활용')
  // 수익원: 귀로 1건의 돈 흐름
  card(s, 4.0, 4.7, 8.78, 2.15, C.night)
  T(s, '수익원 · 귀로 1건의 돈 흐름', { x: 4.25, y: 4.82, w: 6, h: 0.32, fontSize: 13.5, bold: true, color: C.amber })
  s.addShape(pres.ShapeType.homePlate, { x: 4.25, y: 5.25, w: 2.7, h: 0.95, fill: { color: C.amber }, line: { color: C.amber, width: 0 } })
  T(s, '할증 면제로 손님이 아끼는 돈', { x: 4.4, y: 5.3, w: 2.3, h: 0.3, fontSize: 11, color: C.night })
  H(s, '4,301원', { x: 4.4, y: 5.6, w: 2.3, h: 0.5, fontSize: 26, color: C.night })
  ;[['매칭 수수료 → 기사 보전', '2,622원', '기사 손해 0', C.panel, C.white], ['손님에게 남는 몫', '1,679원', '그래도 이득', C.teal, C.white]].forEach(([l, n, sub, f, c], i) => {
    const x = 7.15 + i * 2.85
    box(s, x, 5.25, 2.7, 0.95, f)
    T(s, l, { x: x + 0.18, y: 5.3, w: 2.4, h: 0.3, fontSize: 11, color: C.pale })
    H(s, [{ text: n, options: {} }, { text: `  ${sub}`, options: { fontSize: 12, color: C.pale } }], { x: x + 0.18, y: 5.6, w: 2.45, h: 0.5, fontSize: 26, color: c })
  })
  T(s, '+', { x: 9.85, y: 5.25, w: 0.15, h: 0.95, fontSize: 18, bold: true, color: C.white, align: 'center', valign: 'middle' })
  T(s, '그 밖에 노쇼 수수료(할증분 → 기사) · 플랫폼 몫 운임 2.8%(약 400원/건, 카카오T블루 가맹 수수료 수준) · B2G 데이터 리포트', { x: 4.25, y: 6.3, w: 8.4, h: 0.45, fontSize: 11, color: C.pale })
  footer(s, 6)
  s.addNotes('핵심은 수익 구조입니다. 귀로 운행 할증을 면제하면 손님은 건당 약 4,300원을 아끼는데, 이 중 2,622원을 매칭 수수료로 받아 기사님에게 보전하면 기사님 손해는 0, 시 재정도 0이 됩니다. 손님은 그래도 1,679원 이득입니다.\n\nB안: 앱 이용 30% 기준 손님 면제액 4,301원 중 2,622원을 수수료로 → 손님 1,679원 이득 · 기사 손해 0 · 시 재정 0 (시뮬레이션)')
}

// ============================================================ 7. 사업성 검증 (대시보드)
{
  const s = pres.addSlide(); bgLight(s)
  head(s, '07', '응답자 63%가 할증 때문에 택시를 포기했다', '시민은 할증 없는 택시를 원하고, 참여 기사는 하루 5,774원을 더 번다 · 사업성 검증')
  // 왼쪽: 시민 설문 (어두운 판, 큰 숫자)
  card(s, 0.55, 1.5, 4.55, 5.35, C.night)
  T(s, '시민 설문 57명 (2026.10)', { x: 0.8, y: 1.68, w: 4.1, h: 0.32, fontSize: 13, bold: true, color: C.soft })
  seg(s, '63p', 0.8, 2.12, 1.0)
  T(s, '할증 때문에 택시를 포기하거나\n다른 수단을 썼다', { x: 0.8, y: 3.25, w: 4.1, h: 0.7, fontSize: 15, bold: true, color: C.white, lineSpacingMultiple: 1.25 })
  ;[['읍·면 35% 할증이 불합리', 74, C.amber], ['할증이 없으면 택시를 더 탄다', 93, C.led], ['조건이 맞으면 나눠 탄다', 96, C.led]].forEach(([l, v, c], i) => {
    const y = 4.15 + i * 0.68
    T(s, l, { x: 0.8, y, w: 3.4, h: 0.3, fontSize: 12.5, color: C.pale })
    box(s, 0.8, y + 0.34, 3.3 * v / 100, 0.18, c, 0.09)
    H(s, `${v}%`, { x: 4.15, y: y + 0.19, w: 0.8, h: 0.38, fontSize: 17, color: c, align: 'right', valign: 'middle' })
  })
  T(s, '응답자 84%가 대학생 = 요금에 가장 민감한 초기 타깃', { x: 0.8, y: 6.2, w: 4.1, h: 0.5, fontSize: 11, color: C.soft })
  // 오른쪽 위: 미터기 3개
  ;[['5774', '원', '참여 기사 1대 하루 수입 (+1.86%)'], ['6', '배', '오송에 집중하면 귀로 매칭 6→36건/일'], ['m37', '', '합승이 줄이는 할증 부담은 이 정도뿐']].forEach(([k, unit, l], i) => {
    const x = 5.3 + i * 2.53
    card(s, x, 1.5, 2.43, 1.45, C.meter)
    const w = seg(s, k, x + 0.18, 1.65, 0.45)
    if (unit) H(s, unit, { x: x + 0.24 + w, y: 1.65, w: 0.4, h: 0.45, fontSize: 18, color: C.white, valign: 'bottom' })
    T(s, l, { x: x + 0.18, y: 2.22, w: 2.15, h: 0.65, fontSize: 11.5, color: C.soft })
  })
  // 오른쪽 가운데: 손익분기 표
  const th = (t) => ({ text: t, options: { bold: true, color: C.white, fill: { color: C.night }, fontSize: 12, align: 'center', valign: 'middle', fontFace: F } })
  const td = (t, hi) => ({ text: t, options: { fontSize: 12.5, color: hi ? C.teal : C.ink, bold: !!hi, fill: { color: C.white }, align: 'center', valign: 'middle', fontFace: F } })
  s.addTable([[th('앱 이용률'), th('귀로 매칭/일'), th('손님 면제액'), th('보전 없이 면제'), th('손해 0 보전액')],
    [td('30%'), td('488건'), td('4,301원'), td('할증의 39%'), td('2,622원', 1)], [td('50%'), td('1,220건'), td('4,285원'), td('19%'), td('3,462원', 1)], [td('100%'), td('4,893건'), td('4,258원'), td('12%'), td('3,733원', 1)]],
    { x: 5.3, y: 3.1, w: 7.48, rowH: 0.38, border: { type: 'solid', pt: 1, color: C.line } })
  // 오른쪽 아래: 기사 수입 변화
  card(s, 5.3, 4.75, 7.48, 2.1)
  s.addChart(pres.ChartType.bar, [{ name: '기사 수입 변화(%)', labels: ['합승', '스팟 합승+귀로', '귀로 매칭 (앱 30%)', '귀로 매칭 (앱 100%)'], values: [-0.45, -0.9, 0.16, 0.5] }], {
    x: 5.4, y: 4.8, w: 7.3, h: 2.0, barDir: 'bar', catAxisOrientation: 'maxMin', chartColors: [C.grey, C.grey, C.teal, C.teal], valueBarColors: true, barGapWidthPct: 45,
    showValue: true, dataLabelPosition: 'outEnd', dataLabelFormatCode: '+0.00"%";-0.00"%"', dataLabelFontSize: 11, dataLabelFontBold: true, dataLabelColor: C.ink,
    valAxisHidden: true, valAxisMinVal: -1.3, valAxisMaxVal: 0.9, catAxisLabelColor: C.ink, catAxisLabelFontSize: 11, catAxisLabelPos: 'low', catAxisLineShow: false,
    valGridLine: { style: 'none' }, showLegend: false, showTitle: true, title: '기사 수입 변화 (현행 대비, 할증 그대로)', titleFontSize: 11.5, titleColor: C.muted, ...chartFont,
  })
  footer(s, 7)
  s.addNotes('청주 택시를 그대로 재현한 시뮬레이션 결과, 합승은 기사 수입을 깎지만 귀로 매칭은 늘립니다. 앱을 쓰는 기사님은 하루 5,774원을 더 법니다. 처음부터 청주 전체가 아니라 오송에 모으면 같은 기사 수로도 매칭이 6배가 됩니다. 시민 설문 57명에서도 63%가 할증 때문에 택시를 포기하거나 다른 수단을 썼고, 96%가 조건만 맞으면 나눠 타겠다고 답했습니다. 3명이 나눠 타면 66% 저렴해 응답자가 원한 할인 폭을 모두 넘습니다.\n\n시뮬레이션: 택시 2,956대·하루 약 5.6만 건, TIMS 2025 실측 보정(실측 아님) · 설문: 57명 중 대학생 84% = 요금에 가장 민감한 초기 타깃 · 요금 분담은 거리 비율 선호 68% → 개선 과제')
}

// ============================================================ 8. 실행 계획 (로드맵)
{
  const s = pres.addSlide(); bg(s, 'p_end.jpg')
  head(s, '08', '오송역 한 곳에서 시작해 할증 면제까지', '1차 목표: 오송 귀로 매칭 하루 36건 (기사 10%·승객 앱 오송 집중 시뮬레이션) · 참여 기사 하루 +5,774원', true)
  ;[['오송역 시범', 'KTX 도착 시간대 집중'], ['제휴', '승강장 택시 단체·호출 플랫폼'], ['거점 확대', '오송·오창 실증, 데이터 축적'], ['정책 건의', '귀로 운행 할증 면제 고시']].forEach(([t, d], i) => {
    const x = 0.55 + i * 3.07, last = i === 3
    s.addShape(i === 0 ? pres.ShapeType.homePlate : pres.ShapeType.chevron, { x, y: 1.55, w: 3.2, h: 1.25, fill: { color: last ? C.amber : C.panel, transparency: last ? 0 : 5 }, line: { color: last ? C.amber : C.panel, width: 0 } })
    const tx = x + (i === 0 ? 0.3 : 0.78)
    H(s, `${i + 1}  ${t}`, { x: tx, y: 1.72, w: 2.3, h: 0.42, fontSize: 18, color: last ? C.night : C.white })
    T(s, d, { x: tx, y: 2.17, w: 2.05, h: 0.55, fontSize: 12, color: last ? C.night : C.pale })
  })
  const sw = [['S 강점', '데이터 근거, 시 정책 연동\n손님·기사 모두 이득', C.teal], ['W 약점', '초기 이용자 확보\n제휴 필요', C.grey], ['O 기회', '9/28 개편 여론, KTX 수요\n반반택시 선례', C.amber], ['T 위협', '대형 호출 앱 진입\n업계 반발', 'E8A87C']]
  sw.forEach(([t, d, c], i) => { const x = 0.55 + (i % 2) * 3.05, y = 3.05 + Math.floor(i / 2) * 1.52; card(s, x, y, 2.9, 1.4, C.white); s.addShape(pres.ShapeType.rect, { x, y, w: 2.9, h: 0.08, fill: { color: c }, line: { color: c, width: 0 } }); H(s, t, { x: x + 0.2, y: y + 0.2, w: 2.6, h: 0.38, fontSize: 17, color: C.ink }); T(s, d, { x: x + 0.2, y: y + 0.62, w: 2.6, h: 0.75, fontSize: 13, color: C.ink, lineSpacingMultiple: 1.25 }) })
  s.addShape(pres.ShapeType.roundRect, { x: 6.75, y: 3.05, w: 6.03, h: 2.92, rectRadius: 0.12, fill: { color: C.panel, transparency: 5 }, line: { color: C.panel, width: 0 } })
  T(s, '법 · 기대 효과 · 한계', { x: 6.98, y: 3.2, w: 5.6, h: 0.35, fontSize: 14, bold: true, color: C.amber })
  T(s, [
    { text: '법  ', options: { bold: true, color: C.amber } }, { text: '왕복 매칭은 동승이 아니라 합승 규제 밖, 합승은 택시발전법 시행규칙 제11조의2 준수', options: { breakLine: true } },
    { text: '효과  ', options: { bold: true, color: C.amber } }, { text: '손님 할증↓ · 기사 수입↑ · 시 예산↓ · 탄소↓', options: { breakLine: true } },
    { text: '한계  ', options: { bold: true, color: C.amber } }, { text: '시뮬레이션 기반, 요율 보도 기준, 면제는 시 고시 변경 필요' },
  ], { x: 6.98, y: 3.65, w: 5.6, h: 2.25, fontSize: 13.5, color: C.white, paraSpaceAfter: 12, lineSpacingMultiple: 1.3 })
  s.addImage({ path: QR, x: 0.55, y: 6.15, w: 0.8, h: 0.8 })
  H(s, '빈 차를 채우면, 할증의 이유가 사라진다', { x: 1.55, y: 6.1, w: 11, h: 0.55, fontSize: 26, color: C.white, valign: 'middle' })
  T(s, '앱 체험 taxi-woad-seven.vercel.app', { x: 1.55, y: 6.65, w: 6, h: 0.3, fontSize: 12, color: C.led })
  T(s, '8 / 8', { x: 12.1, y: 7.0, w: 0.7, h: 0.3, fontSize: 11, color: C.soft, align: 'right', valign: 'middle' })
  s.addNotes('오송역 한 곳, KTX 도착 시간대부터 작게 시작하고, 택시 단체와 제휴한 뒤 데이터를 쌓아 시에 귀로 운행 할증 면제를 건의하겠습니다. 빈 차 귀로를 채우면, 할증의 이유가 사라집니다. 감사합니다.' + credit('Osong Station North, Minseong Kim, CC BY-SA 4.0'))
}

// 한글 단어가 중간에서 끊기지 않게 + 한국어 언어 태그
async function koreanWordWrap(file) {
  const JSZip = require(require.resolve('jszip', { paths: [require.resolve('pptxgenjs')] }))
  const zip = await JSZip.loadAsync(fs.readFileSync(file))
  const pf = 'ppt/presentation.xml'
  zip.file(pf, (await zip.file(pf).async('string')).replace(' saveSubsetFonts="1"', ' embedTrueTypeFonts="1" saveSubsetFonts="0"'))   // 팀원이 새 글자를 써도 글꼴 유지
  for (const name of Object.keys(zip.files).filter((n) => /^ppt\/(slides|slideLayouts|slideMasters)\/[^/]+\.xml$/.test(n))) {
    let x = await zip.file(name).async('string')
    x = x.replace(/<a:pPr(?![^>]*eaLnBrk)/g, '<a:pPr eaLnBrk="0" latinLnBrk="0"').replace(/<a:p>(?!<a:pPr)/g, '<a:p><a:pPr eaLnBrk="0" latinLnBrk="0"/>').replace(/lang="en-US"/g, 'lang="ko-KR" altLang="en-US"')
    zip.file(name, x)
  }
  fs.writeFileSync(file, await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }))
}

;(async () => { await pres.writeFile({ fileName: OUT }); await koreanWordWrap(OUT); console.log('saved', OUT) })()

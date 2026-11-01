// PPT용 그림: 청주 읍면동 지도(실제 경계), 택시·KTX 일러스트를 PNG로 만든다
const fs = require('fs')
const path = require('path')
const sharp = require('sharp')

const TAXI = path.join(__dirname, '..')
const OUT = path.join(__dirname, 'img')
fs.mkdirSync(OUT, { recursive: true })
const geo = JSON.parse(fs.readFileSync(`${TAXI}/data/web/01_zones/zones.geojson`))

const C = { dark: '#0F2A22', dark2: '#163A2F', teal: '#1D9E75', mint: '#8FCFB8', amber: '#F2A93B', light: '#F6F7F3', muted: '#A9B8B1', ink: '#10231C' }
const FONT = "font-family=\"Malgun Gothic, 'IBM Plex Sans KR', sans-serif\""

// ---------- 지도 투영
function bounds() {
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9
  for (const f of geo.features) for (const poly of f.geometry.coordinates) for (const [x, y] of poly[0]) {
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y)
  }
  return { x0, x1, y0, y1 }
}
function projector(W, H, pad) {
  const b = bounds(), k = Math.cos(36.63 * Math.PI / 180)
  const sx = (W - 2 * pad) / ((b.x1 - b.x0) * k), sy = (H - 2 * pad) / (b.y1 - b.y0), s = Math.min(sx, sy)
  const ox = (W - (b.x1 - b.x0) * k * s) / 2, oy = (H - (b.y1 - b.y0) * s) / 2
  return ([x, y]) => [ox + (x - b.x0) * k * s, oy + (b.y1 - y) * s]
}
const pathOf = (f, P) => f.geometry.coordinates.map((poly) => poly.map((ring) => 'M' + ring.map((c) => P(c).map((v) => v.toFixed(1)).join(',')).join('L') + 'Z').join('')).join('')
const cen = (name, P) => { const f = geo.features.find((f) => f.properties.name === name); return P([f.properties.centroid_lon, f.properties.centroid_lat]) }

// 1) 표지·근거용 어두운 지도: 동은 진한 초록, 읍면은 어두운 톤, 오송·오창 강조 + 귀로 화살표
function mapDark(W, H, { labels = true, arrows = true } = {}) {
  const P = projector(W, H, 40)
  const hot = ['오송읍', '오창읍']
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`
  for (const f of geo.features) {
    const p = f.properties
    const fill = hot.includes(p.name) ? C.amber : p.is_eupmyeon ? '#1B4436' : C.teal
    const op = hot.includes(p.name) ? 0.95 : p.is_eupmyeon ? 1 : 0.85
    s += `<path d="${pathOf(f, P)}" fill="${fill}" fill-opacity="${op}" stroke="${C.dark}" stroke-width="2.2" stroke-linejoin="round"/>`
  }
  const city = cen('중앙동', P)
  if (arrows) {
    for (const n of hot) {
      const [x, y] = cen(n, P), [cx, cy] = city
      const mx = (x + cx) / 2, my = (y + cy) / 2
      // 갈 때(손님 태움): 실선 / 돌아올 때(빈 차): 점선 → 쉐어택이 채움
      s += `<path d="M${cx},${cy} Q${mx + 60},${my - 90} ${x},${y}" fill="none" stroke="${C.light}" stroke-width="7" stroke-linecap="round"/>`
      s += `<path d="M${x},${y} Q${mx - 60},${my + 90} ${cx},${cy}" fill="none" stroke="${C.amber}" stroke-width="7" stroke-linecap="round" stroke-dasharray="2 18"/>`
    }
    s += `<circle cx="${city[0]}" cy="${city[1]}" r="16" fill="${C.light}" stroke="${C.dark}" stroke-width="5"/>`
  }
  if (labels) {
    for (const n of hot) {
      const [x, y] = cen(n, P)
      s += `<circle cx="${x}" cy="${y}" r="13" fill="${C.dark}" stroke="${C.light}" stroke-width="5"/>`
      s += `<text x="${x}" y="${y - 30}" ${FONT} font-size="40" font-weight="700" fill="${C.light}" text-anchor="middle" paint-order="stroke" stroke="${C.dark}" stroke-width="8">${n.replace('읍', '')}</text>`
    }
    s += `<text x="${city[0] + 26}" y="${city[1] + 54}" ${FONT} font-size="36" font-weight="700" fill="${C.light}" paint-order="stroke" stroke="${C.dark}" stroke-width="8">청주 시내</text>`
  }
  return s + '</svg>'
}

// 2) 밝은 배경용 위험지수 지도: 읍면을 위험도 색으로, 동은 회색
function mapRisk(W, H) {
  const P = projector(W, H, 30)
  const risk = Object.fromEntries(JSON.parse(fs.readFileSync(`${TAXI}/data/web/14_risk/empty_risk.json`)).map((r) => [r.name, r]))
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`
  for (const f of geo.features) {
    const r = risk[f.properties.name]
    const fill = !r ? '#D5DCD8' : r.group === '저위험' ? (r.low_risk_votes === 6 ? C.teal : C.mint) : r.group === '중간' ? '#E9DFC6' : C.amber
    s += `<path d="${pathOf(f, P)}" fill="${fill}" stroke="#F6F7F3" stroke-width="2.5" stroke-linejoin="round"/>`
  }
  for (const n of ['오창읍', '오송읍', '옥산면', '미원면', '가덕면', '문의면']) {
    const [x, y] = cen(n, P)
    s += `<text x="${x}" y="${y + 10}" ${FONT} font-size="30" font-weight="700" fill="${C.ink}" text-anchor="middle" paint-order="stroke" stroke="#FFFFFF" stroke-width="7">${n.slice(0, 2)}</text>`
  }
  return s + '</svg>'
}

// 3) 택시 일러스트 (측면, 갓등 포함)
function taxi(color = C.amber, W = 900, H = 420) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 900 420">
  <ellipse cx="450" cy="372" rx="400" ry="22" fill="#000" fill-opacity="0.18"/>
  <rect x="370" y="58" width="160" height="50" rx="12" fill="${C.light}"/>
  <text x="450" y="94" ${FONT} font-size="28" font-weight="700" fill="${C.ink}" text-anchor="middle">TAXI</text>
  <path d="M90 250 L150 160 Q170 108 240 104 L620 104 Q690 108 730 160 L800 236 Q850 244 856 280 L856 318 Q856 336 836 336 L64 336 Q44 336 44 318 L44 282 Q48 254 90 250 Z" fill="${color}"/>
  <path d="M190 236 L238 154 Q248 136 270 136 L438 136 L438 236 Z" fill="${C.dark2}"/>
  <path d="M462 236 L462 136 L612 136 Q636 136 650 154 L708 236 Z" fill="${C.dark2}"/>
  <rect x="44" y="270" width="812" height="16" fill="#000" fill-opacity="0.12"/>
  <rect x="820" y="256" width="30" height="20" rx="6" fill="${C.light}"/>
  <rect x="50" y="258" width="26" height="18" rx="5" fill="#E2574C"/>
  <circle cx="230" cy="336" r="62" fill="${C.ink}"/><circle cx="230" cy="336" r="28" fill="#C9D1CD"/>
  <circle cx="680" cy="336" r="62" fill="${C.ink}"/><circle cx="680" cy="336" r="28" fill="#C9D1CD"/>
</svg>`
}

// 4) KTX 일러스트 (측면 앞부분)
function train(W = 1100, H = 300) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 1100 300">
  <rect x="0" y="262" width="1100" height="10" fill="${C.muted}"/>
  <path d="M0 70 L760 70 Q960 76 1060 210 Q1074 244 1040 248 L0 248 Z" fill="${C.light}"/>
  <path d="M0 196 L1052 196 Q1070 220 1040 248 L0 248 Z" fill="${C.teal}"/>
  <path d="M800 92 Q930 100 1000 180 L820 180 Q800 180 800 160 Z" fill="${C.dark2}"/>
  ${[40, 210, 380, 550].map((x) => `<rect x="${x}" y="100" width="130" height="64" rx="12" fill="${C.dark2}"/>`).join('')}
  ${[120, 300, 640, 820].map((x) => `<circle cx="${x}" cy="256" r="18" fill="${C.ink}"/>`).join('')}
</svg>`
}

// 5) 작은 아이콘 (원 안의 단색 그림)
const ICONS = {
  taxi: '<path d="M30 70 L38 50 Q42 42 52 42 L76 42 Q86 42 90 50 L98 70 Q104 72 104 80 L104 92 L24 92 L24 80 Q24 72 30 70 Z M40 68 L88 68 L82 52 L46 52 Z" fill="#fff"/><circle cx="42" cy="94" r="9" fill="#fff"/><circle cx="86" cy="94" r="9" fill="#fff"/><rect x="54" y="30" width="20" height="9" rx="3" fill="#fff"/>',
  people: '<circle cx="48" cy="46" r="14" fill="#fff"/><circle cx="82" cy="50" r="12" fill="#fff"/><path d="M22 98 Q24 70 48 68 Q72 70 74 98 Z" fill="#fff"/><path d="M76 98 Q76 76 70 72 Q78 66 84 68 Q104 72 106 98 Z" fill="#fff"/>',
  phone: '<rect x="40" y="20" width="48" height="88" rx="10" fill="#fff"/><rect x="47" y="32" width="34" height="58" rx="3" fill="COL"/><circle cx="64" cy="98" r="4" fill="COL"/>',
  won: '<text x="64" y="94" font-family="Malgun Gothic" font-size="74" font-weight="700" fill="#fff" text-anchor="middle">₩</text>',
  law: '<rect x="60" y="26" width="8" height="72" fill="#fff"/><rect x="30" y="38" width="68" height="7" rx="3" fill="#fff"/><path d="M28 46 L16 76 Q28 86 40 76 Z M100 46 L88 76 Q100 86 112 76 Z" fill="#fff"/><rect x="40" y="96" width="48" height="9" rx="3" fill="#fff"/>',
  check: '<path d="M30 66 L54 90 L100 40" fill="none" stroke="#fff" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>',
  route: '<circle cx="34" cy="92" r="12" fill="#fff"/><circle cx="94" cy="36" r="12" fill="#fff"/><path d="M34 80 Q34 54 64 60 Q94 66 94 48" fill="none" stroke="#fff" stroke-width="9" stroke-dasharray="4 12" stroke-linecap="round"/>',
  train: '<rect x="34" y="22" width="60" height="70" rx="16" fill="#fff"/><rect x="44" y="34" width="40" height="24" rx="4" fill="COL"/><circle cx="50" cy="74" r="6" fill="COL"/><circle cx="78" cy="74" r="6" fill="COL"/><path d="M44 92 L34 108 M84 92 L94 108" stroke="#fff" stroke-width="8" stroke-linecap="round"/>',
}
const icon = (name, col) => `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 128 128"><circle cx="64" cy="64" r="64" fill="${col}"/>${ICONS[name].replace(/COL/g, col)}</svg>`

async function png(svg, file) { await sharp(Buffer.from(svg), { density: 144 }).png().toFile(path.join(OUT, file)) }

;(async () => {
  await sharp(path.join(TAXI, 'public/icon.svg'), { density: 300 }).resize(512, 512).png().toFile(path.join(OUT, 'logo.png'))
  await png(mapDark(1400, 1200), 'map_dark.png')
  await png(mapRisk(1000, 900), 'map_risk.png')
  await png(taxi(C.amber), 'taxi_amber.png')
  await png(taxi(C.teal), 'taxi_teal.png')
  await png(train(), 'ktx.png')
  for (const n of Object.keys(ICONS)) for (const [k, col] of [['t', C.teal], ['a', C.amber], ['d', C.dark]]) await png(icon(n, col), `i_${n}_${k}.png`)
  console.log('done', fs.readdirSync(OUT).length)
})()

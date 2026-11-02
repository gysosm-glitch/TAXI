// 발표 그림: 배경(밤 녹색 / 밝은 도로)과 택시 미터기 숫자(7세그먼트 LED)
// 색은 로고에서: 밤 녹색 #0F2A22, 표시등 호박색 #F2A93B, 초록 #1D9E75
const fs = require('fs')
const path = require('path')
const sharp = require('sharp')
const OUT = (f) => path.join(__dirname, 'img', f)

const dark = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0F2A22"/><stop offset="1" stop-color="#091A15"/></linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#F2A93B" stop-opacity=".22"/><stop offset="1" stop-color="#F2A93B" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="1920" height="1080" fill="url(#g)"/>
  <circle cx="1530" cy="330" r="560" fill="url(#glow)"/>
</svg>`

const light = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
  <rect width="1920" height="1080" fill="#F4F6F3"/>
  <path d="M1380 1120 C1560 820 1760 700 1980 660" fill="none" stroke="#E2E8E4" stroke-width="120"/>
  <path d="M1380 1120 C1560 820 1760 700 1980 660" fill="none" stroke="#F2A93B" stroke-width="7" stroke-dasharray="36 30" opacity=".8"/>
  <path d="M-40 1040 C 300 1000, 700 1060, 1000 1120" fill="none" stroke="#1D9E75" stroke-width="3" opacity=".25"/>
</svg>`

// 7세그먼트 숫자: 꺼진 칸도 희미하게 그려 미터기처럼
const H = 110, W = 60, TH = 11, G = 2
const SEG = {
  a: [TH / 2 + G, 0, W - TH - 2 * G, TH], g: [TH / 2 + G, H / 2 - TH / 2, W - TH - 2 * G, TH], d: [TH / 2 + G, H - TH, W - TH - 2 * G, TH],
  f: [0, TH / 2 + G, TH, H / 2 - TH / 2 - 2 * G], b: [W - TH, TH / 2 + G, TH, H / 2 - TH / 2 - 2 * G],
  e: [0, H / 2 + G, TH, H / 2 - TH / 2 - 2 * G], c: [W - TH, H / 2 + G, TH, H / 2 - TH / 2 - 2 * G],
}
const ON = { 0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg', '-': 'g' }
const r = ([x, y, w, h], ox, c, op) => `<rect x="${x + ox}" y="${y}" width="${w}" height="${h}" rx="${TH / 2}" fill="${c}" opacity="${op}"/>`
function segSvg(text, color) {
  let x = 12, body = ''
  for (const ch of text) {
    if (ON[ch] !== undefined) {
      body += Object.entries(SEG).map(([k, s]) => r(s, x, color, ON[ch].includes(k) ? 1 : ch === '-' ? 0 : 0.07)).join('')
      x += W + 16
    } else if (ch === '.' || ch === ',') {
      body += `<rect x="${x}" y="${H - TH - 2}" width="${TH + 2}" height="${TH + 2}" rx="3" fill="${color}"/>` + (ch === ',' ? `<rect x="${x + 3}" y="${H}" width="6" height="12" rx="3" fill="${color}"/>` : '')
      x += 28
    } else if (ch === '+') {
      body += r([TH / 2 + G, H / 2 - TH / 2, W - TH - 2 * G, TH], x, color, 1) + `<rect x="${x + W / 2 - TH / 2}" y="${H / 2 - 24}" width="${TH}" height="48" rx="${TH / 2}" fill="${color}"/>`
      x += W + 16
    } else if (ch === '%') {
      body += `<rect x="${x}" y="8" width="24" height="24" rx="6" fill="none" stroke="${color}" stroke-width="9"/><rect x="${x + 44}" y="${H - 32}" width="24" height="24" rx="6" fill="none" stroke="${color}" stroke-width="9"/><path d="M${x + 62} 6 L${x + 6} ${H - 6}" stroke="${color}" stroke-width="10" stroke-linecap="round"/>`
      x += 84
    }
  }
  const w = x - 16 + 12
  return { w, svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${H + 16}" viewBox="0 0 ${w} ${H + 16}"><g transform="skewX(-7) translate(${H * 0.12} 0)">${body}</g></svg>` }
}
const SEGS = [['35p', '35%', '#F2A93B'], ['73p', '73%', '#E8F0EC'], ['465p', '46.5%', '#E8F0EC'], ['465p_amber', '46.5%', '#F2A93B'],
  ['5774', '+5,774', '#3FD39F'], ['6', '6', '#3FD39F'], ['m37', '-3.7%', '#F2A93B'], ['63p', '63%', '#F2A93B']]

;(async () => {
  await sharp(Buffer.from(dark)).png().toFile(OUT('bg3_dark.png'))
  await sharp(Buffer.from(light)).png().toFile(OUT('bg3_light.png'))
  const ratio = {}
  for (const [key, text, color] of SEGS) {
    const { w, svg } = segSvg(text, color)
    ratio[key] = w / (H + 16)
    await sharp(Buffer.from(svg), { density: 288 }).png().toFile(OUT(`seg_${key}.png`))
  }
  fs.writeFileSync(OUT('seg.json'), JSON.stringify(ratio, null, 1))
  console.log('bg + seg ok')
})()

// 발표용 그림: 실사 사진(위키미디어 공용, 출처는 docs/사진_출처.md · 화면에는 표시하지 않음)을
// 쉐어택 색만 쓰는 판화풍 그림으로 바꾼다 — 밝기로 색 단계를 나누고, 따뜻한 불빛은 호박색, 윤곽은 짙은 녹색 선
const path = require('path')
const sharp = require('sharp')
const P = (f) => path.join(__dirname, 'img', 'photo', f)
const OUT = (f) => path.join(__dirname, 'img', f)

const hex = (h) => [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16))
const TONES = { night: ['0F2A22', '1A3D32', '2E6352', '7FAE9B', 'DCE8E1'], light: ['1A3D32', '3F7A66', '9CC7B6', 'DDEDE5', 'F7F9F7'] }
const AMBER = hex('F2A93B'), LINE = hex('0F2A22')

async function illustrate(src, w, h, { tones = 'light', pos = 'centre', edges = 0.9, warm = true } = {}) {
  const base = sharp(P(src)).rotate().resize(w, h, { fit: 'cover', position: pos }).normalise({ lower: 2, upper: 98 }).median(7)
  const { data, info } = await base.clone().removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const grey = await base.clone().greyscale().blur(1.2).raw().toBuffer()
  const pal = TONES[tones].map(hex)
  const out = Buffer.alloc(w * h * 3)
  for (let i = 0; i < w * h; i++) {
    const [r, g, b] = [data[i * 3], data[i * 3 + 1], data[i * 3 + 2]]
    const L = 0.299 * r + 0.587 * g + 0.114 * b
    const max = Math.max(r, g, b), min = Math.min(r, g, b), sat = max ? (max - min) / max : 0
    let c = pal[Math.min(pal.length - 1, Math.floor((L / 256) * pal.length))]
    if (warm && sat > 0.35 && r > g && g > b && r > 120) c = AMBER   // 가로등·택시 불빛 같은 따뜻한 색
    // 윤곽선 (소벨)
    const x = i % w, y = (i / w) | 0
    if (x > 0 && y > 0 && x < w - 1 && y < h - 1) {
      const p = (dx, dy) => grey[(y + dy) * w + x + dx]
      const gx = p(1, -1) + 2 * p(1, 0) + p(1, 1) - p(-1, -1) - 2 * p(-1, 0) - p(-1, 1)
      const gy = p(-1, 1) + 2 * p(0, 1) + p(1, 1) - p(-1, -1) - 2 * p(0, -1) - p(1, -1)
      if (Math.hypot(gx, gy) > 150 / edges) c = LINE
    }
    out.set(c, i * 3)
  }
  return sharp(out, { raw: { width: w, height: h, channels: 3 } }).median(3)
}

const shade = (w, h, from, to) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#0F2A22" stop-opacity="${from}"/><stop offset="1" stop-color="#0F2A22" stop-opacity="${to}"/></linearGradient></defs>
  <rect width="${w}" height="${h}" fill="url(#g)"/></svg>`)
const round = (w, h, r) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" rx="${r}" fill="#fff"/></svg>`)

async function bg(src, out, from, to, opt) {
  const img = await (await illustrate(src, 1920, 1080, { tones: 'night', ...opt })).png().toBuffer()
  // 아래쪽(목차 노선 자리)도 어둡게
  const bottom = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"><defs><linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset=".45" stop-color="#0F2A22" stop-opacity="0"/><stop offset="1" stop-color="#0F2A22" stop-opacity=".85"/></linearGradient></defs><rect width="1920" height="1080" fill="url(#b)"/></svg>`)
  await sharp(img).composite([{ input: shade(1920, 1080, from, to) }, { input: bottom }]).jpeg({ quality: 88 }).toFile(OUT(out))
}
async function card(src, out, w, h, opt) {
  const img = await (await illustrate(src, w, h, opt)).png().toBuffer()
  await sharp(img).composite([{ input: round(w, h, 28), blend: 'dest-in' }]).png().toFile(OUT(out))
}

;(async () => {
  await bg('cheongju_night.jpg', 'p_cover.jpg', 0.85, 0.2, { warm: false })
  await bg('osong_aerial.jpg', 'p_end.jpg', 0.9, 0.62, { warm: false })
  await card('osong_sign.jpg', 'p_osong_sign.png', 570, 675)
  await card('taxi_stop.jpg', 'p_taxi_stop.png', 570, 675)
  console.log('illustrations ok')
})()

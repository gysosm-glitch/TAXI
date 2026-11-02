// 발표 배경 그림 (교통 테마): 밤 도로·차선·택시 불빛 / 밝은 지도 격자·도로
const path = require('path')
const sharp = require('sharp')
const OUT = (f) => path.join(__dirname, 'img', f)

const dark = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0B211A"/><stop offset="1" stop-color="#123528"/></linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#F2A93B" stop-opacity=".55"/><stop offset="1" stop-color="#F2A93B" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="1920" height="1080" fill="url(#g)"/>
  <path d="M1100 1080 L1560 0 L1920 0 L1920 1080 Z" fill="#0A1C16" opacity=".85"/>
  <path d="M1330 1080 L1740 0" stroke="#F2A93B" stroke-width="10" stroke-dasharray="60 50" opacity=".55"/>
  <path d="M1110 1080 L1565 0" stroke="#C9D6D0" stroke-width="5" opacity=".35"/>
  <path d="M1915 1080 L1918 0" stroke="#C9D6D0" stroke-width="5" opacity=".2"/>
  ${[[1480, 420, 120], [1610, 180, 80], [1380, 700, 150], [1700, 820, 110]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#glow)"/>`).join('')}
  ${Array.from({ length: 40 }, (_, i) => `<circle cx="${(i * 137) % 1100}" cy="${(i * 211) % 1080}" r="${1 + (i % 3)}" fill="#C9D6D0" opacity=".18"/>`).join('')}
</svg>`

const light = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
  <rect width="1920" height="1080" fill="#F6F7F3"/>
  ${Array.from({ length: 25 }, (_, i) => `<path d="M${i * 80} 0 V1080" stroke="#E4E9E5" stroke-width="1"/>`).join('')}
  ${Array.from({ length: 14 }, (_, i) => `<path d="M0 ${i * 80} H1920" stroke="#E4E9E5" stroke-width="1"/>`).join('')}
  <path d="M1500 1080 C1600 760 1760 640 1920 600" fill="none" stroke="#DCE6E0" stroke-width="70"/>
  <path d="M1500 1080 C1600 760 1760 640 1920 600" fill="none" stroke="#FFFFFF" stroke-width="6" stroke-dasharray="40 30"/>
  <path d="M1920 900 C1800 950 1700 1000 1640 1080" fill="none" stroke="#F8E3BD" stroke-width="40" opacity=".7"/>
</svg>`

;(async () => {
  await sharp(Buffer.from(dark)).png().toFile(OUT('bg_dark.png'))
  await sharp(Buffer.from(light)).png().toFile(OUT('bg_light.png'))
  console.log('bg ok')
})()

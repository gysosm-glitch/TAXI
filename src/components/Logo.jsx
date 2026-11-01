// 쉐어택 로고: 택시 표시등 안에 '갈 때(실선) · 돌아올 때(귀로, 점선)' 화살표
export function LogoMark({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" aria-hidden="true" style={{ display: 'block', flex: 'none' }}>
      <rect width="512" height="512" rx="116" fill="#0F2A22" />
      <path d="M168 150 H344 Q366 150 372 171 L404 318 Q410 346 382 346 H130 Q102 346 108 318 L140 171 Q146 150 168 150 Z" fill="#F2A93B" />
      <path d="M170 208 H322" stroke="#0F2A22" strokeWidth="26" strokeLinecap="round" />
      <path d="M298 180 L336 208 L298 236" fill="none" stroke="#0F2A22" strokeWidth="26" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M342 294 H190" stroke="#0F2A22" strokeWidth="26" strokeLinecap="round" strokeDasharray="1 44" />
      <path d="M214 266 L176 294 L214 322" fill="none" stroke="#0F2A22" strokeWidth="26" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="150" y="372" width="212" height="22" rx="11" fill="#1D9E75" />
    </svg>
  )
}

export default function Logo({ size = 32, light = false }) {
  return (
    <span className={`logo ${light ? 'light' : ''}`}>
      <LogoMark size={size} />
      <b>쉐어택</b>
    </span>
  )
}

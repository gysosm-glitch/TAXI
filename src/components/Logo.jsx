// 쉐어택 로고 (2026-11 리디자인)
// S자 경로: 손님을 태운 점(출발) → 읍·면으로 갔다가 → 시내로 되돌아오는 귀로(화살표).
// Share의 S + '빈 차 귀로를 채운다'는 뜻. Action Blue 한 색 + 흰 선만 쓴다.
export const LOGO_PATHS = {
  route: 'M328 146 H194 A48 48 0 0 0 194 242 H294 A48 48 0 0 1 294 338 H172',
  arrow: 'M210 300 L164 338 L210 376',
  dot: { cx: 340, cy: 146, r: 30 },
}

export function LogoMark({ size = 36, mono = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" aria-hidden="true" style={{ display: 'block', flex: 'none' }}>
      <rect width="512" height="512" rx="114" fill={mono ? 'currentColor' : '#0066cc'} />
      <path d={LOGO_PATHS.route} fill="none" stroke="#fff" strokeWidth="40" strokeLinecap="round" strokeLinejoin="round" />
      <path d={LOGO_PATHS.arrow} fill="none" stroke="#fff" strokeWidth="40" strokeLinecap="round" strokeLinejoin="round" />
      <circle {...LOGO_PATHS.dot} fill="#fff" />
    </svg>
  )
}

export default function Logo({ size = 32, light = false, sub = false }) {
  return (
    <span className={`logo ${light ? 'light' : ''}`}>
      <LogoMark size={size} />
      <span className="logo-text">
        <b>쉐어택</b>
        {sub && <small>ShareTaxi</small>}
      </span>
    </span>
  )
}

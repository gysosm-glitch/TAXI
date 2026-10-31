// 직접 그린 교통 일러스트 (외부 이미지 없음 → 저작권 걱정 없음)

// 첫 화면: 도시 스카이라인 + 도로 위 택시·버스
export function CityScene() {
  return (
    <svg viewBox="0 0 360 150" width="100%" aria-hidden="true" style={{ display: 'block' }}>
      <g fill="#0f7f5f">
        <rect x="18" y="40" width="34" height="80" rx="3" />
        <rect x="58" y="62" width="26" height="58" rx="3" />
        <rect x="90" y="28" width="40" height="92" rx="3" />
        <rect x="246" y="48" width="36" height="72" rx="3" />
        <rect x="288" y="30" width="28" height="90" rx="3" />
        <rect x="320" y="66" width="30" height="54" rx="3" />
      </g>
      <g fill="#5dcaa5" opacity=".8">
        {[50, 64, 78, 92].map((y) => [26, 38].map((x) => <rect key={`${x}${y}`} x={x} y={y} width="6" height="7" rx="1" />))}
        {[40, 54, 68, 82, 96].map((y) => [98, 112].map((x) => <rect key={`${x}${y}`} x={x} y={y} width="7" height="7" rx="1" />))}
        {[42, 56, 70, 84].map((y) => [295, 305].map((x) => <rect key={`${x}${y}`} x={x} y={y} width="5" height="7" rx="1" />))}
      </g>
      <rect x="0" y="118" width="360" height="32" fill="#14684f" />
      {[20, 70, 120, 170, 220, 270, 320].map((x) => <rect key={x} x={x} y="132" width="26" height="3" rx="1.5" fill="#9fe1cb" />)}
      {/* 버스 */}
      <g transform="translate(150 86)">
        <rect width="84" height="34" rx="7" fill="#e1f5ee" />
        <rect x="6" y="6" width="16" height="12" rx="2" fill="#5dcaa5" />
        <rect x="26" y="6" width="16" height="12" rx="2" fill="#5dcaa5" />
        <rect x="46" y="6" width="16" height="12" rx="2" fill="#5dcaa5" />
        <rect x="66" y="6" width="12" height="20" rx="2" fill="#5dcaa5" />
        <circle cx="18" cy="34" r="6" fill="#1c1c1e" /><circle cx="66" cy="34" r="6" fill="#1c1c1e" />
      </g>
      {/* 택시 */}
      <g transform="translate(40 96)">
        <path d="M8 14 L18 4 H44 L54 14 H60 a4 4 0 0 1 4 4 V24 H0 V18 a4 4 0 0 1 4-4z" fill="#ffcd00" />
        <rect x="24" y="-3" width="14" height="6" rx="2" fill="#ffcd00" />
        <path d="M14 14 L21 7 H30 V14z M33 14 V7 H42 L48 14z" fill="#e1f5ee" />
        <circle cx="14" cy="25" r="6" fill="#1c1c1e" /><circle cx="50" cy="25" r="6" fill="#1c1c1e" />
      </g>
    </svg>
  )
}

// 홈 '지금 같이 타기' 카드: 택시 한 대에 세 사람
export function SharedTaxi({ size = 92 }) {
  return (
    <svg viewBox="0 0 100 64" width={size} aria-hidden="true">
      <circle cx="30" cy="12" r="7" fill="#e1f5ee" /><circle cx="50" cy="9" r="7" fill="#fff" /><circle cx="70" cy="12" r="7" fill="#e1f5ee" />
      <path d="M22 34 L32 22 H68 L78 34 H86 a5 5 0 0 1 5 5 V50 H9 V39 a5 5 0 0 1 5-5z" fill="#ffcd00" />
      <path d="M28 34 L35 26 H49 V34z M52 34 V26 H65 L72 34z" fill="#9fe1cb" />
      <circle cx="26" cy="52" r="8" fill="#1c1c1e" /><circle cx="26" cy="52" r="3" fill="#888" />
      <circle cx="74" cy="52" r="8" fill="#1c1c1e" /><circle cx="74" cy="52" r="3" fill="#888" />
    </svg>
  )
}

// 빈 화면 안내용 작은 그림
export function BusStop({ size = 80 }) {
  return (
    <svg viewBox="0 0 80 64" width={size} aria-hidden="true">
      <rect x="8" y="10" width="4" height="50" rx="2" fill="#9fe1cb" />
      <rect x="2" y="6" width="16" height="12" rx="3" fill="#1d9e75" />
      <rect x="26" y="26" width="48" height="26" rx="6" fill="#e1f5ee" />
      <rect x="31" y="31" width="11" height="9" rx="2" fill="#5dcaa5" /><rect x="45" y="31" width="11" height="9" rx="2" fill="#5dcaa5" /><rect x="59" y="31" width="10" height="9" rx="2" fill="#5dcaa5" />
      <circle cx="36" cy="53" r="5" fill="#1c1c1e" /><circle cx="64" cy="53" r="5" fill="#1c1c1e" />
    </svg>
  )
}

// 카드 앞 원형 아이콘 배지
export function Badge({ children, tone = 'teal' }) {
  return <span className={`ibadge ${tone}`}>{children}</span>
}

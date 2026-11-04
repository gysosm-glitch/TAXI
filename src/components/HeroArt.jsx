// 첫 화면 그림: 시내 → 읍·면(손님 태우고) / 읍·면 → 시내(돌아올 때도 손님과)
// 사진 대신 선 하나로 '귀로를 채운다'를 보여 준다. 흰 선 = 갈 때, 파란 선 = 돌아올 때
export default function HeroArt({ from = '시내', to = '오송·오창' }) {
  return (
    <svg className="hero-art" viewBox="0 0 330 150" role="img" aria-label={`${from}에서 ${to}로 갈 때와 돌아올 때 모두 손님을 태우는 그림`} width="100%">
      <path d="M58 70 C 120 18, 210 18, 272 70" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      <path d="M262 62 L274 71 L260 76" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M272 86 C 210 138, 120 138, 58 86" fill="none" stroke="#2997ff" strokeWidth="3" strokeLinecap="round" />
      <path d="M70 80 L56 86 L68 94" fill="none" stroke="#2997ff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="40" cy="78" r="14" fill="#fff" />
      <circle cx="290" cy="78" r="14" fill="#2997ff" />
      <text x="40" y="118" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="600">{from}</text>
      <text x="290" y="118" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="600">{to}</text>
      <text x="165" y="20" textAnchor="middle" fill="#cccccc" fontSize="13">갈 때 · 손님 태우고</text>
      <text x="165" y="146" textAnchor="middle" fill="#2997ff" fontSize="13" fontWeight="600">돌아올 때도 · 손님과</text>
    </svg>
  )
}

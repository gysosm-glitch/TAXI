// 카드 앞 원형 아이콘 배지
export function Badge({ children, tone = 'teal' }) {
  return <span className={`ibadge ${tone}`}>{children}</span>
}

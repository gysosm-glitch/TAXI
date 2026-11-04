// 체험 계정의 로그인·기록은 탭(sessionStorage)별로 둔다. 두 탭에서 A·B를 동시에 쓸 수 있다.
// 발표용 앱이라 열면 시연 관리자 계정으로 바로 들어간다. 주소에 ?login을 붙이면 로그인 화면, ?demo=B면 두 번째 계정.
const memory = { getItem: () => null, setItem: () => {}, removeItem: () => {} }
const safe = (get) => { try { return get() } catch { return memory } }

function pickDemoTab() {
  const session = safe(() => sessionStorage), local = safe(() => localStorage)
  const query = typeof location === 'undefined' ? '' : location.search
  if (/[?&]login\b/.test(query)) return session.getItem('demo_tab')
  const asked = /[?&]demo=B\b/.test(query) ? 'B' : null
  if (asked) { session.setItem('demo_tab', asked); return asked }
  const here = session.getItem('demo_tab')
  if (here) return here
  const auto = local.getItem('demo_auto') ?? 'A'
  let realLogin = false
  try { realLogin = Object.keys(localStorage).some((k) => k.startsWith('sb-') && k.endsWith('-auth-token')) } catch {}
  if (auto && !realLogin) { session.setItem('demo_tab', auto); return auto }
  return null
}
export const demoTab = pickDemoTab()
export const store = demoTab ? safe(() => sessionStorage) : safe(() => localStorage)

export const isDemoEmail = (email) => !!email?.startsWith('demo.') && email.endsWith('@gatita-cheongju.com')

// 체험 계정의 로그인·기록은 탭(sessionStorage)별로 둔다. 두 탭에서 A·B를 동시에 쓸 수 있다.
// 어떤 계정을 썼는지만 기억해 다음에 열면 자동으로 들어온다. 일반 회원은 그대로 localStorage.
const memory = { getItem: () => null, setItem: () => {}, removeItem: () => {} }
const safe = (get) => { try { return get() } catch { return memory } }

function pickDemoTab() {
  const session = safe(() => sessionStorage), local = safe(() => localStorage)
  const here = session.getItem('demo_tab')
  if (here) return here
  // 자동 로그인: 전에 쓴 체험 계정이 있고 이메일 로그인이 없으면 그 계정으로 시작
  const auto = local.getItem('demo_auto')
  let realLogin = false
  try { realLogin = Object.keys(localStorage).some((k) => k.startsWith('sb-') && k.endsWith('-auth-token')) } catch {}
  if (auto && !realLogin) { session.setItem('demo_tab', auto); return auto }
  return null
}
export const demoTab = pickDemoTab()
export const store = demoTab ? safe(() => sessionStorage) : safe(() => localStorage)

export const isDemoEmail = (email) => !!email?.startsWith('demo.') && email.endsWith('@gatita-cheongju.com')

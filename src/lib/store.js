// 체험 계정은 이 탭(sessionStorage)에만 기록한다. 탭을 닫으면 로그인·기기 기록이 함께 사라지고,
// 같은 브라우저의 두 탭에서 A·B를 동시에 쓸 수 있다. 일반 회원은 그대로 localStorage.
const memory = { getItem: () => null, setItem: () => {}, removeItem: () => {} }
const safe = (get) => { try { return get() } catch { return memory } }

export const demoTab = safe(() => sessionStorage).getItem('demo_tab')
export const store = demoTab ? safe(() => sessionStorage) : safe(() => localStorage)

export const isDemoEmail = (email) => !!email?.startsWith('demo.') && email.endsWith('@gatita-cheongju.com')

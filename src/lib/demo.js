// 공모전 시연용 체험 계정 (실제 개인정보 없음)
// 처음 누르면 계정을 만들고 가입 정보까지 채운다. Supabase에서 Confirm email이 꺼져 있어야 한다.
// 들어올 때마다 지난 체험 기록을 지운다. 로그아웃하기 전까지 다음에 열면 자동으로 들어온다.
import { supabase } from './supabase.js'
import { saveProfile } from './auth.js'
import { store } from './store.js'

export const DEMO = [
  { key: 'A', role: '시연 관리자', email: 'demo.a@gatita-cheongju.com', nickname: '시연 관리자', phone: '010-0000-0001' },
  { key: 'B', role: '참여하는 사람', email: 'demo.b@gatita-cheongju.com', nickname: '오창출근러', phone: '010-0000-0002' },
]
export const DEMO_PASSWORD = 'gatita-demo-2026'
const COMMON = { gender: 'F', age_group: '20s', org_email: null,
  agree_terms: true, agree_privacy: true, agree_location: true, agree_age14: true, agree_marketing: false }

// 이 탭을 체험 전용으로 바꿔 다시 연다 (탭별 로그인 설정은 앱을 불러올 때 정해진다)
export function enterDemo(key) {
  sessionStorage.setItem('demo_tab', key)
  try { localStorage.setItem('demo_auto', key) } catch {}
  location.reload()
}
export const leaveDemoFlag = () => { try { sessionStorage.removeItem('demo_tab'); localStorage.removeItem('demo_auto') } catch {} }

export async function startDemo(d) {
  let { data, error } = await supabase.auth.signInWithPassword({ email: d.email, password: DEMO_PASSWORD })
  if (error && error.message.includes('Invalid login credentials')) {
    ;({ data, error } = await supabase.auth.signUp({ email: d.email, password: DEMO_PASSWORD }))
    if (!error && !data.session) return { error: { message: '체험 계정을 쓰려면 Supabase에서 Confirm email을 꺼 주세요.' } }
  }
  if (error) return { error }
  await supabase.rpc('reset_demo')   // 지난 체험 기록 지우기 (실패해도 체험은 계속)
  const uid = data.session.user.id
  const { data: existing } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle()
  if (existing && existing.nickname !== d.nickname) {
    const renamed = await supabase.from('profiles').update({ nickname: d.nickname }).eq('id', uid).select().single()
    if (!renamed.error) return { profile: renamed.data }
  }
  if (existing) return { profile: existing }
  const saved = await saveProfile(uid, { nickname: d.nickname, phone: d.phone, ...COMMON })
  return saved.error ? { error: saved.error } : { profile: saved.data }
}

// 로그아웃 없이 다시 찍을 때: 이 계정의 체험 기록만 지우고 처음 화면으로
export async function resetDemo() {
  const { error } = await supabase.rpc('reset_demo')
  if (error) return { error }
  store.removeItem('history_v1')
  store.removeItem('demo_joined_v1')
  store.removeItem('paid_v1')
  location.reload()
  return {}
}


// 공모전 시연용 체험 계정 (실제 개인정보 없음)
// 처음 누르면 계정을 만들고 가입 정보까지 채운다. Supabase에서 Confirm email이 꺼져 있어야 한다.
import { supabase } from './supabase.js'
import { saveProfile } from './auth.js'

export const DEMO = [
  { key: 'A', role: '모집하는 사람', email: 'demo.a@gatita-cheongju.com', nickname: '오송새내기', phone: '010-0000-0001' },
  { key: 'B', role: '참여하는 사람', email: 'demo.b@gatita-cheongju.com', nickname: '오창출근러', phone: '010-0000-0002' },
]
const PASSWORD = 'gatita-demo-2026'
const COMMON = { gender: 'F', age_group: '20s', org_email: null,
  agree_terms: true, agree_privacy: true, agree_location: true, agree_age14: true, agree_marketing: false }

export async function startDemo(d) {
  let { data, error } = await supabase.auth.signInWithPassword({ email: d.email, password: PASSWORD })
  if (error && error.message.includes('Invalid login credentials')) {
    ;({ data, error } = await supabase.auth.signUp({ email: d.email, password: PASSWORD }))
    if (!error && !data.session) return { error: { message: '체험 계정을 쓰려면 Supabase에서 Confirm email을 꺼 주세요.' } }
  }
  if (error) return { error }
  const uid = data.session.user.id
  const { data: existing } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle()
  if (existing) return { profile: existing }
  const saved = await saveProfile(uid, { nickname: d.nickname, phone: d.phone, ...COMMON })
  return saved.error ? { error: saved.error } : { profile: saved.data }
}

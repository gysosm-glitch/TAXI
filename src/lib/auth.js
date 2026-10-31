// 로그인 상태와 회원 프로필 (Supabase Auth + profiles 테이블)
import { useEffect, useState } from 'react'
import { supabase } from './supabase.js'

export function useAccount() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(!!supabase)

  const loadProfile = async (s) => {
    if (!s) { setProfile(null); return }
    const { data } = await supabase.from('profiles').select('*').eq('id', s.user.id).maybeSingle()
    setProfile(data ?? null)
  }

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session); await loadProfile(data.session); setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => { setSession(s); loadProfile(s) })
    return () => sub.subscription.unsubscribe()
  }, [])

  return { session, profile, loading, reload: () => loadProfile(session), setProfile }
}

const redirectTo = () => window.location.origin

export const signUpWithEmail = (email, password) =>
  supabase.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo() } })

export const signInWithEmail = (email, password) =>
  supabase.auth.signInWithPassword({ email, password })

export const signOut = () => supabase.auth.signOut()

export async function saveProfile(userId, form) {
  const row = { id: userId, ...form, updated_at: new Date().toISOString() }
  return supabase.from('profiles').upsert(row).select().single()
}

export const deleteProfile = (userId) => supabase.from('profiles').delete().eq('id', userId)

// Supabase 오류 메시지를 사용자용 한국어로
export function authError(e) {
  const m = e?.message || ''
  if (m.includes('Invalid login credentials')) return '이메일 또는 비밀번호가 맞지 않아요.'
  if (m.includes('Email not confirmed')) return '메일함에서 가입 확인 링크를 먼저 눌러 주세요.'
  if (m.includes('already registered')) return '이미 가입된 이메일이에요. 로그인해 주세요.'
  if (m.includes('Password should be')) return '비밀번호는 6자 이상이어야 해요.'
  if (m.includes('not authorized') || m.includes('sending confirmation') || m.includes('sending')) return '가입 확인 메일을 보내지 못했어요. 관리자가 Supabase에서 이메일 확인(Confirm email)을 꺼야 해요.'
  if (m.includes('rate limit')) return '잠시 가입 요청이 많았어요. 몇 분 뒤 다시 시도해 주세요.'
  if (m.includes('invalid') && m.toLowerCase().includes('email')) return '이메일 주소 형식을 확인해 주세요.'
  if (m.includes('relation') && m.includes('profiles')) return '서버에 회원 테이블이 아직 없어요. 관리자에게 알려 주세요.'
  return m || '잠시 후 다시 시도해 주세요.'
}

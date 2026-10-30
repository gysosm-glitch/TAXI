import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// 환경변수가 없으면 null → 앱은 로컬 합성 데이터로 동작
export const supabase = url && anonKey ? createClient(url, anonKey) : null

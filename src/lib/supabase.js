import { createClient } from '@supabase/supabase-js'
import { demoTab, store } from './store.js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// 체험 탭은 로그인 정보를 탭별로 따로 둔다 (A·B 동시 사용, 탭을 닫으면 자동 로그아웃)
const options = demoTab ? { auth: { storage: store, storageKey: `sharetaxi-demo-${demoTab}` } } : undefined

// 환경변수가 없으면 null → 앱은 로컬 합성 데이터로 동작
export const supabase = url && anonKey ? createClient(url, anonKey, options) : null

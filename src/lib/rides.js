// 같이타기 모집·참여 (Supabase rides, ride_members)
import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase.js'

const ACTIVE = ['open', 'full']
const SELECT = '*, ride_members(user_id, nickname, joined_at)'

// 출발 15분 전까지 지난 모집도 잠깐 보여 준다 (늦게 온 사람)
const since = () => new Date(Date.now() - 15 * 60000).toISOString()

export async function listRides(spotId) {
  const { data, error } = await supabase.from('rides').select(SELECT)
    .eq('spot_id', spotId).in('status', ACTIVE).gte('depart_at', since()).order('depart_at')
  return { data: data ?? [], error }
}

export async function listAllOpen() {
  const { data } = await supabase.from('rides').select(SELECT).in('status', ACTIVE).gte('depart_at', since()).order('depart_at').limit(30)
  return data ?? []
}

export async function myRides(userId) {
  const { data: mine } = await supabase.from('ride_members').select('ride_id').eq('user_id', userId)
  const ids = (mine ?? []).map((m) => m.ride_id)
  if (!ids.length) return []
  const { data } = await supabase.from('rides').select(SELECT).in('id', ids).in('status', [...ACTIVE, 'done'])
    .gte('depart_at', new Date(Date.now() - 3 * 3600000).toISOString()).order('depart_at')
  return data ?? []
}

export const createRide = (row) => supabase.from('rides').insert(row).select(SELECT).single()
export const joinRide = (rideId, userId, nickname) => supabase.from('ride_members').insert({ ride_id: rideId, user_id: userId, nickname })
export const leaveRide = (rideId, userId) => supabase.from('ride_members').delete().eq('ride_id', rideId).eq('user_id', userId)
export const setRideStatus = (rideId, status) => supabase.from('rides').update({ status }).eq('id', rideId)

// 모집·참여가 바뀌면 다시 불러오기 (실시간)
export function useRidesLive(load, deps) {
  const [tick, setTick] = useState(0)
  const refresh = useCallback(() => setTick((t) => t + 1), [])
  useEffect(() => {
    if (!supabase) return
    const ch = supabase.channel(`rides-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rides' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ride_members' }, refresh)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])
  useEffect(() => { load() }, [...deps, tick])
  return refresh
}

// 같이 탄 기록 (이번 달 아낀 돈) — 이 기기에 저장
export function recordTrip(rec) {
  try {
    const list = JSON.parse(localStorage.getItem('history_v1')) ?? []
    if (list.some((h) => h.rideId === rec.rideId)) return
    localStorage.setItem('history_v1', JSON.stringify([{ ...rec, at: new Date().toISOString() }, ...list].slice(0, 100)))
  } catch { /* 저장 불가 환경 */ }
}
export function tripRecorded(rideId) {
  try { return (JSON.parse(localStorage.getItem('history_v1')) ?? []).some((h) => h.rideId === rideId) } catch { return false }
}

export function rideError(e) {
  const m = e?.message || ''
  if (m.includes('마감') || m.includes('성별') || m.includes('정원')) return m.replace(/^.*?(이미|같은|정원)/, '$1')
  if (m.includes('duplicate key')) return '이미 참여한 모집이에요.'
  if (m.includes('relation') && m.includes('rides')) return '서버에 같이타기 테이블이 아직 없어요. 관리자에게 알려 주세요.'
  if (m.includes('row-level security')) return '가입 정보(성별)를 먼저 입력해 주세요.'
  return m || '잠시 후 다시 시도해 주세요.'
}

// ---- 시범 운영 (supabase/ops.sql) ----
export const saveTrip = (row) => supabase.from('trips').upsert(row, { onConflict: 'ride_id,user_id', ignoreDuplicates: true })
export const rateMembers = (rows) => supabase.from('ratings').upsert(rows, { onConflict: 'ride_id,rater_id,ratee_id', ignoreDuplicates: true })
export const sendFeedback = (message, userId) => supabase.from('feedback').insert({ message, user_id: userId ?? null })
export async function getStats() {
  const { data, error } = await supabase.rpc('public_stats')
  return error ? null : data
}
export async function getMyRating(uid) {
  const { data } = await supabase.rpc('user_rating', { uid })
  return data
}
export async function myTripsThisMonth(uid) {
  const start = new Date(); start.setDate(1); start.setHours(0, 0, 0, 0)
  const { data } = await supabase.from('trips').select('saving, created_at').eq('user_id', uid).gte('created_at', start.toISOString())
  return data ?? null
}

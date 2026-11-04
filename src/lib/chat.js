// 동승자 채팅 (supabase/chat_demo.sql): 같은 모집 참여자끼리만
import { useEffect, useState } from 'react'
import { supabase } from './supabase.js'

export const sendMessage = (rideId, userId, body) =>
  supabase.from('ride_messages').insert({ ride_id: rideId, user_id: userId, body }).select().single()

export function useRideMessages(rideId) {
  const [messages, setMessages] = useState([])
  const [failed, setFailed] = useState(false)

  const merge = (rows) => setMessages((list) => {
    const byId = new Map([...list, ...rows].map((m) => [m.id, m]))
    return [...byId.values()].sort((a, b) => a.id - b.id)
  })

  useEffect(() => {
    if (!supabase) return
    let alive = true
    const load = async () => {
      const { data, error } = await supabase.from('ride_messages').select('*').eq('ride_id', rideId).order('id').limit(200)
      if (!alive) return
      setFailed(!!error)
      if (data) merge(data)
    }
    // 연결·재연결될 때마다 불러와 끊긴 동안의 대화도 채운다
    const ch = supabase.channel(`chat-${rideId}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ride_messages', filter: `ride_id=eq.${rideId}` }, (p) => merge([p.new]))
      .subscribe((status) => { if (status === 'SUBSCRIBED') load() })
    load()
    return () => { alive = false; supabase.removeChannel(ch) }
  }, [rideId])

  return { messages, failed, merge }
}

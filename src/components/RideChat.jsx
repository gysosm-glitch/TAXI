// 모집 카드 안의 동승자 채팅 (실제 모집은 서버, 시연 모집은 이 기기에서만)
import { useEffect, useRef, useState } from 'react'
import { sendMessage, useRideMessages } from '../lib/chat.js'

const QUICK = {
  pool: ['승차장 앞이에요', '지금 가고 있어요', '5분 늦어요', '택시 불렀어요'],
  roundtrip: ['택시 탔어요', '곧 도착해요', '내리는 곳에 있어요', '5분 늦어요'],
}
const hhmm = (iso) => new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })

function ChatView({ ride, me, messages, onSend, failed }) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [err, setErr] = useState(null)
  const list = useRef(null)
  const names = Object.fromEntries(ride.ride_members.map((m) => [m.user_id, m.nickname]))

  useEffect(() => { if (list.current) list.current.scrollTop = list.current.scrollHeight }, [messages.length])

  const send = async (body) => {
    const clean = body.trim()
    if (!clean || sending) return
    setSending(true); setErr(null)
    const { error } = await onSend(clean)
    setSending(false)
    if (error) return setErr('보내지 못했어요. 잠시 후 다시 시도해 주세요.')
    setText('')
  }

  if (ride.ride_members.length < 2) return <p className="chat-empty">참여하면 대화할 수 있어요.</p>
  if (failed) return <p className="chat-empty">채팅을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</p>

  return (
    <div className="chat">
      <p className="chat-title">대화 <small>번호 비공개</small></p>
      {messages.length > 0 && (
        <div className="chat-list" ref={list}>
          {messages.map((m) => (
            <div key={m.id} className={`chat-msg ${m.user_id === me ? 'mine-msg' : ''}`}>
              {m.user_id !== me && <small>{names[m.user_id] ?? '나간 동승자'}</small>}
              <p>{m.body}</p>
              <time>{hhmm(m.created_at)}</time>
            </div>
          ))}
        </div>
      )}
      <div className="chat-quick">
        {QUICK[ride.kind === 'roundtrip' ? 'roundtrip' : 'pool'].filter((q) => q !== '택시 불렀어요' || ride.host_id === me).map((q) => <button key={q} type="button" disabled={sending} onClick={() => send(q)}>{q}</button>)}
      </div>
      <form className="chat-form" onSubmit={(e) => { e.preventDefault(); send(text) }}>
        <input value={text} maxLength={200} placeholder="메시지 입력" aria-label="메시지 입력" onChange={(e) => setText(e.target.value)} />
        <button type="submit" disabled={sending || !text.trim()}>보내기</button>
      </form>
      {err && <p className="form-msg bad" style={{ margin: '8px 0 0' }}>{err}</p>}
    </div>
  )
}

function LiveChat({ ride, me }) {
  const { messages, failed, merge } = useRideMessages(ride.id)
  const onSend = async (body) => {
    const { data, error } = await sendMessage(ride.id, me, body)
    if (!error) merge([data])
    return { error }
  }
  return <ChatView ride={ride} me={me} messages={messages} failed={failed} onSend={onSend} />
}

export default function RideChat({ ride, me }) {
  if (ride.virtual) return <ChatView ride={ride} me={me} messages={ride.messages} onSend={async (body) => { ride.sendDemo(body); return {} }} />
  return <LiveChat ride={ride} me={me} />
}

// 시연용 가상 모집: 서버에 저장하지 않고 이 기기에서만 움직인다. 화면에는 항상 '시연' 표시를 붙인다.
// 시간은 멈추지 않는다: 출발 시각은 지금 시각 기준으로 계속 다음 회차가 생기고, 오송역 모집은 실제 KTX 도착 시각에 맞춘다.
import { useEffect, useState } from 'react'
import { spots, placeAt } from '../data.js'
import { store } from './store.js'

const KEY = 'demo_joined_v1'
const MIN = 60000
const NICK = ['오송출근러', '가경동주민', '충북대22', '바이오연구원', '오창호수', 'KTX단골', '밤귀가', '터미널행', '산단3교대', '청주토박이', '주말귀향', '옥산이웃']
const spot = (id) => spots.find((s) => s.id === id)
const here = (id, name) => { const s = spot(id); return placeAt(s.lat, s.lon, name ?? s.name) }
const TERMINAL = '고속·시외버스터미널'
const hash = (s) => [...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7)

// 데이터로 고른 거점 위주의 시범 경로. every: 몇 분마다 모이는지, train: 실제 열차 도착에 맞춘 모집
const ROUTES = [
  { id: 'osong-term', from: 'osong_stn', to: 'bus_terminal', toName: TERMINAL, meets: ['택시 승강장 앞', '서편 출구', '동편 출구'], maxes: [3, 2, 4], every: 20, train: true },
  { id: 'osong-term-rt', from: 'osong_stn', to: 'bus_terminal', toName: TERMINAL, every: 45, phase: 13, maxes: [2], roundtrip: true, outFrom: '가경동' },
  { id: 'ochang-term', from: 'ochang_lake', to: 'bus_terminal', toName: TERMINAL, meets: ['호수공원 정문', '공원 주차장 입구'], maxes: [3, 4, 2], every: 20, phase: 7, bus: true },
  { id: 'term-cbnu', from: 'bus_terminal', to: 'cbnu', toName: '충북대학교 중문', meets: ['택시 승강장', '터미널 정문'], maxes: [4, 3, 2], every: 15, phase: 4 },
]
const CONDS = ['캐리어 있어도 괜찮아요', '조용히 가요', '5분까지 기다려요', '바로 출발해요', '짐은 적게요', '중간 하차 없어요']

function room(r, departMs, gender, note) {
  const key = `${r.id}-${departMs}`
  const h = hash(key)
  const max = r.maxes[h % r.maxes.length]
  const count = 1 + (h % Math.min(2, max - 1))      // 이미 모인 사람 1~2명, 내 자리는 남긴다
  const members = Array.from({ length: count }, (_, i) => ({ user_id: `v-${h}-${i}`, nickname: NICK[(h + i * 5) % NICK.length], joined_at: new Date(departMs - (30 - i) * MIN).toISOString() }))
  const from = spot(r.from), dest = here(r.to, r.toName)
  return {
    id: `demo-${key}`, virtual: true, kind: r.roundtrip ? 'roundtrip' : 'pool', status: 'open', gender, note,
    host_id: members[0].user_id, spot_id: r.from, max_people: max, depart_at: new Date(departMs).toISOString(),
    spot_name: r.roundtrip ? `${from.name} · 왕복 택시 도착` : `${from.name} · ${r.meets[h % r.meets.length]}`,
    conds: r.roundtrip ? [] : [CONDS[h % CONDS.length], ...(h % 3 === 0 ? [CONDS[(h >> 3) % CONDS.length]] : [])].filter((c, i, l) => l.indexOf(c) === i),
    dest_zone: dest.zoneId, dest_name: dest.name, dest_place: dest, out_from: r.outFrom, ride_members: members,
    extra: NICK[(h + 11) % NICK.length],
  }
}

// 지금 시각 기준 앞으로의 시연 모집 (실제 열차 정보가 있으면 그 시각에 맞춘다)
export function demoRooms(now, trains, gender = 'F', buses = null) {
  const out = []
  const today = new Date(now)
  for (const r of ROUTES) {
    const usable = r.train && trains?.ok ? trains.next : null
    if (usable?.length) {
      let lastAt = 0, n = 0
      for (const t of usable) {
        const [hh, mm] = t.time.split(':').map(Number)
        const arrive = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hh, mm).getTime()
        if (arrive - lastAt < 10 * MIN || arrive + 10 * MIN < now + 3 * MIN) continue
        out.push(room(r, arrive + 10 * MIN, gender, `${t.grade.split('(')[0]} ${t.time} 도착 후`))
        lastAt = arrive
        if (++n === 3) break
      }
      if (n) continue
    }
    // 터미널행: 실제 버스 출발 45분 전에 모인다
    const trips = r.bus && buses?.ok ? buses.next : null
    if (trips?.length) {
      let lastAt = 0, n = 0
      for (const t of trips) {
        const [hh, mm] = t.time.split(':').map(Number)
        const dep = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hh, mm).getTime()
        const meetAt = dep - 45 * MIN
        if (meetAt < now + 3 * MIN || meetAt - lastAt < 15 * MIN) continue
        out.push(room(r, meetAt, gender, `${t.to}행 ${t.time} ${t.kind}버스 타러`))
        lastAt = meetAt
        if (++n === 3) break
      }
      if (n) continue
    }
    const step = r.every * MIN, phase = (r.phase ?? 0) * MIN
    const first = Math.ceil((now + 3 * MIN - phase) / step) * step + phase
    for (let i = 0; i < 2; i++) out.push(room(r, first + i * step, gender))
  }
  return out.sort((a, b) => a.depart_at.localeCompare(b.depart_at))
}

const load = () => { try { return JSON.parse(store.getItem(KEY)) ?? [] } catch { return [] } }
const save = (list) => { try { store.setItem(KEY, JSON.stringify(list)) } catch {} }

const REPLIES = ['네, 좋아요!', '알겠습니다. 거기서 봬요.', '넵, 천천히 오세요.', '확인했어요. 고맙습니다!']

// 참여한 뒤의 흐름: 참여 시각부터 지난 시간으로 계산한다 (새로고침해도 이어진다)
function derive(j, me, myNick, now, send, pay) {
  const r = j.ride, at = (sec) => new Date(j.joinedAt + sec * 1000).toISOString()
  const e = (now - j.joinedAt) / 1000
  const host = r.ride_members[0]
  const members = [...r.ride_members, { user_id: me, nickname: myNick, joined_at: at(0) }]
  const msgs = []
  const say = (sec, user_id, body) => { if (e >= sec) msgs.push({ id: `${user_id}-${sec}`, user_id, body, created_at: at(sec) }) }
  const place = r.spot_name.split(' · ')[1] ?? r.spot_name
  if (r.kind === 'roundtrip') {
    say(2, host.user_id, `안녕하세요. ${r.out_from}에서 택시 타고 가는 중이에요. 오송역에서 내리면 바로 타시면 돼요.`)
    say(25, host.user_id, '곧 도착해요. 택시 승강장 쪽에서 내릴게요.')
  } else {
    say(2, host.user_id, `안녕하세요! ${place}에서 만나요.`)
    if (members.length < r.max_people) {
      if (e >= 10) members.push({ user_id: `${host.user_id}-x`, nickname: r.extra, joined_at: at(10) })
      say(10, `${host.user_id}-x`, '저도 같이 갈게요!')
    }
    say(20, host.user_id, '1인 금액을 먼저 보내 주시면 바로 택시 부를게요.')
  }
  if (j.paidAt) {
    const sec = (j.paidAt - j.joinedAt) / 1000
    say(sec + 2, host.user_id, '확인했어요. 택시 부를게요.')
    say(sec + 8, host.user_id, `택시 불렀어요. 3분쯤 뒤 ${place}으로 와요.`)
  }
  j.mine.forEach((m, i) => {
    msgs.push({ id: `me-${i}`, user_id: me, body: m.body, created_at: new Date(m.at).toISOString() })
    if (!m.silent && now - m.at >= 2500) msgs.push({ id: `re-${i}`, user_id: host.user_id, body: REPLIES[i % REPLIES.length], created_at: new Date(m.at + 2500).toISOString() })
  })
  const full = members.length >= r.max_people || e >= 18      // 인원이 안 차도 잠시 뒤 모집자가 이 인원으로 출발
  return { ...r, ride_members: members, status: full ? 'full' : 'open', paid: !!j.paidAt, taxi: !!j.paidAt && now - j.paidAt >= 8000, messages: msgs.sort((a, b) => a.created_at.localeCompare(b.created_at)), sendDemo: send, pay }
}

export function useNow(ms = 30000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(t) }, [ms])
  return now
}

export function useDemoJoined(me, myNick) {
  const [list, setList] = useState(load)
  const now = useNow(list.length ? 1000 : 30000)
  const update = (next) => { save(next); setList(next) }
  const join = (ride) => update([...list.filter((j) => j.ride.id !== ride.id), { ride, joinedAt: Date.now(), mine: [] }])
  const leave = (id) => update(list.filter((j) => j.ride.id !== id))
  const send = (id, body) => update(list.map((j) => (j.ride.id === id ? { ...j, mine: [...j.mine, { body, at: Date.now() }] } : j)))
  const pay = (id, body) => update(list.map((j) => (j.ride.id === id ? { ...j, paidAt: Date.now(), mine: [...j.mine, { body, at: Date.now(), silent: true }] } : j)))
  const rides = me ? list.map((j) => derive(j, me, myNick, now, (body) => send(j.ride.id, body), (body) => pay(j.ride.id, body))) : []
  return { rides, join, leave }
}

export const clearDemoJoined = () => store.removeItem(KEY)

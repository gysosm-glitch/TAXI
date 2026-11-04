// Vercel 서버 함수: 청주 터미널에서 오늘 출발하는 고속·시외버스 (국토교통부 TAGO 15098522·15098541)
// 환경변수: 고속·시외 키 (이름은 _keys.js 참고, 없으면 TAGO_API_KEY)
import { expressKey, suburbKey } from './_keys.js'
const BASE = 'https://apis.data.go.kr/1613000'
const EXPRESS = `${BASE}/ExpBusInfo`
const SUBURB = `${BASE}/SuburbsBusInfo`
// 청주에서 많이 가는 도착지 이름 (터미널 목록 조회로 ID를 찾는다)
const TO_EXPRESS = ['서울경부', '센트럴시티', '동서울', '부산', '동대구', '광주']
const TO_SUBURB = ['대전복합', '천안', '인천공항', '세종', '김포공항']

const items = (json) => {
  const it = json?.response?.body?.items?.item
  return it ? (Array.isArray(it) ? it : [it]) : []
}
async function getJSON(url) {
  const raw = await fetch(url, { signal: AbortSignal.timeout(7000) }).then((r) => r.text())
  try { return JSON.parse(raw) } catch { throw new Error(raw.replace(/\s+/g, ' ').slice(0, 160)) }
}
const kst = () => new Date(Date.now() + 9 * 3600000)
const ymd = (d) => d.toISOString().slice(0, 10).replace(/-/g, '')
const hm = (v) => { const s = String(v); return `${s.slice(8, 10)}:${s.slice(10, 12)}` }

const cache = {}   // 터미널 ID는 잘 안 바뀌므로 함수 인스턴스가 살아 있는 동안 재사용
const apiMessage = (json) => json?.response?.header?.resultMsg ?? json?.OpenAPI_ServiceResponse?.cmmMsgHeader?.returnAuthMsg ?? json?.OpenAPI_ServiceResponse?.cmmMsgHeader?.errMsg ?? null
async function terminalId(base, op, key, name, exact) {
  const id = `${base}|${name}`
  if (cache[id]) return cache[id]
  const pick = (list) => (exact && list.find((t) => t.terminalNm === name)) || list.find((t) => t.terminalNm?.includes(name))
  const url = `${base}/${op}?serviceKey=${key}&numOfRows=500&pageNo=1&_type=json`
  const named = await getJSON(`${url}&terminalNm=${encodeURIComponent(name)}`)
  let hit = pick(items(named))
  if (!hit) {
    // 이름 검색이 비면 전체 목록에서 찾는다
    const all = await getJSON(url)
    hit = pick(items(all))
    if (!hit && exact) throw new Error(`터미널 없음(${items(all).length}건, ${apiMessage(all) ?? apiMessage(named) ?? '응답 없음'})`)
  }
  return (cache[id] = hit?.terminalId ?? null)
}

async function schedules(kind, base, listOp, infoOp, key, toNames, day, now) {
  const dep = await terminalId(base, listOp, key, '청주', true)
  if (!dep) return { trips: [], error: `${kind}: 청주 터미널을 찾지 못함` }
  const trips = []
  let error = null
  await Promise.all(toNames.map(async (name) => {
    try {
      const arr = await terminalId(base, listOp, key, name)
      if (!arr) return
      const json = await getJSON(`${base}/${infoOp}?serviceKey=${key}&depTerminalId=${dep}&arrTerminalId=${arr}&depPlandTime=${day}&numOfRows=100&pageNo=1&_type=json`)
      for (const t of items(json)) {
        const time = hm(t.depPlandTime)
        if (time >= now) trips.push({ kind, time, to: name, toName: t.arrPlaceNm ?? name, grade: t.gradeNm ?? '', charge: Number(t.charge) || null })
      }
    } catch (e) { error = String(e.message ?? e).slice(0, 160) }
  }))
  return { trips, error }
}

export default async function handler(req, res) {
  const ek = expressKey(), sk = suburbKey()
  if (!ek && !sk) return res.status(200).json({ ok: false, reason: 'no_key' })
  const d = kst(), day = ymd(d), now = d.toISOString().slice(11, 16)
  const [ex, su] = await Promise.all([
    ek ? schedules('고속', EXPRESS, 'GetExpBusTrminlList', 'GetStrtpntAlocFndExpbusInfo', encodeURIComponent(ek), TO_EXPRESS, day, now).catch((e) => ({ trips: [], error: String(e.message ?? e).slice(0, 160) })) : { trips: [], error: 'no_express_key' },
    sk ? schedules('시외', SUBURB, 'GetSuberbsBusTrminlList', 'GetStrtpntAlocFndSuberbsBusInfo', encodeURIComponent(sk), TO_SUBURB, day, now).catch((e) => ({ trips: [], error: String(e.message ?? e).slice(0, 160) })) : { trips: [], error: 'no_suburb_key' },
  ])
  const next = [...ex.trips, ...su.trips].sort((a, b) => a.time.localeCompare(b.time)).slice(0, 40)
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=300')
  return res.status(200).json({
    ok: next.length > 0 || (!ex.error && !su.error), now, next,
    counts: { express: ex.trips.length, suburb: su.trips.length },
    errors: { express: ex.error, suburb: su.error },
  })
}

// Vercel 서버 함수: 청주 터미널 정보 (국토교통부 TAGO)
//   시외버스 오늘 출발 15098541 (키: TAGO_BUS_API)
//   고속버스 청주 도착 예정 15098516 (키: TAGO_SPPEDBUS_API)
import { expressKey, suburbKey } from './_keys.js'
const BASE = 'https://apis.data.go.kr/1613000'
const SUBURB = `${BASE}/SuburbsBusInfo`
const EXPRESS = `${BASE}/ExpBusArrInfo`
const TO_SUBURB = ['대전복합', '천안', '인천공항', '세종', '김포공항']
const FROM_EXPRESS = ['서울경부', '센트럴시티', '동서울', '부산', '동대구', '광주']   // 이름에 맞는 곳만 조회

const items = (json) => {
  const it = json?.response?.body?.items?.item
  return it ? (Array.isArray(it) ? it : [it]) : []
}
const apiMessage = (json) => json?.response?.header?.resultMsg ?? json?.OpenAPI_ServiceResponse?.cmmMsgHeader?.returnAuthMsg ?? null
async function getJSON(url) {
  const raw = await fetch(url, { signal: AbortSignal.timeout(7000) }).then((r) => r.text())
  try { return JSON.parse(raw) } catch { throw new Error(raw.replace(/\s+/g, ' ').slice(0, 160)) }
}
const kst = () => new Date(Date.now() + 9 * 3600000)
const ymd = (d) => d.toISOString().slice(0, 10).replace(/-/g, '')
const hm = (v) => { const s = String(v); return `${s.slice(8, 10)}:${s.slice(10, 12)}` }
const short = (e) => String(e?.message ?? e).slice(0, 160)

const cache = {}   // 터미널 ID는 잘 안 바뀌므로 함수 인스턴스가 살아 있는 동안 재사용

async function suburbId(key, name, exact) {
  const id = `s|${name}`
  if (cache[id]) return cache[id]
  const json = await getJSON(`${SUBURB}/GetSuberbsBusTrminlList?serviceKey=${key}&terminalNm=${encodeURIComponent(name)}&numOfRows=100&pageNo=1&_type=json`)
  const list = items(json)
  const hit = (exact && list.find((t) => t.terminalNm === name)) || list.find((t) => t.terminalNm?.includes(name))
  if (!hit && exact) throw new Error(`시외 터미널 없음(${apiMessage(json) ?? '응답 없음'})`)
  return (cache[id] = hit?.terminalId ?? null)
}

async function suburbDepartures(key, day, now) {
  const dep = await suburbId(key, '청주', true)
  const next = []
  let error = null
  await Promise.all(TO_SUBURB.map(async (name) => {
    try {
      const arr = await suburbId(key, name)
      if (!arr) return
      const json = await getJSON(`${SUBURB}/GetStrtpntAlocFndSuberbsBusInfo?serviceKey=${key}&depTerminalId=${dep}&arrTerminalId=${arr}&depPlandTime=${day}&numOfRows=100&pageNo=1&_type=json`)
      for (const t of items(json)) {
        const time = hm(t.depPlandTime)
        if (time >= now) next.push({ time, to: name, grade: t.gradeNm ?? '', charge: Number(t.charge) || null })
      }
    } catch (e) { error = short(e) }
  }))
  return { next: next.sort((a, b) => a.time.localeCompare(b.time)).slice(0, 30), error }
}

async function expressCode(key, name, exact) {
  const id = `e|${name}`
  if (cache[id]) return cache[id]
  const json = await getJSON(`${EXPRESS}/GetExpBusTmnList?serviceKey=${key}&tmnNm=${encodeURIComponent(name)}&numOfRows=100&pageNo=1&_type=json`)
  const list = items(json)
  const hit = (exact && list.find((t) => t.tmnNm === name)) || list.find((t) => t.tmnNm?.includes(name))
  if (!hit && exact) throw new Error(`고속 터미널 없음(${apiMessage(json) ?? '응답 없음'})`)
  return (cache[id] = hit?.tmnCd ?? null)
}

async function expressArrivals(key, nowStamp) {
  const arr = await expressCode(key, '청주', true)
  const out = []
  let error = null
  await Promise.all(FROM_EXPRESS.map(async (name) => {
    try {
      const dep = await expressCode(key, name)
      if (!dep) return
      const json = await getJSON(`${EXPRESS}/GetExpBusArrPrdtInfo?serviceKey=${key}&depTmnCd=${dep}&arrTmnCd=${arr}&numOfRows=30&pageNo=1&_type=json`)
      for (const t of items(json)) {
        const arrive = String(t.arrPrdtTm ?? '').slice(0, 16)
        // 도착 완료이거나 예정 시각이 지난 버스는 뺀다 (예측값이 늦게 갱신될 때가 있다)
        if (String(t.rmnTm).includes('완료') || String(t.curLocNm).includes('도착') || arrive <= nowStamp) continue
        out.push({ from: t.depTmnNm ?? name, dep: t.depTm ?? '', arrive, loc: t.curLocNm ?? '', grade: t.busGrdNm ?? '' })
      }
    } catch (e) { error = short(e) }
  }))
  return { arrivals: out.sort((a, b) => a.arrive.localeCompare(b.arrive)).slice(0, 20), error }
}

export default async function handler(req, res) {
  const d = kst(), day = ymd(d), now = d.toISOString().slice(11, 16)
  const sk = suburbKey(), ek = expressKey()
  const [su, ex] = await Promise.all([
    sk ? suburbDepartures(encodeURIComponent(sk), day, now).catch((e) => ({ next: [], error: short(e) })) : { next: [], error: 'no_key' },
    ek ? expressArrivals(encodeURIComponent(ek), `${d.toISOString().slice(0, 10)} ${now}`).catch((e) => ({ arrivals: [], error: short(e) })) : { arrivals: [], error: 'no_key' },
  ])
  res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=120')
  return res.status(200).json({ ok: true, now, next: su.next, arrivals: ex.arrivals, errors: { suburb: su.error, express: ex.error } })
}

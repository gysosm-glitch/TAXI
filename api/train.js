// Vercel 서버 함수: 오송역에 곧 도착하는 열차 (국토교통부 TAGO 열차정보 15098552)
// 환경변수 TAGO_TRAIN_API_KEY (없으면 TAGO_API_KEY)
import { trainKey, tagoKey } from './_keys.js'
const BASE = 'https://apis.data.go.kr/1613000/TrainInfo'   // 2026 기준 주소 (구 TrainInfoService 폐기)

const items = (json) => {
  const it = json?.response?.body?.items?.item
  return it ? (Array.isArray(it) ? it : [it]) : []
}
async function getJSON(url) {
  const raw = await fetch(url).then((r) => r.text())
  try { return { json: JSON.parse(raw) } } catch { return { error: raw.replace(/\s+/g, ' ').slice(0, 200) } }
}

// 오송역으로 오는 주요 출발역 (경부·호남선 양방향)
const ORIGINS = ['서울', '용산', '부산', '동대구', '광주송정', '목포', '익산']
const TARGET = '오송'

// 한국 시간 기준 YYYYMMDD, HHMM
const kst = () => new Date(Date.now() + 9 * 3600000)
const ymd = (d) => d.toISOString().slice(0, 10).replace(/-/g, '')
const toHHMM = (s) => `${String(s).slice(8, 10)}:${String(s).slice(10, 12)}`

let cache = null   // 역 코드는 잘 안 바뀌므로 함수 인스턴스가 살아 있는 동안 재사용

async function stationIds(k) {
  if (cache) return cache
  const c = await getJSON(`${BASE}/GetCtyCodeList?serviceKey=${k}&_type=json`)
  const err = c.json?.OpenAPI_ServiceResponse?.cmmMsgHeader?.errMsg
  if (c.error || err) throw new Error(err || c.error)
  const cities = items(c.json)
  const ids = {}
  for (const c of cities) {
    const st = items((await getJSON(`${BASE}/GetCtyAcctoTrainSttnList?serviceKey=${k}&cityCode=${c.citycode}&numOfRows=300&pageNo=1&_type=json`)).json)
    for (const s of st) if ([TARGET, ...ORIGINS].includes(s.nodename) && !ids[s.nodename]) ids[s.nodename] = s.nodeid
    if (Object.keys(ids).length === ORIGINS.length + 1) break
  }
  cache = ids
  return ids
}

export default async function handler(req, res) {
  const key = trainKey()
  if (!key) return res.status(200).json({ ok: false, reason: 'no_key' })
  const k = encodeURIComponent(key)
  try {
    if (req.query.debug === 'keys') {
      // 키 값은 내보내지 않고, 같은지 여부와 각 키의 응답 결과만 확인한다
      const probe = async (kk) => {
        const c = await getJSON(`${BASE}/GetCtyCodeList?serviceKey=${encodeURIComponent(kk)}&_type=json`)
        return c.error ? c.error.slice(0, 80) : (c.json?.OpenAPI_ServiceResponse?.cmmMsgHeader?.errMsg ?? `OK 도시 ${items(c.json).length}개`)
      }
      return res.status(200).json({
        trainKeySet: !!process.env.TAGO_TRAIN_API_KEY,
        sameAsTagoKey: process.env.TAGO_TRAIN_API_KEY === process.env.TAGO_API_KEY,
        trainKeyLength: (process.env.TAGO_TRAIN_API_KEY || '').length,
        trainKeyTrimmedLength: (trainKey() || '').length,
        tagoKeyLength: (process.env.TAGO_API_KEY || '').length,
        withTrainKey: await probe(trainKey()),
        withTagoKey: await probe(tagoKey()),
      })
    }
    if (req.query.debug === 'cities') {
      const c = await getJSON(`${BASE}/GetCtyCodeList?serviceKey=${k}&_type=json`)
      return res.status(200).json(c.error ? { ok: false, error: c.error } : { ok: true, raw: c.json })
    }
    const ids = await stationIds(k)
    if (!ids[TARGET]) return res.status(200).json({ ok: false, reason: 'no_station', ids })
    const now = kst()
    const nowHHMM = now.toISOString().slice(11, 16)
    const trains = []
    let status = null
    await Promise.all(ORIGINS.filter((o) => ids[o]).map(async (o) => {
      const r = await getJSON(`${BASE}/GetStrtpntAlocFndTrainInfo?serviceKey=${k}&depPlaceId=${ids[o]}&arrPlaceId=${ids[TARGET]}&depPlandTime=${ymd(now)}&numOfRows=200&pageNo=1&_type=json`)
      if (r.error) { status = r.error; return }
      for (const t of items(r.json)) trains.push({ time: toHHMM(t.arrplandtime), from: o, grade: t.traingradename, no: String(t.trainno) })
    }))
    if (!trains.length && status) return res.status(200).json({ ok: false, reason: status.includes('SERVICE_KEY') ? 'key_pending' : 'api_error', message: status })
    // 같은 열차가 여러 출발역에서 잡히면 하나만
    const seen = new Set()
    const upcoming = trains.filter((t) => t.time >= nowHHMM)
      .sort((a, b) => a.time.localeCompare(b.time))
      .filter((t) => (seen.has(t.no) ? false : seen.add(t.no)))
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=300')
    return res.status(200).json({ ok: true, station: '오송', now: nowHHMM, next: upcoming.slice(0, 12), total: upcoming.length })
  } catch (e) {
    const m = String(e)
    return res.status(200).json({ ok: false, reason: m.includes('SERVICE_KEY') ? 'key_pending' : 'api_error', message: m })
  }
}

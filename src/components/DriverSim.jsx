// 기사 화면의 가상 상황: 실제 배차 없이, 시범 운영에서 겪을 만한 판단을 눌러 본다.
// 금액은 앱의 요금 계산값과 정책안 보전액만 쓰고, 실측값처럼 말하지 않는다.
import { useState } from 'react'
import { spots, spotZoneId, quoteBetween, placeAt, cityDest, zoneById, won } from '../data.js'

const spotById = (id) => spots.find((s) => s.id === id)

function money(spotId, fuelPerKm, feePerTrip) {
  const zone = spotZoneId(spotById(spotId))
  const dest = cityDest(zone)
  const s = spotById(spotId), z = zoneById[dest]
  const q = quoteBetween(placeAt(s.lat, s.lon, s.name), placeAt(z.centroid_lat, z.centroid_lon, z.name), 1)
  return {
    place: spotById(spotId).name, dest: zoneById[dest].name, fare: q.fare, base: q.fareDongRate,
    fuel: Math.round(q.km * fuelPerKm), hold: q.fare - q.fareDongRate, policy: q.fareDongRate + feePerTrip, fee: feePerTrip,
  }
}

const emptyBack = (m) => ({ tone: 'bad', head: `−${won(m.fuel)}`, rows: [['수입', '0원'], ['연료비 (가정)', `−${won(m.fuel)}`]], note: '시내까지 손님 없이 돌아가요. 지금 할증이 붙는 이유가 바로 이 빈 차 운행이에요.' })

const SCENARIOS = [
  {
    id: 'matched', chip: '귀로 손님 있음', spot: 'osong_stn',
    story: (m) => `충북대에서 태운 손님을 ${m.place}에 내려줬어요. 앱에 ${m.dest}으로 갈 왕복 매칭 손님이 떠 있어요.`,
    choices: [
      { label: '귀로 손님 태우기', result: (m) => ({ tone: 'good', head: `+${won(m.policy)}`, rows: [['할증 뺀 손님 요금', won(m.base)], ['매칭 수수료 보전 (정책안)', `+${won(m.fee)}`]], note: '빈 차로 돌아갈 길에 수입이 생겨요. 보전액은 정책안이 시행된다는 가정이에요.' }) },
      { label: '빈 차로 돌아가기', result: emptyBack },
    ],
  },
  {
    id: 'train', chip: 'KTX 기다릴까', spot: 'osong_stn',
    story: (m) => `${m.place}에 손님을 내려줬는데 열린 모집이 없어요. 곧 KTX가 도착해요.`,
    choices: [
      { label: '승차장에서 기다리기', result: (m) => ({ tone: 'mid', head: `손님을 태우면 +${won(m.fare)}`, rows: [['지금 미터기 요금', won(m.fare)], ['기다리는 동안', '다른 호출을 못 받음']], note: '오송역 승객은 시내행 비중이 높지만 손님이 꼭 있다는 보장은 없어요. 다음 열차 시각은 아래 카드에서 봐요.' }) },
      { label: '바로 빈 차로 돌아가기', result: emptyBack },
    ],
  },
  {
    id: 'noshow', chip: '손님이 안 옴', spot: 'osong_stn',
    story: (m) => `${m.place}에 도착했는데 왕복 매칭 손님이 약속 시각이 지나도 오지 않아요.`,
    choices: [
      { label: '노쇼 처리하고 출발', result: (m) => ({ tone: 'mid', head: `${m.hold >= m.fuel ? '+' : '−'}${won(Math.abs(m.hold - m.fuel))}`, rows: [['노쇼 수수료 (할증분, 시범)', `+${won(m.hold)}`], ['연료비 (가정)', `−${won(m.fuel)}`]], note: '안 온 손님이 할증분을 부담해 빈 차 손실을 메워요. 시범에서는 금액만 표시하고 실제 결제는 없어요.' }) },
      { label: '조금 더 기다리기', result: (m) => ({ tone: 'mid', head: '수입 변화 없음', rows: [['손님이 오면', `+${won(m.base)}`], ['그래도 안 오면', '노쇼 처리']], note: '얼마나 기다려야 공정한지는 정해지지 않았어요. 시범 운영에서 함께 정할 기준이에요.' }) },
    ],
  },
  {
    id: 'quiet', chip: '손님이 없는 곳', spot: 'ochang_tech',
    story: (m) => `${m.place} 근처에 손님을 내려줬어요. 시내행 모집도, 곧 도착할 열차도 없어요.`,
    choices: [
      { label: '빈 차로 돌아가기', result: (m) => ({ ...emptyBack(m), note: '앱이 손님을 만들어 주지는 못해요. 수요가 몰리는 오송역부터 시범 운영하려는 이유예요.' }) },
      { label: '근처에서 기다리기', result: () => ({ tone: 'bad', head: '수입 불확실', rows: [['손님 보장', '없음'], ['기다리는 동안', '다른 호출을 못 받음']], note: '기다림이 길어지면 돌아가는 것보다 손해일 수 있어요. 앱의 평소 승차 수치를 참고해 판단해요.' }) },
    ],
  },
]

export default function DriverSim({ fuelPerKm, feePerTrip }) {
  const [id, setId] = useState(SCENARIOS[0].id)
  const [pick, setPick] = useState(null)
  const s = SCENARIOS.find((x) => x.id === id)
  const m = money(s.spot, fuelPerKm, feePerTrip)
  const r = pick != null ? s.choices[pick].result(m) : null

  return (
    <div className="sim">
      <div className="chips wrap">
        {SCENARIOS.map((x) => <button key={x.id} className={`chip ${x.id === id ? 'on' : ''}`} onClick={() => { setId(x.id); setPick(null) }}>{x.chip}</button>)}
      </div>
      <p className="sim-story">{s.story(m)}</p>
      <div className="sim-choices">
        {s.choices.map((c, i) => <button key={c.label} className={pick === i ? 'on' : ''} onClick={() => setPick(i)}>{c.label}</button>)}
      </div>
      {r && (
        <div className={`sim-result ${r.tone}`}>
          <b>{r.head}</b>
          {r.rows.map(([k, v]) => <div key={k} className="seat"><span>{k}</span><span>{v}</span></div>)}
          <p>{r.note}</p>
        </div>
      )}
      <p className="sub" style={{ marginTop: 10 }}>실제 손님·배차가 아니에요. 요금은 {m.place}→{m.dest} 앱 계산값, 연료비는 km당 {fuelPerKm}원 가정이에요.</p>
    </div>
  )
}

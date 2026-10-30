import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { meterFare, quote, splitFare, surchargeCategory } from './fare.js'

const rules = JSON.parse(readFileSync(new URL('../../data/web/02_fare_rules/fare_rules.json', import.meta.url))).regions.cheongju
const dong = { zone_id: 130, is_eupmyeon: false }
const osong = { zone_id: 131, is_eupmyeon: true }
const ochang = { zone_id: 143, is_eupmyeon: true }

test('기본거리 이내는 기본요금', () => {
  assert.equal(meterFare(1000, rules.dong_rate), 4000)
  assert.equal(meterFare(1000, rules.eupmyeon_rate), 4000)
})

test('8.5km: 동 약 9,300원 / 읍·면 약 11,800원 (팀공유자료 p.3)', () => {
  assert.ok(Math.abs(meterFare(8500, rules.dong_rate) - 9300) <= 200)
  assert.ok(Math.abs(meterFare(8500, rules.eupmyeon_rate) - 11800) <= 200)
})

test('9/28 개편: 같은 읍·면 내부는 할증 없음, 동↔읍은 할증', () => {
  assert.equal(surchargeCategory(ochang, ochang), 'same_eupmyeon_internal')
  assert.equal(quote({ origin: ochang, dest: ochang, distanceM: 3000, rules }).surcharged, false)
  assert.equal(quote({ origin: dong, dest: osong, distanceM: 15000, rules }).surcharged, true)
  assert.equal(surchargeCategory(osong, ochang), 'eupmyeon_to_other_eupmyeon')
})

test('할증률 0%면 동 요율과 같다', () => {
  const q = quote({ origin: dong, dest: osong, distanceM: 15000, rules, ratePct: 0 })
  assert.equal(q.fare, q.fareDongRate)
})

test('2인 합승 시 할증 요금 1인 부담이 무할증 단독요금보다 낮다', () => {
  const q = quote({ origin: dong, dest: osong, distanceM: 8500, rules })
  const [share] = splitFare(q.fare, [1, 1])
  assert.ok(share < q.fareDongRate)
})

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { simulateDay, simulateHour } from './simulate.js'

const pairs = JSON.parse(readFileSync(new URL('../../data/web/03_demand/taxi_od_pairs.min.json', import.meta.url)))

test('같은 시드면 같은 결과 (발표 중 숫자 고정)', () => {
  const a = simulateHour(pairs, { hour: 23, participation: 0.05, seed: 7 })
  const b = simulateHour(pairs, { hour: 23, participation: 0.05, seed: 7 })
  assert.deepEqual(a, b)
})

test('참여율이 오르면 매칭률도 오른다', () => {
  const low = simulateDay(pairs, { participation: 0.01 })
  const high = simulateDay(pairs, { participation: 0.2 })
  assert.ok(high.matchRate > low.matchRate)
})

test('합승하면 평균 부담이 단독 요금보다 작거나 같다', () => {
  const r = simulateHour(pairs, { hour: 18, participation: 0.1 })
  assert.ok(r.avgPaid <= r.avgSoloFare)
  assert.ok(r.matchRate >= 0 && r.matchRate <= 1)
})

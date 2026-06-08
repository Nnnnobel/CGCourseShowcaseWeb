import assert from 'node:assert/strict'
import test from 'node:test'
import {
  BEZIER_POINTS,
  CLIP_POLYGON,
  CLIP_RECT,
  TRANSFORM_POLYGON,
  bezierCurve,
  bresenhamCircle,
  bresenhamLine,
  cohenSutherland,
  ddaLine,
  midpointCircle,
  midpointEllipse,
  scanlineFill,
  seedFill,
  sutherlandHodgman,
  sutherlandHodgmanStages,
  transformPoints,
} from '../src/lib/algorithms.js'
import { algorithmCode } from '../src/data/algorithmCode.js'

const key = (point) => `${point.x},${point.y}`

test('line algorithms include both endpoints', () => {
  for (const line of [ddaLine(2, 3, 17, 11), bresenhamLine(2, 3, 17, 11)]) {
    assert.equal(key(line[0]), '2,3')
    assert.equal(key(line.at(-1)), '17,11')
  }
})

test('circle and ellipse generators preserve expected symmetry', () => {
  for (const points of [midpointCircle(20, 20, 8), bresenhamCircle(20, 20, 8)]) {
    const set = new Set(points.map(key))
    assert.ok(set.has('28,20'))
    assert.ok(set.has('12,20'))
    assert.ok(set.has('20,28'))
    assert.ok(set.has('20,12'))
  }
  const ellipse = new Set(midpointEllipse(30, 25, 12, 6).map(key))
  assert.ok(ellipse.has('42,25'))
  assert.ok(ellipse.has('18,25'))
  assert.ok(ellipse.has('30,31'))
  assert.ok(ellipse.has('30,19'))
})

test('fill algorithms produce a bounded non-empty interior', () => {
  for (const points of [scanlineFill(), seedFill()]) {
    assert.ok(points.length > 500)
    assert.ok(points.every((point) => point.x >= 0 && point.x < 92 && point.y >= 0 && point.y < 64))
  }
})

test('line clipping keeps the result inside the clipping rectangle', () => {
  const result = cohenSutherland({ x: 40, y: 70 }, { x: 760, y: 470 })
  assert.ok(result)
  assert.ok(result.every((point) => (
    point.x >= CLIP_RECT.minX && point.x <= CLIP_RECT.maxX
    && point.y >= CLIP_RECT.minY && point.y <= CLIP_RECT.maxY
  )))
})

test('polygon clipping exposes four intermediate edge stages', () => {
  const stages = sutherlandHodgmanStages(CLIP_POLYGON)
  assert.equal(stages.length, 5)
  assert.deepEqual(stages.at(-1), sutherlandHodgman(CLIP_POLYGON))
  assert.ok(stages.at(-1).every((point) => (
    point.x >= CLIP_RECT.minX && point.x <= CLIP_RECT.maxX
    && point.y >= CLIP_RECT.minY && point.y <= CLIP_RECT.maxY
  )))
})

test('transform and Bezier endpoints remain mathematically correct', () => {
  const translated = transformPoints(TRANSFORM_POLYGON, { type: 'translate', dx: 25, dy: -10 })
  assert.equal(translated[0].x, TRANSFORM_POLYGON[0].x + 25)
  assert.equal(translated[0].y, TRANSFORM_POLYGON[0].y - 10)

  const curve = bezierCurve(BEZIER_POINTS.slice(0, 4), 100)
  assert.deepEqual(curve[0], BEZIER_POINTS[0])
  assert.deepEqual(curve.at(-1), BEZIER_POINTS[3])
})

test('every selectable algorithm has a C++ execution trace', () => {
  const expectedCounts = { primitives: 6, fill: 4, clipping: 3, transform: 4, bezier: 3 }
  for (const [experiment, count] of Object.entries(expectedCounts)) {
    const snippets = Object.values(algorithmCode[experiment])
    assert.equal(snippets.length, count)
    assert.ok(snippets.every((snippet) => snippet.lines.length > 3 && snippet.trace.length > 3))
    assert.ok(snippets.every((snippet) => snippet.trace.every((line) => line >= 0 && line < snippet.lines.length)))
  }
})

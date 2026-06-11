import assert from 'node:assert/strict'
import test from 'node:test'
import {
  BEZIER_POINTS,
  CLIP_POLYGON,
  CLIP_RECT,
  FILL_POLYGON,
  TRANSFORM_POLYGON,
  bezierCurve,
  bresenhamCircle,
  bresenhamLine,
  cohenSutherland,
  ddaLine,
  edgeFill,
  midpointCircle,
  midpointEllipse,
  pointJudgeFill,
  scanlineFill,
  seedFill,
  sutherlandHodgman,
  sutherlandHodgmanStages,
  transformPoints,
} from '../src/lib/algorithms.js'
import { algorithmCode } from '../src/data/algorithmCode.js'
import { applyImageMode } from '../src/lib/imageRaster.js'

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

test('all fill algorithms accept an edited polygon', () => {
  const edited = [
    { x: 14, y: 14 }, { x: 70, y: 12 }, { x: 78, y: 45 },
    { x: 48, y: 53 }, { x: 20, y: 43 },
  ]
  for (const points of [scanlineFill(edited), edgeFill(edited), seedFill(edited), pointJudgeFill(edited)]) {
    assert.ok(points.length > 300)
    assert.ok(points.every((point) => point.x >= 0 && point.x < 92 && point.y >= 0 && point.y < 64))
  }
})

test('edge fill uses parity toggling with only half-open boundary differences', () => {
  const scanline = new Set(scanlineFill().map(key))
  const edge = new Set(edgeFill().map(key))
  const missing = [...scanline].filter((point) => !edge.has(point))
  const vertices = new Set(FILL_POLYGON.map(key))
  assert.equal(edge.size, 2327)
  assert.ok(missing.length > 0)
  assert.ok(missing.every((point) => vertices.has(point)))
  assert.equal([...edge].filter((point) => !scanline.has(point)).length, 0)
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

test('polygon clipping accepts edited input vertices', () => {
  const edited = [
    { x: 80, y: 90 }, { x: 410, y: 45 }, { x: 760, y: 210 },
    { x: 570, y: 500 }, { x: 160, y: 440 },
  ]
  const stages = sutherlandHodgmanStages(edited)
  assert.equal(stages.length, 5)
  assert.ok(stages.at(-1).length >= 3)
  assert.ok(stages.at(-1).every((point) => (
    point.x >= CLIP_RECT.minX && point.x <= CLIP_RECT.maxX
    && point.y >= CLIP_RECT.minY && point.y <= CLIP_RECT.maxY
  )))
})

test('transform and Bezier endpoints remain mathematically correct', () => {
  const translated = transformPoints(TRANSFORM_POLYGON, { type: 'translate', dx: 25, dy: -10 })
  assert.equal(translated[0].x, TRANSFORM_POLYGON[0].x + 25)
  assert.equal(translated[0].y, TRANSFORM_POLYGON[0].y - 10)

  const curve = bezierCurve(BEZIER_POINTS, 100)
  assert.deepEqual(curve[0], BEZIER_POINTS[0])
  assert.deepEqual(curve.at(-1), BEZIER_POINTS[10])
  assert.equal(BEZIER_POINTS.length, 11)
  assert.ok(curve.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y)))
})

test('every selectable algorithm has a C++ execution trace', () => {
  const expectedCounts = { primitives: 7, fill: 4, clipping: 3, transform: 4, bezier: 9 }
  for (const [experiment, count] of Object.entries(expectedCounts)) {
    const snippets = Object.values(algorithmCode[experiment])
    assert.equal(snippets.length, count)
    assert.ok(snippets.every((snippet) => snippet.lines.length > 3 && snippet.trace.length > 3))
    assert.ok(snippets.every((snippet) => snippet.trace.every((line) => line >= 0 && line < snippet.lines.length)))
  }
})

test('image rasterization preserves, grayscales, and quantizes sampled colors', () => {
  assert.deepEqual(applyImageMode(18, 140, 233, 'color'), [18, 140, 233])
  assert.deepEqual(applyImageMode(100, 150, 200, 'grayscale'), [141, 141, 141])
  assert.deepEqual(applyImageMode(18, 140, 233, 'quantized'), [0, 128, 255])
})

test('image C++ demo includes the same bounds, aspect cap, and color formulas', () => {
  const source = algorithmCode.primitives['图像光栅化'].lines.join('\n')
  assert.match(source, /clamp\(requestedColumns, 16, 96\)/)
  assert.match(source, /rows > 72/)
  assert.match(source, /\.299.*\.587.*\.114/)
  assert.match(source, /lround\(v\/64\.0\)/)
  assert.match(source, /index % columns/)
  assert.match(source, /index \/ columns/)
})

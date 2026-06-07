export const GRID = { width: 92, height: 64 }

const unique = (points) => [...new Map(points.map((p) => [`${p.x},${p.y}`, p])).values()]

export function ddaLine(x0, y0, x1, y1) {
  const dx = x1 - x0
  const dy = y1 - y0
  const steps = Math.max(Math.abs(dx), Math.abs(dy))
  if (!steps) return [{ x: x0, y: y0 }]
  const points = []
  const xStep = dx / steps
  const yStep = dy / steps
  let x = x0
  let y = y0
  for (let i = 0; i <= steps; i += 1) {
    const point = { x: Math.round(x), y: Math.round(y) }
    if (!points.length || points.at(-1).x !== point.x || points.at(-1).y !== point.y) points.push(point)
    x += xStep
    y += yStep
  }
  return points
}

export function bresenhamLine(x0, y0, x1, y1) {
  const points = []
  const dx = Math.abs(x1 - x0)
  const dy = Math.abs(y1 - y0)
  const sx = x0 < x1 ? 1 : -1
  const sy = y0 < y1 ? 1 : -1
  let error = dx - dy
  while (true) {
    points.push({ x: x0, y: y0 })
    if (x0 === x1 && y0 === y1) break
    const e2 = error * 2
    if (e2 > -dy) {
      error -= dy
      x0 += sx
    }
    if (e2 < dx) {
      error += dx
      y0 += sy
    }
  }
  return points
}

export function midpointLine(x0, y0, x1, y1) {
  let steep = Math.abs(y1 - y0) > Math.abs(x1 - x0)
  if (steep) {
    ;[x0, y0] = [y0, x0]
    ;[x1, y1] = [y1, x1]
  }
  let reversed = false
  if (x0 > x1) {
    ;[x0, x1] = [x1, x0]
    ;[y0, y1] = [y1, y0]
    reversed = true
  }
  const dx = x1 - x0
  let dy = y1 - y0
  const yStep = dy >= 0 ? 1 : -1
  dy = Math.abs(dy)
  let decision = 2 * dy - dx
  let y = y0
  const points = []
  for (let x = x0; x <= x1; x += 1) {
    points.push(steep ? { x: y, y: x } : { x, y })
    if (decision >= 0) {
      y += yStep
      decision -= 2 * dx
    }
    decision += 2 * dy
  }
  return reversed ? points.reverse() : points
}

const circleSymmetry = (cx, cy, x, y) => [
  { x: cx + x, y: cy + y }, { x: cx - x, y: cy + y },
  { x: cx + x, y: cy - y }, { x: cx - x, y: cy - y },
  { x: cx + y, y: cy + x }, { x: cx - y, y: cy + x },
  { x: cx + y, y: cy - x }, { x: cx - y, y: cy - x },
]

export function midpointCircle(cx, cy, radius) {
  const points = []
  let x = 0
  let y = Math.abs(radius)
  let decision = 1 - y
  while (x <= y) {
    points.push(...circleSymmetry(cx, cy, x, y))
    x += 1
    if (decision < 0) decision += 2 * x + 1
    else {
      y -= 1
      decision += 2 * (x - y) + 1
    }
  }
  return unique(points)
}

export function bresenhamCircle(cx, cy, radius) {
  const points = []
  let x = 0
  let y = Math.abs(radius)
  let decision = 3 - 2 * y
  while (x <= y) {
    points.push(...circleSymmetry(cx, cy, x, y))
    if (decision < 0) decision += 4 * x + 6
    else {
      decision += 4 * (x - y) + 10
      y -= 1
    }
    x += 1
  }
  return unique(points)
}

export function midpointEllipse(cx, cy, rx, ry) {
  const points = []
  const add = (x, y) => points.push(
    { x: cx + x, y: cy + y }, { x: cx - x, y: cy + y },
    { x: cx + x, y: cy - y }, { x: cx - x, y: cy - y },
  )
  rx = Math.abs(rx)
  ry = Math.abs(ry)
  let x = 0
  let y = ry
  const rx2 = rx * rx
  const ry2 = ry * ry
  let px = 0
  let py = 2 * rx2 * y
  let p1 = ry2 - rx2 * ry + 0.25 * rx2
  while (px < py) {
    add(x, y)
    x += 1
    px += 2 * ry2
    if (p1 < 0) p1 += ry2 + px
    else {
      y -= 1
      py -= 2 * rx2
      p1 += ry2 + px - py
    }
  }
  let p2 = ry2 * (x + 0.5) ** 2 + rx2 * (y - 1) ** 2 - rx2 * ry2
  while (y >= 0) {
    add(x, y)
    y -= 1
    py -= 2 * rx2
    if (p2 > 0) p2 += rx2 - py
    else {
      x += 1
      px += 2 * ry2
      p2 += rx2 - py + px
    }
  }
  return unique(points)
}

export const FILL_POLYGON = [
  { x: 18, y: 12 }, { x: 63, y: 10 }, { x: 80, y: 28 },
  { x: 67, y: 51 }, { x: 28, y: 55 }, { x: 12, y: 32 },
]

function pointInPolygon(point, polygon = FILL_POLYGON) {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const a = polygon[i]
    const b = polygon[j]
    const intersects = (a.y > point.y) !== (b.y > point.y)
      && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x
    if (intersects) inside = !inside
  }
  return inside
}

export function scanlineFill(polygon = FILL_POLYGON) {
  const points = []
  const minY = Math.min(...polygon.map((p) => p.y))
  const maxY = Math.max(...polygon.map((p) => p.y))
  for (let y = minY; y <= maxY; y += 1) {
    const intersections = []
    polygon.forEach((a, index) => {
      const b = polygon[(index + 1) % polygon.length]
      if (a.y === b.y) return
      if (y >= Math.min(a.y, b.y) && y < Math.max(a.y, b.y)) {
        intersections.push(a.x + ((y - a.y) * (b.x - a.x)) / (b.y - a.y))
      }
    })
    intersections.sort((a, b) => a - b)
    for (let i = 0; i + 1 < intersections.length; i += 2) {
      for (let x = Math.ceil(intersections[i]); x <= Math.floor(intersections[i + 1]); x += 1) points.push({ x, y })
    }
  }
  return points
}

export function pointJudgeFill() {
  const points = []
  for (let y = 0; y < GRID.height; y += 1) {
    for (let x = 0; x < GRID.width; x += 1) if (pointInPolygon({ x, y })) points.push({ x, y })
  }
  return points
}

export function seedFill() {
  const boundary = new Set()
  FILL_POLYGON.forEach((a, index) => {
    bresenhamLine(a.x, a.y, FILL_POLYGON[(index + 1) % FILL_POLYGON.length].x, FILL_POLYGON[(index + 1) % FILL_POLYGON.length].y)
      .forEach((p) => boundary.add(`${p.x},${p.y}`))
  })
  const queue = [{ x: 45, y: 31 }]
  const visited = new Set()
  const points = []
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const p = queue[cursor]
    const key = `${p.x},${p.y}`
    if (p.x < 0 || p.x >= GRID.width || p.y < 0 || p.y >= GRID.height || visited.has(key) || boundary.has(key)) continue
    visited.add(key)
    points.push(p)
    queue.push({ x: p.x + 1, y: p.y }, { x: p.x - 1, y: p.y }, { x: p.x, y: p.y + 1 }, { x: p.x, y: p.y - 1 })
  }
  return points
}

export const CLIP_RECT = { minX: 180, minY: 120, maxX: 620, maxY: 400 }
export const CLIP_LINE = [{ x: 95, y: 160 }, { x: 720, y: 460 }]
export const CLIP_POLYGON = [
  { x: 95, y: 160 }, { x: 330, y: 70 }, { x: 720, y: 160 },
  { x: 690, y: 460 }, { x: 300, y: 430 }, { x: 120, y: 320 },
]

const regionCode = (p, rect = CLIP_RECT) => {
  let code = 0
  if (p.x < rect.minX) code |= 1
  else if (p.x > rect.maxX) code |= 2
  if (p.y < rect.minY) code |= 4
  else if (p.y > rect.maxY) code |= 8
  return code
}

export function cohenSutherland(a, b, rect = CLIP_RECT) {
  a = { ...a }
  b = { ...b }
  let ca = regionCode(a, rect)
  let cb = regionCode(b, rect)
  for (let guard = 0; guard < 12; guard += 1) {
    if (!(ca | cb)) return [a, b]
    if (ca & cb) return null
    const code = ca || cb
    let x
    let y
    if (code & 8) {
      x = a.x + ((b.x - a.x) * (rect.maxY - a.y)) / (b.y - a.y); y = rect.maxY
    } else if (code & 4) {
      x = a.x + ((b.x - a.x) * (rect.minY - a.y)) / (b.y - a.y); y = rect.minY
    } else if (code & 2) {
      y = a.y + ((b.y - a.y) * (rect.maxX - a.x)) / (b.x - a.x); x = rect.maxX
    } else {
      y = a.y + ((b.y - a.y) * (rect.minX - a.x)) / (b.x - a.x); x = rect.minX
    }
    if (code === ca) {
      a = { x, y }; ca = regionCode(a, rect)
    } else {
      b = { x, y }; cb = regionCode(b, rect)
    }
  }
  return null
}

export function liangBarsky(a, b, rect = CLIP_RECT) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const p = [-dx, dx, -dy, dy]
  const q = [a.x - rect.minX, rect.maxX - a.x, a.y - rect.minY, rect.maxY - a.y]
  let u1 = 0
  let u2 = 1
  for (let i = 0; i < 4; i += 1) {
    if (!p[i] && q[i] < 0) return null
    if (!p[i]) continue
    const r = q[i] / p[i]
    if (p[i] < 0) u1 = Math.max(u1, r)
    else u2 = Math.min(u2, r)
  }
  if (u1 > u2) return null
  return [
    { x: a.x + u1 * dx, y: a.y + u1 * dy },
    { x: a.x + u2 * dx, y: a.y + u2 * dy },
  ]
}

export function sutherlandHodgmanStages(input, rect = CLIP_RECT) {
  const inside = (p, edge) => [
    p.x >= rect.minX, p.x <= rect.maxX, p.y >= rect.minY, p.y <= rect.maxY,
  ][edge]
  const intersection = (a, b, edge) => {
    if (edge < 2) {
      const x = edge === 0 ? rect.minX : rect.maxX
      return { x, y: a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x) }
    }
    const y = edge === 2 ? rect.minY : rect.maxY
    return { x: a.x + ((b.x - a.x) * (y - a.y)) / (b.y - a.y), y }
  }
  let points = input
  const stages = [input]
  for (let edge = 0; edge < 4; edge += 1) {
    const output = []
    let previous = points.at(-1)
    points.forEach((current) => {
      if (inside(current, edge)) {
        if (!inside(previous, edge)) output.push(intersection(previous, current, edge))
        output.push(current)
      } else if (inside(previous, edge)) output.push(intersection(previous, current, edge))
      previous = current
    })
    points = output
    stages.push(points)
  }
  return stages
}

export const sutherlandHodgman = (input, rect = CLIP_RECT) => sutherlandHodgmanStages(input, rect).at(-1)

export const TRANSFORM_POLYGON = [
  { x: 330, y: 170 }, { x: 510, y: 170 }, { x: 560, y: 260 },
  { x: 460, y: 360 }, { x: 300, y: 310 }, { x: 270, y: 220 },
]

const centerOf = (points) => points.reduce((sum, p) => ({ x: sum.x + p.x / points.length, y: sum.y + p.y / points.length }), { x: 0, y: 0 })

export function transformPoints(points, { dx = 0, dy = 0, sx = 1, sy = 1, angle = 0, type = 'composite' }, progress = 1) {
  const moved = points.map((p) => ({ ...p }))
  if (type === 'translate' || type === 'composite') moved.forEach((p) => { p.x += dx * progress; p.y += dy * progress })
  if (type === 'scale' || type === 'composite') {
    const c = centerOf(moved)
    moved.forEach((p) => {
      p.x = c.x + (p.x - c.x) * (1 + (sx - 1) * progress)
      p.y = c.y + (p.y - c.y) * (1 + (sy - 1) * progress)
    })
  }
  if (type === 'rotate' || type === 'composite') {
    const c = centerOf(moved)
    const r = angle * progress * Math.PI / 180
    moved.forEach((p) => {
      const x = p.x - c.x
      const y = p.y - c.y
      p.x = c.x + x * Math.cos(r) - y * Math.sin(r)
      p.y = c.y + x * Math.sin(r) + y * Math.cos(r)
    })
  }
  return moved
}

export const BEZIER_POINTS = [
  { x: 110, y: 420 }, { x: 260, y: 100 }, { x: 520, y: 130 },
  { x: 720, y: 430 }, { x: 820, y: 210 },
]

export function deCasteljau(points, t) {
  const work = points.map((p) => ({ ...p }))
  for (let level = 1; level < work.length; level += 1) {
    for (let i = 0; i < work.length - level; i += 1) {
      work[i].x = (1 - t) * work[i].x + t * work[i + 1].x
      work[i].y = (1 - t) * work[i].y + t * work[i + 1].y
    }
  }
  return work[0]
}

export const bezierCurve = (points, samples = 320) => Array.from({ length: samples + 1 }, (_, i) => deCasteljau(points, i / samples))

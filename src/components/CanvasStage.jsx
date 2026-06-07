import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BEZIER_POINTS,
  CLIP_LINE,
  CLIP_POLYGON,
  CLIP_RECT,
  FILL_POLYGON,
  GRID,
  TRANSFORM_POLYGON,
  bezierCurve,
  bresenhamCircle,
  bresenhamLine,
  cohenSutherland,
  ddaLine,
  liangBarsky,
  midpointCircle,
  midpointEllipse,
  midpointLine,
  pointJudgeFill,
  scanlineFill,
  seedFill,
  sutherlandHodgmanStages,
  transformPoints,
} from '../lib/algorithms'

const COLORS = {
  ink: '#e8f0f2',
  muted: '#68747a',
  cyan: '#5eead4',
  blue: '#38bdf8',
  pink: '#fb7185',
  violet: '#a78bfa',
  amber: '#fbbf24',
}

const primitivePoints = (algorithm, s) => {
  if (algorithm === 'DDA 直线') return ddaLine(s.x0, s.y0, s.x1, s.y1)
  if (algorithm === '中点直线') return midpointLine(s.x0, s.y0, s.x1, s.y1)
  if (algorithm === 'Bresenham 直线') return bresenhamLine(s.x0, s.y0, s.x1, s.y1)
  if (algorithm === '中点圆') return midpointCircle(s.cx, s.cy, s.radius)
  if (algorithm === 'Bresenham 圆') return bresenhamCircle(s.cx, s.cy, s.radius)
  return midpointEllipse(s.cx, s.cy, s.rx, s.ry)
}

const fillPoints = (algorithm) => {
  if (algorithm === '种子填充') return seedFill()
  if (algorithm === '逐点判别') return pointJudgeFill()
  if (algorithm === '边缘填充') return scanlineFill().sort((a, b) => (a.x + a.y * 2) - (b.x + b.y * 2))
  return scanlineFill()
}

function resizeCanvas(canvas) {
  const rect = canvas.getBoundingClientRect()
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = Math.round(rect.width * dpr)
  canvas.height = Math.round(rect.height * dpr)
  const ctx = canvas.getContext('2d')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  return { ctx, width: rect.width, height: rect.height }
}

function drawBackdrop(ctx, width, height, accent) {
  ctx.clearRect(0, 0, width, height)
  const glow = ctx.createRadialGradient(width * 0.72, height * 0.36, 0, width * 0.72, height * 0.36, width * 0.68)
  glow.addColorStop(0, `${accent}1d`)
  glow.addColorStop(0.58, 'rgba(10, 18, 22, .12)')
  glow.addColorStop(1, 'rgba(5, 10, 13, .35)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, width, height)
}

function fitTransform(width, height, baseWidth, baseHeight, inset = 52) {
  const scale = Math.min((width - inset * 2) / baseWidth, (height - inset * 2) / baseHeight)
  return {
    scale,
    x: (width - baseWidth * scale) / 2,
    y: (height - baseHeight * scale) / 2,
    point: (p) => ({ x: (width - baseWidth * scale) / 2 + p.x * scale, y: (height - baseHeight * scale) / 2 + p.y * scale }),
  }
}

function path(ctx, points, transform, close = false) {
  if (!points.length) return
  ctx.beginPath()
  const first = transform.point(points[0])
  ctx.moveTo(first.x, first.y)
  points.slice(1).forEach((p) => {
    const q = transform.point(p)
    ctx.lineTo(q.x, q.y)
  })
  if (close) ctx.closePath()
}

function drawRaster(ctx, width, height, points, visibleCount, color, boundary = [], lineStyle = 'solid', lineWidth = 1, pixelZoom = 1) {
  const cell = Math.min((width - 76) / GRID.width, (height - 76) / GRID.height) * pixelZoom
  const ox = (width - GRID.width * cell) / 2
  const oy = (height - GRID.height * cell) / 2
  ctx.strokeStyle = 'rgba(151, 181, 185, .12)'
  ctx.lineWidth = 0.7
  for (let x = 0; x <= GRID.width; x += 1) {
    ctx.beginPath(); ctx.moveTo(ox + x * cell, oy); ctx.lineTo(ox + x * cell, oy + GRID.height * cell); ctx.stroke()
  }
  for (let y = 0; y <= GRID.height; y += 1) {
    ctx.beginPath(); ctx.moveTo(ox, oy + y * cell); ctx.lineTo(ox + GRID.width * cell, oy + y * cell); ctx.stroke()
  }
  const pixelSize = Math.max(1, cell * lineWidth - 1.3)
  const pixelInset = (cell - pixelSize) / 2
  points.slice(0, visibleCount).forEach((p, i) => {
    if (lineStyle === 'dashed' && Math.floor(i / 7) % 2 === 1) return
    if (lineStyle === 'dotted' && i % 3 !== 0) return
    ctx.fillStyle = i === visibleCount - 1 ? '#fff' : color
    ctx.fillRect(ox + p.x * cell + pixelInset, oy + p.y * cell + pixelInset, pixelSize, pixelSize)
  })
  ctx.fillStyle = COLORS.pink
  boundary.forEach((p) => ctx.fillRect(ox + p.x * cell + 0.5, oy + p.y * cell + 0.5, Math.max(1, cell - 1), Math.max(1, cell - 1)))
}

function drawPrimitive(ctx, width, height, algorithm, settings, progress, compare) {
  const points = primitivePoints(algorithm, settings)
  const visible = Math.max(1, Math.ceil(points.length * progress))
  if (compare && algorithm.includes('直线')) {
    const reference = ddaLine(settings.x0, settings.y0, settings.x1, settings.y1)
    drawRaster(ctx, width, height, reference, reference.length, 'rgba(251, 191, 36, .28)')
  }
  drawRaster(ctx, width, height, points, visible, settings.color, [], settings.lineStyle, settings.lineWidth, settings.pixelZoom)
  return { count: points.length, label: `${visible} / ${points.length} 像素`, complexity: 'O(n)' }
}

function drawFill(ctx, width, height, algorithm, settings, progress, compare) {
  const points = fillPoints(algorithm)
  const visible = Math.max(1, Math.ceil(points.length * progress))
  const boundary = []
  FILL_POLYGON.forEach((a, index) => boundary.push(...bresenhamLine(a.x, a.y, FILL_POLYGON[(index + 1) % FILL_POLYGON.length].x, FILL_POLYGON[(index + 1) % FILL_POLYGON.length].y)))
  if (compare) drawRaster(ctx, width, height, pointJudgeFill(), pointJudgeFill().length, 'rgba(251, 191, 36, .15)')
  drawRaster(ctx, width, height, points, visible, settings.color, boundary)
  return { count: points.length, label: `${visible} / ${points.length} 填充点`, complexity: algorithm === '逐点判别' ? 'O(W×H×E)' : 'O(H×E)' }
}

function drawClipping(ctx, width, height, algorithm, settings, progress, selectedClipPoint) {
  const transform = fitTransform(width, height, 820, 560)
  const rectStart = transform.point({ x: CLIP_RECT.minX, y: CLIP_RECT.minY })
  const rectEnd = transform.point({ x: CLIP_RECT.maxX, y: CLIP_RECT.maxY })
  ctx.fillStyle = 'rgba(251, 113, 133, .06)'
  ctx.fillRect(rectStart.x, rectStart.y, rectEnd.x - rectStart.x, rectEnd.y - rectStart.y)
  ctx.strokeStyle = COLORS.pink
  ctx.lineWidth = 2
  ctx.strokeRect(rectStart.x, rectStart.y, rectEnd.x - rectStart.x, rectEnd.y - rectStart.y)

  const line = settings.clipLine || CLIP_LINE
  if (algorithm === 'Sutherland-Hodgman') {
    path(ctx, CLIP_POLYGON, transform, true)
    ctx.strokeStyle = 'rgba(232, 240, 242, .35)'
    ctx.setLineDash([8, 8]); ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([])
    const stages = sutherlandHodgmanStages(CLIP_POLYGON)
    const stageIndex = Math.min(4, Math.floor(progress * 4))
    const result = stages[stageIndex]
    path(ctx, result, transform, true)
    ctx.fillStyle = 'rgba(56, 189, 248, .18)'; ctx.fill()
    ctx.strokeStyle = COLORS.blue; ctx.lineWidth = 4; ctx.stroke()
    return { count: result.length, label: stageIndex === 4 ? `${result.length} 个输出顶点` : `第 ${stageIndex} / 4 条边`, complexity: 'O(4n)' }
  }
  path(ctx, line, transform)
  ctx.strokeStyle = 'rgba(232, 240, 242, .3)'
  ctx.setLineDash([10, 8]); ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([])
  const result = algorithm === 'Liang-Barsky' ? liangBarsky(...line) : cohenSutherland(...line)
  if (result) {
    const partial = [
      result[0],
      { x: result[0].x + (result[1].x - result[0].x) * progress, y: result[0].y + (result[1].y - result[0].y) * progress },
    ]
    path(ctx, partial, transform)
    ctx.strokeStyle = COLORS.blue; ctx.lineWidth = 5; ctx.stroke()
  }
  line.forEach((p, index) => {
    const q = transform.point(p)
    ctx.fillStyle = index ? COLORS.amber : COLORS.cyan
    ctx.beginPath(); ctx.arc(q.x, q.y, 7, 0, Math.PI * 2); ctx.fill()
    if (index === selectedClipPoint) {
      ctx.strokeStyle = COLORS.ink
      ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.arc(q.x, q.y, 12, 0, Math.PI * 2); ctx.stroke()
    }
  })
  return { count: result ? 2 : 0, label: result ? '线段部分可见' : '线段不可见', complexity: algorithm === 'Liang-Barsky' ? '固定 4 次边界测试' : '区域码迭代' }
}

function drawTransform(ctx, width, height, algorithm, settings, progress) {
  const transform = fitTransform(width, height, 820, 560)
  path(ctx, TRANSFORM_POLYGON, transform, true)
  ctx.setLineDash([8, 8]); ctx.strokeStyle = 'rgba(232, 240, 242, .28)'; ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([])
  const result = transformPoints(TRANSFORM_POLYGON, { ...settings, type: ({ 平移: 'translate', 放缩: 'scale', 旋转: 'rotate', 复合变换: 'composite' })[algorithm] }, progress)
  path(ctx, result, transform, true)
  ctx.fillStyle = 'rgba(167, 139, 250, .18)'; ctx.fill()
  ctx.strokeStyle = COLORS.violet; ctx.lineWidth = 4; ctx.stroke()
  result.forEach((p) => {
    const q = transform.point(p)
    ctx.fillStyle = COLORS.violet; ctx.beginPath(); ctx.arc(q.x, q.y, 5, 0, Math.PI * 2); ctx.fill()
  })
  return { count: result.length, label: `${Math.round(progress * 100)}% 变换进度`, complexity: '每顶点一次矩阵乘法' }
}

function casteljauLevels(points, t) {
  const levels = [points]
  while (levels.at(-1).length > 1) {
    const prev = levels.at(-1)
    levels.push(prev.slice(0, -1).map((p, i) => ({
      x: p.x * (1 - t) + prev[i + 1].x * t,
      y: p.y * (1 - t) + prev[i + 1].y * t,
    })))
  }
  return levels
}

function drawBezier(ctx, width, height, algorithm, settings, progress) {
  const degree = Number.parseInt(algorithm, 10)
  const controls = (settings.bezierPoints || BEZIER_POINTS).slice(0, degree + 1)
  const transform = fitTransform(width, height, 880, 560)
  path(ctx, controls, transform)
  ctx.setLineDash([8, 7]); ctx.strokeStyle = 'rgba(232, 240, 242, .38)'; ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([])
  const curve = bezierCurve(controls)
  const visible = curve.slice(0, Math.max(2, Math.ceil(curve.length * progress)))
  path(ctx, visible, transform)
  ctx.strokeStyle = '#f43f75'; ctx.lineWidth = 5; ctx.stroke()
  if (settings.construction) {
    casteljauLevels(controls, progress).slice(1).forEach((level, index) => {
      path(ctx, level, transform)
      ctx.strokeStyle = ['rgba(94,234,212,.5)', 'rgba(251,191,36,.65)', 'rgba(167,139,250,.8)'][index % 3]
      ctx.lineWidth = 1.5
      ctx.stroke()
      level.forEach((p) => {
        const q = transform.point(p)
        ctx.fillStyle = ctx.strokeStyle; ctx.beginPath(); ctx.arc(q.x, q.y, 4, 0, Math.PI * 2); ctx.fill()
      })
    })
  }
  controls.forEach((p, index) => {
    const q = transform.point(p)
    ctx.fillStyle = COLORS.pink; ctx.beginPath(); ctx.arc(q.x, q.y, 8, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = COLORS.ink; ctx.font = '600 12px Inter, system-ui'; ctx.fillText(`P${index}`, q.x + 11, q.y - 10)
  })
  return { count: curve.length, label: `${Math.round(progress * 100)}% 曲线`, complexity: `O(${degree}² × samples)` }
}

export default function CanvasStage({ experiment, algorithm, settings, setSettings, progress, compare, onStats }) {
  const canvasRef = useRef(null)
  const [dragTarget, setDragTarget] = useState(null)
  const [selectedClipPoint, setSelectedClipPoint] = useState(0)

  const accent = experiment.accent
  const stats = useMemo(() => ({ count: 0, label: '准备就绪', complexity: '—' }), [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined
    const draw = () => {
      const { ctx, width, height } = resizeCanvas(canvas)
      drawBackdrop(ctx, width, height, accent)
      let next
      if (experiment.id === 'primitives') next = drawPrimitive(ctx, width, height, algorithm, settings, progress, compare)
      if (experiment.id === 'fill') next = drawFill(ctx, width, height, algorithm, settings, progress, compare)
      if (experiment.id === 'clipping') next = drawClipping(ctx, width, height, algorithm, settings, progress, selectedClipPoint)
      if (experiment.id === 'transform') next = drawTransform(ctx, width, height, algorithm, settings, progress)
      if (experiment.id === 'bezier') next = drawBezier(ctx, width, height, algorithm, settings, progress)
      Object.assign(stats, next)
      onStats?.({ ...next })
    }
    draw()
    const observer = new ResizeObserver(draw)
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [accent, algorithm, compare, experiment.id, onStats, progress, selectedClipPoint, settings, stats])

  const pointerToBezier = (event) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const transform = fitTransform(rect.width, rect.height, 880, 560)
    return { x: (event.clientX - rect.left - transform.x) / transform.scale, y: (event.clientY - rect.top - transform.y) / transform.scale }
  }

  const pointerToClipping = (event) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const transform = fitTransform(rect.width, rect.height, 820, 560)
    return { x: (event.clientX - rect.left - transform.x) / transform.scale, y: (event.clientY - rect.top - transform.y) / transform.scale }
  }

  const onPointerDown = (event) => {
    let nextTarget = null
    if (experiment.id === 'bezier') {
      const p = pointerToBezier(event)
      const points = settings.bezierPoints || BEZIER_POINTS
      const index = points.slice(0, Number.parseInt(algorithm, 10) + 1)
        .findIndex((candidate) => Math.hypot(candidate.x - p.x, candidate.y - p.y) < 28)
      if (index >= 0) nextTarget = { type: 'bezier', index }
    }
    if (experiment.id === 'clipping' && algorithm !== 'Sutherland-Hodgman') {
      const p = pointerToClipping(event)
      const points = settings.clipLine || CLIP_LINE
      const index = points.findIndex((candidate) => Math.hypot(candidate.x - p.x, candidate.y - p.y) < 34)
      if (index >= 0) {
        nextTarget = { type: 'clip', index }
        setSelectedClipPoint(index)
      }
    }
    if (nextTarget) {
      setDragTarget(nextTarget)
      event.currentTarget.focus()
      event.currentTarget.setPointerCapture(event.pointerId)
    }
  }

  const onPointerMove = (event) => {
    if (!dragTarget) return
    if (dragTarget.type === 'bezier') {
      const p = pointerToBezier(event)
      const next = [...(settings.bezierPoints || BEZIER_POINTS)].map((point) => ({ ...point }))
      next[dragTarget.index] = { x: Math.max(0, Math.min(880, p.x)), y: Math.max(0, Math.min(560, p.y)) }
      setSettings((current) => ({ ...current, bezierPoints: next }))
      return
    }
    const p = pointerToClipping(event)
    const next = [...(settings.clipLine || CLIP_LINE)].map((point) => ({ ...point }))
    next[dragTarget.index] = { x: Math.max(0, Math.min(820, p.x)), y: Math.max(0, Math.min(560, p.y)) }
    setSettings((current) => ({ ...current, clipLine: next }))
  }

  const onKeyDown = (event) => {
    if (experiment.id !== 'clipping' || algorithm === 'Sutherland-Hodgman') return
    if (event.key === '1' || event.key === '2') {
      setSelectedClipPoint(Number(event.key) - 1)
      return
    }
    const moves = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    }
    const move = moves[event.key]
    if (!move) return
    event.preventDefault()
    const step = event.shiftKey ? 15 : 5
    setSettings((current) => {
      const next = [...(current.clipLine || CLIP_LINE)].map((point) => ({ ...point }))
      const point = next[selectedClipPoint]
      next[selectedClipPoint] = {
        x: Math.max(0, Math.min(820, point.x + move[0] * step)),
        y: Math.max(0, Math.min(560, point.y + move[1] * step)),
      }
      return { ...current, clipLine: next }
    })
  }

  return (
    <canvas
      ref={canvasRef}
      className="experiment-canvas"
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={() => setDragTarget(null)}
      onPointerCancel={() => setDragTarget(null)}
      onKeyDown={onKeyDown}
      aria-label={`${experiment.title}交互画布`}
    />
  )
}

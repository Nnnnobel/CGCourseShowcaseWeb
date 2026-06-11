import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BookOpenCheck,
  ChevronLeft,
  ChevronRight,
  Download,
  Expand,
  FlaskConical,
  Menu,
  Pause,
  Play,
  Presentation,
  RotateCcw,
  X,
} from 'lucide-react'
import './App.css'
import CanvasStage from './components/CanvasStage'
import ControlPanel from './components/ControlPanel'
import InsightDock from './components/InsightDock'
import { experiments } from './data/experiments'
import { BEZIER_POINTS, CLIP_LINE, CLIP_POLYGON, FILL_POLYGON } from './lib/algorithms'

const defaultSettings = {
  x0: 8, y0: 9, x1: 72, y1: 43, cx: 45, cy: 31, radius: 20, rx: 31, ry: 18,
  color: '#5eead4', dx: 90, dy: 40, sx: 1.35, sy: 1.2, angle: 34,
  lineWidth: 1, lineStyle: 'solid', pixelZoom: 1,
  imageSource: null, imageName: '', imageResolution: 48, imageMode: 'color',
  construction: true, bezierPoints: BEZIER_POINTS, clipLine: CLIP_LINE,
  fillPolygon: FILL_POLYGON, fillEditMode: 'move', selectedFillVertex: 0,
  clipPolygon: CLIP_POLYGON, clipEditMode: 'move', selectedClipVertex: 0,
}

function App() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [algorithm, setAlgorithm] = useState(experiments[0].algorithms[2])
  const [settings, setSettings] = useState(defaultSettings)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(1)
  const [mode, setMode] = useState('standard')
  const [speed, setSpeed] = useState(1)
  const [compare, setCompare] = useState(false)
  const [stats, setStats] = useState({ label: '准备就绪', complexity: '—' })
  const [presentation, setPresentation] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  const animationRef = useRef(null)
  const lastFrame = useRef(0)
  const experiment = experiments[activeIndex]

  useEffect(() => {
    if (!playing) {
      cancelAnimationFrame(animationRef.current)
      return undefined
    }
    const frame = (time) => {
      if (!lastFrame.current) lastFrame.current = time
      const delta = (time - lastFrame.current) / 1000
      lastFrame.current = time
      setProgress((current) => {
        const next = current + delta * 0.23 * speed
        if (next >= 1) {
          setPlaying(false)
          return 1
        }
        return next
      })
      animationRef.current = requestAnimationFrame(frame)
    }
    animationRef.current = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(animationRef.current)
      lastFrame.current = 0
    }
  }, [playing, speed])

  const accentStyle = useMemo(() => ({ '--accent': experiment.accent }), [experiment.accent])

  const togglePlay = () => {
    if (mode === 'standard') {
      setMode('demo')
      setProgress(0)
      setPlaying(true)
      return
    }
    if (!playing && progress >= 1) setProgress(0)
    setPlaying((current) => !current)
  }

  const selectRelative = (direction) => {
    selectExperiment((activeIndex + direction + experiments.length) % experiments.length)
  }

  const selectExperiment = (index) => {
    setActiveIndex(index)
    setAlgorithm(experiments[index].algorithms[0])
    setProgress(1)
    setMode('standard')
    setPlaying(false)
    setCompare(false)
    setNavOpen(false)
  }

  const exportCanvas = () => {
    const canvas = document.querySelector('.experiment-canvas')
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `${experiment.index}-${experiment.title}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  const requestFullscreen = async () => {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen()
    else await document.exitFullscreen()
  }

  return (
    <div className={`app-shell ${presentation ? 'is-presenting' : ''}`} style={accentStyle}>
      <button type="button" className="mobile-menu" onClick={() => setNavOpen(true)} aria-label="打开实验导航"><Menu /></button>

      <nav className={`experiment-rail ${navOpen ? 'is-open' : ''}`}>
        <div className="rail-brand">
          <div className="brand-mark"><FlaskConical size={22} /></div>
          <div><strong>CG / LAB</strong><span>交互图形实验室</span></div>
          <button type="button" className="mobile-close" onClick={() => setNavOpen(false)}><X size={18} /></button>
        </div>

        <div className="rail-label">EXPERIMENT INDEX</div>
        <div className="experiment-list">
          {experiments.map((item, index) => {
            const Icon = item.icon
            return (
              <button
                type="button"
                key={item.id}
                className={index === activeIndex ? 'is-active' : ''}
                onClick={() => selectExperiment(index)}
                style={{ '--item-accent': item.accent }}
              >
                <span className="experiment-number">{item.index}</span>
                <Icon size={19} />
                <span><strong>{item.title}</strong><small>{item.short}</small></span>
              </button>
            )
          })}
        </div>

        <div className="rail-footer">
          <BookOpenCheck size={17} />
          <div><strong>24122339 郑皓文</strong><span>计算机图形学 · 实验 1–5</span></div>
        </div>
      </nav>

      <main className="lab-main">
        <header className="lab-header">
          <div className="title-block">
            <span className="eyebrow">COMPUTER GRAPHICS · INTERACTIVE SHOWCASE</span>
            <h1><em>{experiment.index}</em>{experiment.title}</h1>
            <p>{experiment.short}</p>
          </div>
          <div className="header-actions">
            <button type="button" className={presentation ? 'is-active' : ''} onClick={() => setPresentation((current) => !current)}><Presentation size={17} /><span>演示视图</span></button>
            <button type="button" onClick={exportCanvas} title="导出当前画布"><Download size={17} /></button>
            <button type="button" onClick={requestFullscreen} title="全屏"><Expand size={17} /></button>
          </div>
        </header>

        <section className="lab-workspace">
          <div className="stage-panel">
            <div className="stage-toolbar">
              <div className="stage-status"><i /><span>LIVE RENDER</span><b>{algorithm}</b></div>
              <div className="playback">
                <span className="mode-indicator">{mode === 'standard' ? 'STANDARD' : 'DEMO'}</span>
                <button type="button" onClick={() => { setProgress(mode === 'standard' ? 1 : 0); setPlaying(false) }} title="重置动画"><RotateCcw size={15} /></button>
                <button type="button" className="play-button" onClick={togglePlay}>{playing ? <Pause size={16} /> : <Play size={16} fill="currentColor" />}</button>
                <input aria-label="演示进度" type="range" min="0" max="1" step="0.002" value={mode === 'standard' ? 1 : progress} disabled={mode === 'standard'} onChange={(event) => { setPlaying(false); setProgress(Number(event.target.value)) }} />
                <output>{Math.round((mode === 'standard' ? 1 : progress) * 100)}%</output>
              </div>
            </div>
            <div className="canvas-wrap">
              <CanvasStage
                experiment={experiment}
                algorithm={algorithm}
                settings={settings}
                setSettings={setSettings}
                progress={mode === 'standard' ? 1 : progress}
                compare={compare}
                onStats={setStats}
              />
              <div className="canvas-corners" aria-hidden="true"><i /><i /><i /><i /></div>
            </div>
            <div className="stage-footer">
              <button type="button" onClick={() => selectRelative(-1)}><ChevronLeft size={15} /> 上一实验</button>
              <span>拖动参数、播放生成过程，或切换下方知识视图</span>
              <button type="button" onClick={() => selectRelative(1)}>下一实验 <ChevronRight size={15} /></button>
            </div>
          </div>

          <ControlPanel
            experiment={experiment}
            algorithm={algorithm}
            setAlgorithm={(value) => { setAlgorithm(value); setProgress(1); setPlaying(false) }}
            settings={settings}
            setSettings={setSettings}
            mode={mode}
            setMode={(value) => {
              setMode(value)
              setPlaying(false)
              setProgress(value === 'standard' ? 1 : 0)
            }}
            compare={compare}
            setCompare={setCompare}
            speed={speed}
            setSpeed={setSpeed}
            stats={stats}
          />
        </section>

        <InsightDock experiment={experiment} algorithm={algorithm} progress={mode === 'standard' ? 1 : progress} />
      </main>
    </div>
  )
}

export default App

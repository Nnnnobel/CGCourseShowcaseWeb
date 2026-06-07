import {
  Activity,
  Braces,
  CircleDot,
  Gauge,
  GitCompareArrows,
  Palette,
  RefreshCcw,
  Route,
  Sparkles,
} from 'lucide-react'
import { BEZIER_POINTS, CLIP_LINE } from '../lib/algorithms'

function Slider({ label, value, min, max, step = 1, onChange, unit = '' }) {
  return (
    <label className="slider-control">
      <span>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
      <output>{Number(value).toFixed(step < 1 ? 1 : 0)}{unit}</output>
    </label>
  )
}

function Toggle({ checked, onChange, label, icon: Icon }) {
  return (
    <button type="button" className={`toggle-row ${checked ? 'is-on' : ''}`} onClick={() => onChange(!checked)}>
      <Icon size={15} />
      <span>{label}</span>
      <i aria-hidden="true" />
    </button>
  )
}

const set = (setSettings, key) => (value) => setSettings((current) => ({ ...current, [key]: value }))

function transformMatrix(algorithm, settings) {
  const angle = settings.angle * Math.PI / 180
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  if (algorithm === '平移') return [[1, 0, settings.dx], [0, 1, settings.dy], [0, 0, 1]]
  if (algorithm === '放缩') return [[settings.sx, 0, 0], [0, settings.sy, 0], [0, 0, 1]]
  if (algorithm === '旋转') return [[c, -s, 0], [s, c, 0], [0, 0, 1]]
  return [[c * settings.sx, -s * settings.sy, settings.dx], [s * settings.sx, c * settings.sy, settings.dy], [0, 0, 1]]
}

export default function ControlPanel({
  experiment,
  algorithm,
  setAlgorithm,
  settings,
  setSettings,
  mode,
  setMode,
  compare,
  setCompare,
  speed,
  setSpeed,
  stats,
}) {
  const reset = () => setSettings({
    x0: 8, y0: 9, x1: 72, y1: 43, cx: 45, cy: 31, radius: 20, rx: 31, ry: 18,
    color: '#5eead4', dx: 90, dy: 40, sx: 1.35, sy: 1.2, angle: 34,
    lineWidth: 1, lineStyle: 'solid', pixelZoom: 1,
    construction: true, bezierPoints: BEZIER_POINTS, clipLine: CLIP_LINE,
  })
  const matrix = transformMatrix(algorithm, settings)

  return (
    <aside className="control-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">CONTROL DECK</span>
          <h2>实验控制台</h2>
        </div>
        <button type="button" className="icon-button" title="恢复默认参数" onClick={reset}><RefreshCcw size={16} /></button>
      </div>

      <label className="select-control">
        <span>算法</span>
        <select value={algorithm} onChange={(event) => setAlgorithm(event.target.value)}>
          {experiment.algorithms.map((item) => <option key={item}>{item}</option>)}
        </select>
      </label>

      <div className="control-scroll">
        {['primitives', 'fill', 'clipping'].includes(experiment.id) && (
          <div className="control-group">
            <div className="mode-switch" aria-label="运行模式">
              <button type="button" className={mode === 'standard' ? 'is-active' : ''} onClick={() => setMode('standard')}>标准模式</button>
              <button type="button" className={mode === 'demo' ? 'is-active' : ''} onClick={() => setMode('demo')}>演示模式</button>
            </div>
          </div>
        )}

        {experiment.id === 'primitives' && (
          <div className="control-group">
            {algorithm.includes('直线') ? (
              <>
                <Slider label="起点 X" value={settings.x0} min={0} max={90} onChange={set(setSettings, 'x0')} />
                <Slider label="起点 Y" value={settings.y0} min={0} max={63} onChange={set(setSettings, 'y0')} />
                <Slider label="终点 X" value={settings.x1} min={0} max={90} onChange={set(setSettings, 'x1')} />
                <Slider label="终点 Y" value={settings.y1} min={0} max={63} onChange={set(setSettings, 'y1')} />
              </>
            ) : (
              <>
                <Slider label="中心 X" value={settings.cx} min={0} max={90} onChange={set(setSettings, 'cx')} />
                <Slider label="中心 Y" value={settings.cy} min={0} max={63} onChange={set(setSettings, 'cy')} />
                {algorithm.includes('椭圆') ? (
                  <>
                    <Slider label="长半轴" value={settings.rx} min={4} max={42} onChange={set(setSettings, 'rx')} />
                    <Slider label="短半轴" value={settings.ry} min={4} max={28} onChange={set(setSettings, 'ry')} />
                  </>
                ) : <Slider label="半径" value={settings.radius} min={3} max={28} onChange={set(setSettings, 'radius')} />}
              </>
            )}
            <Slider label="线宽" value={settings.lineWidth} min={1} max={4} onChange={set(setSettings, 'lineWidth')} unit=" px" />
            <Slider label="像素倍率" value={settings.pixelZoom} min={0.8} max={1.6} step={0.1} onChange={set(setSettings, 'pixelZoom')} unit="×" />
            <label className="compact-select-control">
              <span>线型</span>
              <select value={settings.lineStyle} onChange={(event) => set(setSettings, 'lineStyle')(event.target.value)}>
                <option value="solid">实线</option>
                <option value="dashed">虚线</option>
                <option value="dotted">点线</option>
              </select>
            </label>
          </div>
        )}

        {experiment.id === 'fill' && (
          <div className="control-group feature-note">
            <CircleDot size={17} />
            <div><strong>固定六边形样本</strong><p>切换算法观察相同区域的不同生成顺序。</p></div>
          </div>
        )}

        {experiment.id === 'clipping' && (
          <div className="control-group">
            <div className="feature-note">
              <Route size={17} />
              <div><strong>拖动青色与黄色端点</strong><p>按 1 / 2 选点，方向键移动，Shift 加速。</p></div>
            </div>
            {algorithm !== 'Sutherland-Hodgman' && (
              <div className="clip-coordinates">
                {(settings.clipLine || CLIP_LINE).map((point, index) => (
                  <div key={index}><b>P{index + 1}</b><span>x {Math.round(point.x)}</span><span>y {Math.round(point.y)}</span></div>
                ))}
              </div>
            )}
          </div>
        )}

        {experiment.id === 'transform' && (
          <div className="control-group">
            {(algorithm === '平移' || algorithm === '复合变换') && (
              <>
                <Slider label="水平位移" value={settings.dx} min={-180} max={180} onChange={set(setSettings, 'dx')} />
                <Slider label="垂直位移" value={settings.dy} min={-130} max={130} onChange={set(setSettings, 'dy')} />
              </>
            )}
            {(algorithm === '放缩' || algorithm === '复合变换') && (
              <>
                <Slider label="水平缩放" value={settings.sx} min={0.3} max={2.4} step={0.05} onChange={set(setSettings, 'sx')} />
                <Slider label="垂直缩放" value={settings.sy} min={0.3} max={2.4} step={0.05} onChange={set(setSettings, 'sy')} />
              </>
            )}
            {(algorithm === '旋转' || algorithm === '复合变换') && (
              <Slider label="旋转角度" value={settings.angle} min={-180} max={180} onChange={set(setSettings, 'angle')} unit="°" />
            )}
            <div className="matrix-readout" aria-label="当前齐次变换矩阵">
              <span>M =</span>
              <div>
                {matrix.flat().map((value, index) => (
                  <code key={index}>{Math.abs(value) < 0.005 ? '0' : value.toFixed(2)}</code>
                ))}
              </div>
            </div>
          </div>
        )}

        {experiment.id === 'bezier' && (
          <div className="control-group">
            <Toggle checked={settings.construction} onChange={set(setSettings, 'construction')} label="显示 De Casteljau 构造" icon={Braces} />
            <div className="feature-note">
              <CircleDot size={17} />
              <div><strong>直接拖动控制点</strong><p>曲线和递推辅助线会实时重算。</p></div>
            </div>
          </div>
        )}

        <div className="control-group">
          {(experiment.id === 'primitives' || experiment.id === 'fill') && (
            <label className="color-control">
              <Palette size={15} />
              <span>绘制颜色</span>
              <input type="color" value={settings.color} onChange={(event) => setSettings((current) => ({ ...current, color: event.target.value }))} />
            </label>
          )}
          <Toggle checked={compare} onChange={setCompare} label="参考结果叠加" icon={GitCompareArrows} />
          <Slider label="演示速度" value={speed} min={0.35} max={2.5} step={0.05} onChange={setSpeed} unit="×" />
        </div>
      </div>

      <div className="metric-strip">
        <div><Activity size={15} /><span>{stats.label}</span></div>
        <div><Gauge size={15} /><span>{stats.complexity}</span></div>
      </div>

      <div className="bonus-stamp"><Sparkles size={14} /> 已启用 {experiment.bonus.length} 项加分功能</div>
    </aside>
  )
}

import {
  Activity,
  Braces,
  CircleDot,
  Gauge,
  GitCompareArrows,
  ImageUp,
  MousePointer2,
  Palette,
  Plus,
  RefreshCcw,
  Route,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { BEZIER_POINTS, CLIP_LINE, CLIP_POLYGON, FILL_POLYGON } from '../lib/algorithms'

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
    imageSource: null, imageName: '', imageResolution: 48, imageMode: 'color',
    construction: true, bezierPoints: BEZIER_POINTS, clipLine: CLIP_LINE,
    fillPolygon: FILL_POLYGON, fillEditMode: 'move', selectedFillVertex: 0,
    clipPolygon: CLIP_POLYGON, clipEditMode: 'move', selectedClipVertex: 0,
  })
  const matrix = transformMatrix(algorithm, settings)
  const onImageUpload = (event) => {
    const file = event.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.addEventListener('load', () => {
      setSettings((current) => ({
        ...current,
        imageSource: reader.result,
        imageName: file.name,
      }))
    }, { once: true })
    reader.readAsDataURL(file)
    event.target.value = ''
  }

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
            {algorithm === '图像光栅化' ? (
              <>
                <label className="image-upload-control">
                  <input type="file" accept="image/*" onChange={onImageUpload} />
                  <ImageUp size={18} />
                  <span><strong>{settings.imageName || '上传真实图片'}</strong><small>JPG、PNG、WebP 等本地图片</small></span>
                </label>
                <Slider label="采样列数" value={settings.imageResolution} min={16} max={96} step={4} onChange={set(setSettings, 'imageResolution')} />
                <label className="compact-select-control">
                  <span>颜色模式</span>
                  <select value={settings.imageMode} onChange={(event) => set(setSettings, 'imageMode')(event.target.value)}>
                    <option value="color">原始 RGB</option>
                    <option value="grayscale">灰度亮度</option>
                    <option value="quantized">限色量化</option>
                  </select>
                </label>
                <div className="feature-note">
                  <ImageUp size={17} />
                  <div><strong>图片仅在本机浏览器处理</strong><p>先缩小采样，再按从左到右、从上到下的顺序写入像素框。</p></div>
                </div>
              </>
            ) : (
              <>
                {algorithm.includes('直线') && (
                  <div className="feature-note">
                    <MousePointer2 size={17} />
                    <div><strong>直接在画布点击作图</strong><p>第一次点击确定起点，移动鼠标预览，第二次点击确定终点。</p></div>
                  </div>
                )}
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
              </>
            )}
          </div>
        )}

        {experiment.id === 'fill' && (
          <div className="control-group">
            <div className="polygon-mode" aria-label="多边形编辑模式">
              <button
                type="button"
                className={settings.fillEditMode !== 'add' ? 'is-active' : ''}
                onClick={() => setSettings((current) => ({ ...current, fillEditMode: 'move' }))}
              >
                <MousePointer2 size={14} />拖动顶点
              </button>
              <button
                type="button"
                className={settings.fillEditMode === 'add' ? 'is-active' : ''}
                disabled={(settings.fillPolygon || FILL_POLYGON).length >= 12}
                onClick={() => setSettings((current) => ({ ...current, fillEditMode: 'add' }))}
              >
                <Plus size={14} />点击加点
              </button>
            </div>
            <div className="polygon-actions">
              <button
                type="button"
                disabled={(settings.fillPolygon || FILL_POLYGON).length <= 3}
                onClick={() => setSettings((current) => {
                  const polygon = current.fillPolygon || FILL_POLYGON
                  const selected = Math.min(current.selectedFillVertex || 0, polygon.length - 1)
                  const next = polygon.filter((_, index) => index !== selected)
                  return { ...current, fillPolygon: next, selectedFillVertex: Math.min(selected, next.length - 1) }
                })}
              >
                <Trash2 size={14} />删除选中点
              </button>
              <button
                type="button"
                onClick={() => setSettings((current) => ({
                  ...current,
                  fillPolygon: FILL_POLYGON,
                  fillEditMode: 'move',
                  selectedFillVertex: 0,
                }))}
              >
                <RefreshCcw size={14} />恢复形状
              </button>
            </div>
            <div className="feature-note">
              <CircleDot size={17} />
              <div>
                <strong>{(settings.fillPolygon || FILL_POLYGON).length} 个顶点 · 当前 P{(settings.selectedFillVertex || 0) + 1}</strong>
                <p>拖动顶点实时重算；加点模式会在最近的边上插入新顶点。</p>
              </div>
            </div>
          </div>
        )}

        {experiment.id === 'clipping' && (
          <div className="control-group">
            {algorithm === 'Sutherland-Hodgman' ? (
              <>
                <div className="polygon-mode" aria-label="裁剪多边形编辑模式">
                  <button
                    type="button"
                    className={settings.clipEditMode !== 'add' ? 'is-active' : ''}
                    onClick={() => setSettings((current) => ({ ...current, clipEditMode: 'move' }))}
                  >
                    <MousePointer2 size={14} />拖动顶点
                  </button>
                  <button
                    type="button"
                    className={settings.clipEditMode === 'add' ? 'is-active' : ''}
                    disabled={(settings.clipPolygon || CLIP_POLYGON).length >= 12}
                    onClick={() => setSettings((current) => ({ ...current, clipEditMode: 'add' }))}
                  >
                    <Plus size={14} />点击加点
                  </button>
                </div>
                <div className="polygon-actions">
                  <button
                    type="button"
                    disabled={(settings.clipPolygon || CLIP_POLYGON).length <= 3}
                    onClick={() => setSettings((current) => {
                      const polygon = current.clipPolygon || CLIP_POLYGON
                      const selected = Math.min(current.selectedClipVertex || 0, polygon.length - 1)
                      const next = polygon.filter((_, index) => index !== selected)
                      return { ...current, clipPolygon: next, selectedClipVertex: Math.min(selected, next.length - 1) }
                    })}
                  >
                    <Trash2 size={14} />删除选中点
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettings((current) => ({
                      ...current,
                      clipPolygon: CLIP_POLYGON,
                      clipEditMode: 'move',
                      selectedClipVertex: 0,
                    }))}
                  >
                    <RefreshCcw size={14} />恢复形状
                  </button>
                </div>
                <div className="feature-note">
                  <Route size={17} />
                  <div>
                    <strong>{(settings.clipPolygon || CLIP_POLYGON).length} 个输入顶点 · 当前 P{(settings.selectedClipVertex || 0) + 1}</strong>
                    <p>编辑原始多边形，蓝色裁剪结果与四步过程会实时更新。</p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="feature-note">
                  <Route size={17} />
                  <div><strong>拖动青色与黄色端点</strong><p>按 1 / 2 选点，方向键移动，Shift 加速。</p></div>
                </div>
                <div className="clip-coordinates">
                  {(settings.clipLine || CLIP_LINE).map((point, index) => (
                    <div key={index}><b>P{index + 1}</b><span>x {Math.round(point.x)}</span><span>y {Math.round(point.y)}</span></div>
                  ))}
                </div>
              </>
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
              <div>
                <strong>{Number.parseInt(algorithm, 10)} 阶 · {Number.parseInt(algorithm, 10) + 1} 个控制点</strong>
                <p>直接拖动控制点，曲线和递推辅助线会实时重算。</p>
              </div>
            </div>
          </div>
        )}

        <div className="control-group">
          {((experiment.id === 'primitives' && algorithm !== '图像光栅化') || experiment.id === 'fill') && (
            <label className="color-control">
              <Palette size={15} />
              <span>绘制颜色</span>
              <input type="color" value={settings.color} onChange={(event) => setSettings((current) => ({ ...current, color: event.target.value }))} />
            </label>
          )}
          {algorithm !== '图像光栅化' && <Toggle checked={compare} onChange={setCompare} label="参考结果叠加" icon={GitCompareArrows} />}
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

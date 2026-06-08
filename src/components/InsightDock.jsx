import { useEffect, useRef, useState } from 'react'
import { Award, BookOpenText, CircleHelp, Code2, CodeXml, Lightbulb, MapPin, Sparkles } from 'lucide-react'
import { activeCodeLine, algorithmCode } from '../data/algorithmCode'
import { algorithmNotes } from '../data/experiments'

const tabs = [
  ['code', '代码', CodeXml],
  ['principle', '原理', BookOpenText],
  ['steps', '步骤', Code2],
  ['applications', '应用', Lightbulb],
  ['bonus', '加分项', Award],
  ['help', '帮助', CircleHelp],
]

export default function InsightDock({ experiment, algorithm, progress }) {
  const [tab, setTab] = useState('code')
  const codeScrollRef = useRef(null)
  const notes = algorithmNotes[experiment.id]?.[algorithm] || []
  const snippet = algorithmCode[experiment.id]?.[algorithm]
  const activeLine = activeCodeLine(experiment.id, algorithm, progress)

  useEffect(() => {
    const active = codeScrollRef.current?.querySelector('.is-active')
    active?.scrollIntoView({ block: 'nearest' })
  }, [activeLine, algorithm])

  return (
    <section className="insight-dock">
      <div className="dock-tabs" role="tablist">
        {tabs.map(([id, label, Icon]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'is-active' : ''} onClick={() => setTab(id)}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>
      <div className="dock-content">
        {tab === 'code' && snippet && (
          <div className="code-demo">
            <div className="code-demo-heading">
              <div><span className="eyebrow">C++ EXECUTION TRACE</span><h3>{algorithm}</h3></div>
              <span>LINE {String(activeLine + 1).padStart(2, '0')}</span>
            </div>
            <pre ref={codeScrollRef}>
              {snippet.lines.map((line, index) => (
                <code key={`${algorithm}-${index}`} className={index === activeLine ? 'is-active' : ''}>
                  <i>{String(index + 1).padStart(2, '0')}</i><span>{line || ' '}</span>
                </code>
              ))}
            </pre>
          </div>
        )}
        {tab === 'principle' && (
          <div className="principle-copy">
            <span className="content-index">{experiment.index}</span>
            <p>{experiment.principle}</p>
          </div>
        )}
        {tab === 'steps' && (
          <ol className="step-flow">
            {notes.map((note, index) => <li key={note}><span>{String(index + 1).padStart(2, '0')}</span><p>{note}</p></li>)}
          </ol>
        )}
        {tab === 'applications' && (
          <div className="application-grid">
            {experiment.applications.map(([title, description], index) => (
              <article key={title}>
                <div><MapPin size={15} /><span>0{index + 1}</span></div>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        )}
        {tab === 'bonus' && (
          <div className="bonus-grid">
            {experiment.bonus.map((item) => <div key={item}><Sparkles size={16} /><span>{item}</span><b>ACTIVE</b></div>)}
          </div>
        )}
        {tab === 'help' && (
          <div className="help-document">
            <div>
              <span className="eyebrow">IN-APP HELP</span>
              <h3>{experiment.title}操作帮助</h3>
            </div>
            <ol>
              {experiment.help.map((item, index) => (
                <li key={item}><b>{String(index + 1).padStart(2, '0')}</b><span>{item}</span></li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </section>
  )
}

import { useState } from 'react'
import { Award, BookOpenText, CircleHelp, Code2, Lightbulb, MapPin, Sparkles } from 'lucide-react'
import { algorithmNotes } from '../data/experiments'

const tabs = [
  ['principle', '原理', BookOpenText],
  ['steps', '步骤', Code2],
  ['applications', '应用', Lightbulb],
  ['bonus', '加分项', Award],
  ['help', '帮助', CircleHelp],
]

export default function InsightDock({ experiment, algorithm }) {
  const [tab, setTab] = useState('applications')
  const notes = algorithmNotes[experiment.id]?.[algorithm] || []

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

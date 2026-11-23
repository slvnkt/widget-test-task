import { useEffect, useMemo, useState } from 'react'
import { Badge } from '@ds/components/Badge'
import { Select } from '@ds/components/Select'
import { Switch } from '@ds/components/Switch'
import { Tabs } from '@ds/components/Tabs'
import { buildModel, SCENARIOS } from './data/campaign'
import { DeliveryWidget } from './widget/DeliveryWidget'

const fromHash = () => {
  const id = decodeURIComponent(location.hash.replace('#', ''))
  return SCENARIOS.some(s => s.id === id) ? id : 'on-track'
}

export function App() {
  const [id, setId] = useState(fromHash)
  const [mode, setMode] = useState('one')
  const [dark, setDark] = useState(false)
  const models = useMemo(() => SCENARIOS.map(buildModel), [])
  const m = models.find(x => x.def.id === id)!

  useEffect(() => { document.documentElement.dataset.theme = dark ? 'dark' : 'light' }, [dark])
  useEffect(() => { history.replaceState(null, '', `#${id}`) }, [id])
  useEffect(() => {
    const on = () => setId(fromHash())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])

  return (
    <div className="shell">
      <header className="shell__bar" aria-label="Prototype controls">
        <div className="shell__title">
          <span className="shell__name">TV+ campaign delivery widget</span>
          <Badge variant="neutral" size="sm" dot={false}>Prototype · mock data</Badge>
        </div>
        <div className="shell__controls">
          <Tabs variant="filled" label="View" value={mode} onValueChange={setMode} items={[{ value: 'one', label: 'One state' }, { value: 'all', label: `All states (${SCENARIOS.length})` }]} />
          {mode === 'one' && (
            <Select
              className="shell__select"
              size="sm"
              label="State"
              value={id}
              onValueChange={setId}
              options={SCENARIOS.map(s => ({ value: s.id, label: s.label }))}
            />
          )}
          <Switch size="sm" label="Dark theme" checked={dark} onChange={e => setDark(e.target.checked)} />
        </div>
      </header>

      {mode === 'one' ? (
        <main className="stage">
          <div className="stage__widget"><DeliveryWidget m={m} /></div>
          <aside className="note" aria-label="Reviewer note">
            <p className="note__eyebrow">{m.def.group}</p>
            <h1 className="note__title">{m.def.label}</h1>
            <p className="note__text">{m.def.note}</p>
            <p className="note__hint">The state switcher is a review tool, not part of the widget. Try hovering the bar segments and the ⓘ icons, click “Logs received”, and open Details.</p>
          </aside>
        </main>
      ) : (
        <main className="grid">
          {models.map(x => (
            <section key={x.def.id} className="grid__item" aria-label={x.def.label}>
              <div className="grid__head">
                <h2 className="grid__label">{x.def.label}</h2>
                <p className="grid__note">{x.def.note}</p>
              </div>
              <DeliveryWidget m={x} />
            </section>
          ))}
        </main>
      )}
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { emptyProject, type Project } from '../shared/types'
import { api } from './lib/api'
import { BoardPage } from './pages/BoardPage'
import { PlansPage } from './pages/PlansPage'
import { ShotsPage } from './pages/ShotsPage'

const TABS = ['Board', 'Shots', 'Plans'] as const
type Tab = (typeof TABS)[number]

export default function App() {
  const [tab, setTab] = useState<Tab>('Board')
  const [project, setProject] = useState<Project>(emptyProject())
  const [loaded, setLoaded] = useState(false)
  const [status, setStatus] = useState<{ hasApiKey: boolean } | 'offline' | null>(null)
  const saveTimer = useRef<number>(undefined)

  useEffect(() => {
    api.health().then(setStatus).catch(() => setStatus('offline'))
    api.loadProject().then((p) => { setProject(p); setLoaded(true) }).catch(() => setLoaded(true))
  }, [])

  // Autosave 0.8s after the last change.
  useEffect(() => {
    if (!loaded) return
    window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => { api.saveProject(project).catch(console.error) }, 800)
  }, [project, loaded])

  return (
    <div className="mx-auto max-w-7xl p-4">
      <header className="mb-4 flex flex-wrap items-center gap-4">
        <h1 className="text-xl font-bold">Promo Shot Planner</h1>
        <input
          className="rounded border px-2 py-1"
          value={project.name}
          onChange={(e) => setProject({ ...project, name: e.target.value })}
        />
        <nav className="flex gap-1">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`rounded px-3 py-1 ${tab === t ? 'bg-black text-white' : 'bg-neutral-200'}`}>
              {t}
            </button>
          ))}
        </nav>
        <span className="ml-auto text-sm text-neutral-500">
          {status === 'offline' ? 'API offline: run npm run dev' : status && !status.hasApiKey ? 'No ANTHROPIC_API_KEY set (see .env.example)' : ''}
        </span>
      </header>
      {tab === 'Board' && <BoardPage project={project} setProject={setProject} goToShots={() => setTab('Shots')} />}
      {tab === 'Shots' && <ShotsPage project={project} setProject={setProject} />}
      {tab === 'Plans' && <PlansPage project={project} setProject={setProject} />}
    </div>
  )
}

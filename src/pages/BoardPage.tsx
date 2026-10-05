import { useState } from 'react'
import type { Pin, Project, Shot } from '../../shared/types'
import { api } from '../lib/api'

type Props = { project: Project; setProject: (p: Project) => void; goToShots: () => void }

export function BoardPage({ project, setProject, goToShots }: Props) {
  const [url, setUrl] = useState(project.boardUrl ?? '')
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(label); setError(null)
    try { await fn() } catch (e) { setError((e as Error).message) } finally { setBusy(null) }
  }

  const importBoard = () => run('Importing board…', async () => {
    const { boardUrl, pins } = await api.importBoard(url)
    const known = new Set(project.pins.map((p) => p.id))
    setProject({ ...project, boardUrl, pins: [...project.pins, ...pins.filter((p) => !known.has(p.id))] })
  })

  const uploadImages = (files: FileList) => run('Uploading…', async () => {
    const added: Pin[] = []
    for (const file of Array.from(files)) {
      const { url } = await api.upload(file, file.name)
      added.push({ id: crypto.randomUUID(), imageUrl: url, title: file.name })
    }
    setProject({ ...project, pins: [...project.pins, ...added] })
  })

  // Analyse every pin that has no shot yet, three at a time.
  const analyzeAll = () => run('Analysing pins with Claude…', async () => {
    const todo = project.pins.filter((p) => !project.shots.some((s) => s.pinId === p.id))
    const shots: Shot[] = [...project.shots]
    let next = 0
    const worker = async () => {
      while (next < todo.length) {
        const pin = todo[next++]
        const analysis = await api.analyze(pin.imageUrl)
        shots.push({ ...analysis, id: crypto.randomUUID(), pinId: pin.id, number: 0, notes: '' })
        setBusy(`Analysing pins with Claude… ${shots.length - project.shots.length}/${todo.length}`)
      }
    }
    await Promise.all([worker(), worker(), worker()])
    // Keep shots in board order.
    const order = new Map(project.pins.map((p, i) => [p.id, i]))
    shots.sort((a, b) => (order.get(a.pinId) ?? 0) - (order.get(b.pinId) ?? 0))
    setProject({ ...project, shots: shots.map((s, i) => ({ ...s, number: i + 1 })) })
    goToShots()
  })

  const pending = project.pins.filter((p) => !project.shots.some((s) => s.pinId === p.id)).length

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input className="min-w-80 flex-1 rounded border px-2 py-1" placeholder="Pinterest board link (public), e.g. https://pin.it/…" value={url} onChange={(e) => setUrl(e.target.value)} />
        <button disabled={!url || !!busy} onClick={importBoard} className="rounded bg-black px-3 py-1 text-white disabled:opacity-40">Import board</button>
        <label className="cursor-pointer rounded bg-neutral-200 px-3 py-1">
          Upload images
          <input type="file" accept="image/*" multiple hidden onChange={(e) => e.target.files && uploadImages(e.target.files)} />
        </label>
        <button disabled={!pending || !!busy} onClick={analyzeAll} className="rounded bg-emerald-600 px-3 py-1 text-white disabled:opacity-40">
          Analyse {pending} pin{pending === 1 ? '' : 's'}
        </button>
      </div>
      {busy && <p className="text-sm text-neutral-600">{busy}</p>}
      {error && <p className="rounded bg-red-100 p-2 text-sm text-red-800">{error}</p>}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
        {project.pins.map((pin) => {
          const shot = project.shots.find((s) => s.pinId === pin.id)
          return (
            <figure key={pin.id} className="relative overflow-hidden rounded border">
              <img src={pin.imageUrl} alt={pin.title ?? ''} className="aspect-[3/4] w-full object-cover" loading="lazy" />
              {shot && <figcaption className="absolute left-1 top-1 rounded bg-black/70 px-1.5 text-xs text-white">#{shot.number} {shot.size}</figcaption>}
              <button
                className="absolute right-1 top-1 rounded bg-white/80 px-1.5 text-xs"
                onClick={() => setProject({ ...project, pins: project.pins.filter((p) => p.id !== pin.id), shots: project.shots.filter((s) => s.pinId !== pin.id) })}
              >✕</button>
            </figure>
          )
        })}
      </div>
      {!project.pins.length && <p className="text-neutral-500">Import a board or upload reference images to get started.</p>}
    </div>
  )
}

import { useState } from 'react'
import type { Diagram, DiagramElement, FloorPlan, Project } from '../../shared/types'
import { DiagramCanvas } from '../components/DiagramCanvas'
import { api } from '../lib/api'
import { imageSize, pdfFirstPageToPng } from '../lib/pdf'

type Props = { project: Project; setProject: (p: Project) => void }
type Kind = DiagramElement['kind']

export function PlansPage({ project, setProject }: Props) {
  const [planId, setPlanId] = useState<string | null>(project.floorPlans[0]?.id ?? null)
  const [shotId, setShotId] = useState<string>('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [drawingMoveId, setDrawingMoveId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const plan = project.floorPlans.find((p) => p.id === planId) ?? null
  const shot = project.shots.find((s) => s.id === shotId)
  const diagram = plan ? project.diagrams.find((d) => d.floorPlanId === plan.id && (d.shotId ?? '') === shotId) : undefined
  const elements = diagram?.elements ?? []
  const selected = elements.find((e) => e.id === selectedId)

  const uploadPlan = async (file: File) => {
    setError(null)
    try {
      let blob: Blob = file, name = file.name, width: number, height: number
      if (file.type === 'application/pdf') {
        const r = await pdfFirstPageToPng(file)
        blob = r.blob; width = r.width; height = r.height; name = file.name.replace(/\.pdf$/i, '.png')
      } else {
        ;({ width, height } = await imageSize(URL.createObjectURL(file)))
      }
      const { url } = await api.upload(blob, name)
      const fp: FloorPlan = { id: crypto.randomUUID(), name: file.name, imageUrl: url, width, height }
      setProject({ ...project, floorPlans: [...project.floorPlans, fp] })
      setPlanId(fp.id)
    } catch (e) { setError((e as Error).message) }
  }

  const setElements = (next: DiagramElement[]) => {
    if (!plan) return
    const others = project.diagrams.filter((d) => d !== diagram)
    const d: Diagram = diagram ?? { id: crypto.randomUUID(), floorPlanId: plan.id, shotId: shotId || undefined, elements: [] }
    setProject({ ...project, diagrams: [...others, { ...d, elements: next }] })
  }

  const add = (kind: Kind) => {
    const id = crypto.randomUUID()
    const n = elements.filter((e) => e.kind === kind).length + 1
    const base = { id, x: 0.5, y: 0.5 }
    const el: DiagramElement =
      kind === 'camera' ? { ...base, kind, rotation: 0, fov: 50, label: `Cam ${String.fromCharCode(64 + n)}` }
      : kind === 'subject' ? { ...base, kind, rotation: 0, label: `Talent ${n}` }
      : kind === 'light' ? { ...base, kind, rotation: 0, label: `Light ${n}` }
      : kind === 'prop' ? { ...base, kind, label: `Prop ${n}` }
      : { id, kind, points: [], label: `Move ${n}` }
    setElements([...elements, el])
    setSelectedId(id)
    if (kind === 'move') setDrawingMoveId(id)
  }

  const patch = (id: string, p: Record<string, unknown>) => setElements(elements.map((e) => (e.id === id ? ({ ...e, ...p } as DiagramElement) : e)))

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="cursor-pointer rounded bg-black px-3 py-1 text-white">
          Upload floor plan (image or PDF)
          <input type="file" accept="image/*,application/pdf" hidden onChange={(e) => e.target.files?.[0] && uploadPlan(e.target.files[0])} />
        </label>
        <select className="rounded border px-2 py-1" value={planId ?? ''} onChange={(e) => { setPlanId(e.target.value); setSelectedId(null) }}>
          {!project.floorPlans.length && <option value="">No floor plans yet</option>}
          {project.floorPlans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select className="rounded border px-2 py-1" value={shotId} onChange={(e) => { setShotId(e.target.value); setSelectedId(null) }}>
          <option value="">General layout</option>
          {project.shots.map((s) => <option key={s.id} value={s.id}>Shot {s.number}: {s.size} {s.subject}</option>)}
        </select>
        {error && <span className="text-sm text-red-700">{error}</span>}
      </div>

      {plan && (
        <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
          <DiagramCanvas plan={plan} elements={elements} selectedId={selectedId} drawingMoveId={drawingMoveId} onSelect={setSelectedId} onChange={setElements} />
          <aside className="space-y-3">
            {shot && (
              <div className="rounded border p-2 text-sm">
                <img src={project.pins.find((p) => p.id === shot.pinId)?.imageUrl} className="mb-1 w-full rounded" />
                <b>{shot.size} · {shot.angle} · {shot.movement}</b><br />{shot.subject}: {shot.action}
              </div>
            )}
            <div className="flex flex-wrap gap-1">
              {(['camera', 'subject', 'light', 'prop', 'move'] as Kind[]).map((k) => (
                <button key={k} onClick={() => add(k)} className="rounded bg-neutral-200 px-2 py-1 text-sm capitalize">+ {k === 'move' ? 'camera move' : k}</button>
              ))}
            </div>
            {drawingMoveId && <button onClick={() => setDrawingMoveId(null)} className="w-full rounded bg-emerald-600 px-2 py-1 text-white">Done drawing move (click plan to add points)</button>}
            {selected && (
              <div className="space-y-2 rounded border p-2 text-sm">
                <input className="w-full rounded border px-1" value={selected.label} onChange={(e) => patch(selected.id, { label: e.target.value })} />
                {'rotation' in selected && (
                  <label className="block">Rotation {Math.round(selected.rotation)}°
                    <input type="range" min={-180} max={180} className="w-full" value={selected.rotation} onChange={(e) => patch(selected.id, { rotation: Number(e.target.value) })} />
                  </label>
                )}
                {selected.kind === 'camera' && (
                  <label className="block">Field of view {selected.fov}°
                    <input type="range" min={10} max={120} className="w-full" value={selected.fov} onChange={(e) => patch(selected.id, { fov: Number(e.target.value) })} />
                  </label>
                )}
                {selected.kind === 'move' && <button onClick={() => setDrawingMoveId(selected.id)} className="rounded bg-neutral-200 px-2 py-1">Add more points</button>}
                <button onClick={() => { setElements(elements.filter((e) => e.id !== selected.id)); setSelectedId(null) }} className="rounded bg-red-100 px-2 py-1 text-red-800">Delete</button>
              </div>
            )}
          </aside>
        </div>
      )}
      {!plan && <p className="text-neutral-500">Upload a floor plan to start placing cameras, talent, lights and moves.</p>}
    </div>
  )
}

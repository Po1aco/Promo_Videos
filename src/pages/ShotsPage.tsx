import { Angles, Movements, ShotSizes, type Project, type Shot } from '../../shared/types'

type Props = { project: Project; setProject: (p: Project) => void }

const csvCell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`

export function ShotsPage({ project, setProject }: Props) {
  const edit = (id: string, patch: Partial<Shot>) =>
    setProject({ ...project, shots: project.shots.map((s) => (s.id === id ? { ...s, ...patch } : s)) })

  const downloadCsv = () => {
    const head = ['#', 'Size', 'Angle', 'Movement', 'Focal mm', 'Subject', 'Action', 'Lighting', 'Props', 'Location', 'Edit idea', 'Notes']
    const rows = project.shots.map((s) => [s.number, s.size, s.angle, s.movement, s.focalLengthMm, s.subject, s.action, s.lighting, s.props.join('; '), s.locationType, s.editIdea, s.notes])
    const csv = [head, ...rows].map((r) => r.map(csvCell).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `${project.name}-shot-list.csv`
    a.click()
  }

  if (!project.shots.length) return <p className="text-neutral-500">No shots yet. Go to Board, import pins and press Analyse.</p>

  const select = <T extends string>(value: T, options: readonly T[], onChange: (v: T) => void) => (
    <select className="rounded border px-1" value={value} onChange={(e) => onChange(e.target.value as T)}>
      {options.map((o) => <option key={o}>{o}</option>)}
    </select>
  )

  return (
    <div className="space-y-3">
      <button onClick={downloadCsv} className="rounded bg-neutral-200 px-3 py-1">Download CSV</button>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead><tr className="border-b text-xs uppercase text-neutral-500">
            <th className="p-1">#</th><th>Ref</th><th>Size</th><th>Angle</th><th>Move</th><th>mm</th><th>Subject / action</th><th>Lighting</th><th>Edit idea</th><th>Notes</th>
          </tr></thead>
          <tbody>
            {project.shots.map((s) => {
              const pin = project.pins.find((p) => p.id === s.pinId)
              return (
                <tr key={s.id} className="border-b align-top">
                  <td className="p-1 font-bold">{s.number}</td>
                  <td>{pin && <img src={pin.imageUrl} className="h-20 rounded" />}</td>
                  <td>{select(s.size, ShotSizes, (v) => edit(s.id, { size: v }))}</td>
                  <td>{select(s.angle, Angles, (v) => edit(s.id, { angle: v }))}</td>
                  <td>{select(s.movement, Movements, (v) => edit(s.id, { movement: v }))}</td>
                  <td>{s.focalLengthMm}</td>
                  <td className="max-w-64"><b>{s.subject}</b><br />{s.action}</td>
                  <td className="max-w-48">{s.lighting}</td>
                  <td className="max-w-56">{s.editIdea}</td>
                  <td><input className="w-40 rounded border px-1" value={s.notes} onChange={(e) => edit(s.id, { notes: e.target.value })} /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

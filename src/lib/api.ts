import { ProjectSchema, type Pin, type Project, type ShotAnalysis } from '../../shared/types'

async function json<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((body as { error?: string }).error ?? `Request failed (${res.status})`)
  return body as T
}

export const api = {
  health: () => fetch('/api/health').then((r) => json<{ ok: boolean; hasApiKey: boolean }>(r)),
  loadProject: () => fetch('/api/project').then(async (r) => ProjectSchema.parse(await json(r))),
  saveProject: (p: Project) =>
    fetch('/api/project', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(p) }).then((r) => json(r)),
  upload: async (file: Blob, name: string) => {
    const form = new FormData()
    form.append('file', file, name)
    return json<{ url: string }>(await fetch('/api/upload', { method: 'POST', body: form }))
  },
  importBoard: (url: string) =>
    fetch('/api/pinterest/import', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url }) }).then((r) =>
      json<{ boardUrl: string; pins: Pin[] }>(r),
    ),
  analyze: (imageUrl: string) =>
    fetch('/api/analyze', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ imageUrl }) }).then((r) =>
      json<ShotAnalysis>(r),
    ),
}

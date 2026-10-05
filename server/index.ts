import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { z } from 'zod'
import { ProjectSchema } from '../shared/types.ts'
import { analyzeShot, type ImageInput } from './lib/claude.ts'
import { importBoard } from './lib/pinterest.ts'
import { loadProject, saveProject, saveUpload, UPLOAD_DIR } from './lib/store.ts'

const app = new Hono()

app.onError((err, c) => {
  console.error(err)
  if (err instanceof z.ZodError) return c.json({ error: 'Invalid request: ' + err.issues.map((i) => i.message).join(', ') }, 400)
  return c.json({ error: err.message }, 500)
})

app.get('/api/health', (c) => c.json({ ok: true, hasApiKey: Boolean(process.env.ANTHROPIC_API_KEY) }))

// ----- project (saved as data/project.json) -----
app.get('/api/project', async (c) => c.json(await loadProject()))
app.put('/api/project', async (c) => {
  await saveProject(ProjectSchema.parse(await c.req.json()))
  return c.json({ ok: true })
})

// ----- uploads (pins, floor plans) -----
app.post('/api/upload', async (c) => {
  const body = await c.req.parseBody()
  const file = body.file
  if (!(file instanceof File)) return c.json({ error: 'No file received' }, 400)
  return c.json({ url: await saveUpload(file) })
})
app.use('/uploads/*', serveStatic({ root: './data' }))

// ----- Pinterest board import -----
app.post('/api/pinterest/import', async (c) => {
  const { url } = z.object({ url: z.string().url() }).parse(await c.req.json())
  return c.json(await importBoard(url))
})

// ----- Claude vision: one pin -> one shot breakdown -----
app.post('/api/analyze', async (c) => {
  if (!process.env.ANTHROPIC_API_KEY) return c.json({ error: 'ANTHROPIC_API_KEY is not set. Copy .env.example to .env and add your key, then restart.' }, 400)
  const { imageUrl } = z.object({ imageUrl: z.string() }).parse(await c.req.json())
  let image: ImageInput
  if (imageUrl.startsWith('/uploads/')) {
    const file = path.join(UPLOAD_DIR, path.basename(imageUrl))
    const ext = path.extname(file).toLowerCase()
    const mediaType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : ext === '.gif' ? 'image/gif' : 'image/jpeg'
    image = { type: 'base64', mediaType, data: (await readFile(file)).toString('base64') }
  } else {
    image = { type: 'url', url: imageUrl }
  }
  return c.json(await analyzeShot(image))
})

const port = Number(process.env.PORT ?? 8787)
serve({ fetch: app.fetch, port }, () => console.log(`API on http://localhost:${port}`))

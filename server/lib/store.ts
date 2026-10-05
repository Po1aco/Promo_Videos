import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { emptyProject, ProjectSchema, type Project } from '../../shared/types.ts'

export const DATA_DIR = path.resolve('data')
export const UPLOAD_DIR = path.join(DATA_DIR, 'uploads')
const PROJECT_FILE = path.join(DATA_DIR, 'project.json')

export async function loadProject(): Promise<Project> {
  try {
    return ProjectSchema.parse(JSON.parse(await readFile(PROJECT_FILE, 'utf8')))
  } catch {
    return emptyProject()
  }
}

export async function saveProject(project: Project) {
  await mkdir(DATA_DIR, { recursive: true })
  await writeFile(PROJECT_FILE, JSON.stringify(project, null, 2))
}

export async function saveUpload(file: File): Promise<string> {
  await mkdir(UPLOAD_DIR, { recursive: true })
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const name = `${Date.now().toString(36)}-${safe}`
  await writeFile(path.join(UPLOAD_DIR, name), Buffer.from(await file.arrayBuffer()))
  return `/uploads/${name}`
}

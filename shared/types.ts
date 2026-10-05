import { z } from 'zod'

// ---------- Pinterest pins ----------
export const PinSchema = z.object({
  id: z.string(),
  imageUrl: z.string(), // remote pin image or a local /uploads/... path
  title: z.string().optional(),
  sourceUrl: z.string().optional(),
})
export type Pin = z.infer<typeof PinSchema>

// ---------- Shot (what Claude extracts from a pin) ----------
export const ShotSizes = ['ECU', 'CU', 'MCU', 'MS', 'MWS', 'WS', 'EWS', 'OTS', 'POV', 'INSERT', 'AERIAL'] as const
export const Angles = ['eye-level', 'low', 'high', 'overhead', 'dutch', 'ground'] as const
export const Movements = [
  'static', 'pan', 'tilt', 'push-in', 'pull-out', 'tracking', 'handheld', 'orbit', 'crane', 'whip-pan', 'slider',
] as const

// Used as the structured-output schema for Claude, so keep every field required.
export const ShotAnalysisSchema = z.object({
  size: z.enum(ShotSizes).describe('Shot size: ECU extreme close-up, CU, MCU, MS medium, MWS, WS wide, EWS extreme wide, OTS over-the-shoulder, POV, INSERT detail shot, AERIAL'),
  angle: z.enum(Angles),
  movement: z.enum(Movements).describe('Most likely camera movement. Use "static" if a still frame gives no hint.'),
  focalLengthMm: z.number().describe('Estimated full-frame equivalent focal length in mm'),
  subject: z.string().describe('Who or what is in frame, in a few words'),
  action: z.string().describe('What is happening, one short sentence'),
  lighting: z.string().describe('Light direction, quality and mood in a few words'),
  props: z.array(z.string()).describe('Visible props or set pieces worth planning for'),
  locationType: z.enum(['interior', 'exterior', 'unclear']),
  editIdea: z.string().describe('One punchy idea for a fast-paced edit: overlay, sound effect or transition'),
})
export type ShotAnalysis = z.infer<typeof ShotAnalysisSchema>

export const ShotSchema = ShotAnalysisSchema.extend({
  id: z.string(),
  pinId: z.string(),
  number: z.number(),
  notes: z.string().default(''),
})
export type Shot = z.infer<typeof ShotSchema>

// ---------- Floor plans and scene diagrams ----------
export const FloorPlanSchema = z.object({
  id: z.string(),
  name: z.string(),
  imageUrl: z.string(), // /uploads/... path (PDFs are rendered to PNG in the browser first)
  width: z.number(),
  height: z.number(),
  pxPerMeter: z.number().optional(), // set when the user calibrates scale
})
export type FloorPlan = z.infer<typeof FloorPlanSchema>

// All positions are normalised 0..1 across the floor plan so they survive resizing.
const Pt = z.object({ x: z.number(), y: z.number() })
export const DiagramElementSchema = z.discriminatedUnion('kind', [
  z.object({ id: z.string(), kind: z.literal('camera'), x: z.number(), y: z.number(), rotation: z.number(), fov: z.number(), label: z.string() }),
  z.object({ id: z.string(), kind: z.literal('subject'), x: z.number(), y: z.number(), rotation: z.number(), label: z.string() }),
  z.object({ id: z.string(), kind: z.literal('light'), x: z.number(), y: z.number(), rotation: z.number(), label: z.string() }),
  z.object({ id: z.string(), kind: z.literal('prop'), x: z.number(), y: z.number(), label: z.string() }),
  z.object({ id: z.string(), kind: z.literal('move'), points: z.array(Pt), label: z.string() }),
])
export type DiagramElement = z.infer<typeof DiagramElementSchema>

export const DiagramSchema = z.object({
  id: z.string(),
  floorPlanId: z.string(),
  shotId: z.string().optional(),
  elements: z.array(DiagramElementSchema),
})
export type Diagram = z.infer<typeof DiagramSchema>

// ---------- Whole project (saved as data/project.json) ----------
export const ProjectSchema = z.object({
  name: z.string(),
  boardUrl: z.string().optional(),
  pins: z.array(PinSchema),
  shots: z.array(ShotSchema),
  floorPlans: z.array(FloorPlanSchema),
  diagrams: z.array(DiagramSchema),
})
export type Project = z.infer<typeof ProjectSchema>

export const emptyProject = (): Project => ({
  name: 'Untitled promo',
  pins: [],
  shots: [],
  floorPlans: [],
  diagrams: [],
})

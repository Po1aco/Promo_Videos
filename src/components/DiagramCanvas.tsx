import { useRef, useState } from 'react'
import type { DiagramElement, FloorPlan } from '../../shared/types'

type Props = {
  plan: FloorPlan
  elements: DiagramElement[]
  selectedId: string | null
  drawingMoveId: string | null // when set, clicks on the plan add points to this move arrow
  onSelect: (id: string | null) => void
  onChange: (elements: DiagramElement[]) => void
}

const COLORS = { camera: '#ef4444', subject: '#3b82f6', light: '#eab308', prop: '#a855f7', move: '#10b981' } as const

export function DiagramCanvas({ plan, elements, selectedId, drawingMoveId, onSelect, onChange }: Props) {
  const svg = useRef<SVGSVGElement>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const unit = Math.max(plan.width, plan.height) / 40 // symbol size scales with the plan

  // Convert a pointer position to 0..1 plan coordinates.
  const toPlan = (e: React.PointerEvent) => {
    const el = svg.current!
    const pt = el.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const p = pt.matrixTransform(el.getScreenCTM()!.inverse())
    return { x: Math.min(1, Math.max(0, p.x / plan.width)), y: Math.min(1, Math.max(0, p.y / plan.height)) }
  }

  const update = (id: string, patch: Partial<DiagramElement>) =>
    onChange(elements.map((el) => (el.id === id ? ({ ...el, ...patch } as DiagramElement) : el)))

  const onBackgroundDown = (e: React.PointerEvent) => {
    if (drawingMoveId) {
      const p = toPlan(e)
      onChange(elements.map((el) => (el.id === drawingMoveId && el.kind === 'move' ? { ...el, points: [...el.points, p] } : el)))
    } else {
      onSelect(null)
    }
  }

  const onMove = (e: React.PointerEvent) => {
    if (!dragId) return
    const el = elements.find((x) => x.id === dragId)
    if (!el || el.kind === 'move') return
    update(dragId, toPlan(e))
  }

  return (
    <svg
      ref={svg}
      viewBox={`0 0 ${plan.width} ${plan.height}`}
      className="w-full rounded border border-neutral-300 bg-white touch-none select-none"
      style={{ cursor: drawingMoveId ? 'crosshair' : 'default' }}
      onPointerMove={onMove}
      onPointerUp={() => setDragId(null)}
      onPointerLeave={() => setDragId(null)}
    >
      <image href={plan.imageUrl} width={plan.width} height={plan.height} onPointerDown={onBackgroundDown} />
      {elements.map((el) => {
        const sel = el.id === selectedId
        if (el.kind === 'move') {
          const pts = el.points.map((p) => `${p.x * plan.width},${p.y * plan.height}`).join(' ')
          return (
            <g key={el.id} onPointerDown={(e) => { e.stopPropagation(); if (!drawingMoveId) onSelect(el.id) }}>
              <marker id={`arrow-${el.id}`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6 z" fill={COLORS.move} />
              </marker>
              <polyline points={pts} fill="none" stroke={COLORS.move} strokeWidth={sel ? unit / 3 : unit / 4} strokeDasharray={`${unit / 2} ${unit / 3}`} markerEnd={`url(#arrow-${el.id})`} />
            </g>
          )
        }
        const cx = el.x * plan.width
        const cy = el.y * plan.height
        const rot = 'rotation' in el ? el.rotation : 0
        const color = COLORS[el.kind]
        return (
          <g
            key={el.id}
            transform={`translate(${cx} ${cy})`}
            style={{ cursor: 'grab' }}
            onPointerDown={(e) => {
              e.stopPropagation()
              onSelect(el.id)
              setDragId(el.id)
              ;(e.target as Element).setPointerCapture?.(e.pointerId)
            }}
          >
            <g transform={`rotate(${rot})`}>
              {el.kind === 'camera' && (
                <>
                  {/* field-of-view cone, pointing up at rotation 0 */}
                  <path
                    d={`M0,0 L${-Math.tan((el.fov / 2) * (Math.PI / 180)) * unit * 5},${-unit * 5} L${Math.tan((el.fov / 2) * (Math.PI / 180)) * unit * 5},${-unit * 5} Z`}
                    fill={color}
                    opacity={0.18}
                  />
                  <rect x={-unit * 0.6} y={-unit * 0.45} width={unit * 1.2} height={unit * 0.9} rx={unit * 0.15} fill={color} />
                  <path d={`M${-unit * 0.25},${-unit * 0.45} L0,${-unit * 0.95} L${unit * 0.25},${-unit * 0.45} Z`} fill={color} />
                </>
              )}
              {el.kind === 'subject' && (
                <>
                  <circle r={unit * 0.55} fill={color} />
                  <path d={`M${-unit * 0.3},${-unit * 0.5} L0,${-unit * 1.1} L${unit * 0.3},${-unit * 0.5} Z`} fill={color} />
                </>
              )}
              {el.kind === 'light' && (
                <>
                  <circle r={unit * 0.5} fill={color} />
                  <path d={`M0,${-unit * 0.6} L${-unit * 0.8},${-unit * 2} L${unit * 0.8},${-unit * 2} Z`} fill={color} opacity={0.25} />
                </>
              )}
              {el.kind === 'prop' && <rect x={-unit * 0.5} y={-unit * 0.5} width={unit} height={unit} fill={color} />}
            </g>
            {sel && <circle r={unit * 1.2} fill="none" stroke="#111" strokeWidth={unit / 8} strokeDasharray={`${unit / 4}`} />}
            <text y={unit * 1.9} textAnchor="middle" fontSize={unit * 0.8} fontWeight="600" fill="#111" stroke="#fff" strokeWidth={unit / 6} paintOrder="stroke">
              {el.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

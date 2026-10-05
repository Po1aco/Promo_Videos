# Promo Shot Planner

Goal: turn a Pinterest mood board into a shot list, then place those shots on real floor plans and
maps as scene diagrams (cameras, talent, lights, props, camera moves).

The user is a video editor (not a programmer) making fast-paced promo content: keep explanations
short, in plain language, with analogies. Shot ideas should favour punchy pacing, overlays and sound effects.

## How it works
1. **Board** tab: import a public Pinterest board (or upload images) -> pins.
2. **Analyse**: each pin goes to Claude vision (`server/lib/claude.ts`) and comes back as a structured
   `ShotAnalysis` (size, angle, movement, focal length, subject, lighting, props, edit idea).
3. **Shots** tab: editable shot list, CSV export.
4. **Plans** tab: upload floor plans (image or PDF; PDFs are rendered to PNG in the browser), then place
   camera/talent/light/prop/move elements per shot on an SVG canvas (`src/components/DiagramCanvas.tsx`).

## Layout
- `shared/types.ts`: zod schemas + types shared by server and web (single source of truth for the data model).
- `server/` (Hono on port 8787): `index.ts` routes, `lib/claude.ts`, `lib/pinterest.ts`, `lib/store.ts`.
- `src/`: React + Tailwind UI. Vite proxies `/api` and `/uploads` to the server.
- `data/` (git-ignored): `project.json` plus `uploads/`. Autosaved by the UI.

## Commands
- `npm install --legacy-peer-deps`, copy `.env.example` to `.env` and set `ANTHROPIC_API_KEY`
- `npm run dev` runs API + web; `npm run typecheck`; `npm run build`

## Conventions and gotchas
- Diagram positions are normalised 0..1 across the plan image so they survive resizing.
- Claude model defaults to `claude-opus-5-5` (override with `ANTHROPIC_MODEL`). Uses `messages.parse` with
  `zodOutputFormat`, so every field in `ShotAnalysisSchema` must stay required.
- Pinterest has no free public API. `lib/pinterest.ts` tries the board RSS then scrapes the page; it only
  gets the first batch of pins. Uploading images is the reliable fallback.
- Sandbox network note: pinterest.com, pin.it, i.pinimg.com and the shadcn registries were blocked in the
  Claude cloud environment, so Pinterest import has not been tested live there.

## Roadmap
- Export diagrams as PNG/PDF (needs the plan image inlined into the SVG).
- Scale calibration (draw a known distance) so camera distance and lens coverage are real.
- Handle CAD/SketchUp plans (convert to PDF/PNG first for now).
- Multi-board / multi-project support; drag to reorder shots; storyboard sheet export.
- Add shadcn/magicui parts once the registries are reachable.

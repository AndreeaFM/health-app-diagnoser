// Interactive SVG body map (front view).
// Each clickable region emits a canonical body-area id that matches the
// chip list in SymptomLogForm, so the map and the chips stay in sync.
const REGIONS = [
  { id: 'Head', el: 'circle', cx: 100, cy: 28, r: 22 },
  { id: 'Throat', el: 'rect', x: 92, y: 50, w: 16, h: 13, rx: 4 },
  { id: 'Shoulders', el: 'rect', x: 58, y: 62, w: 84, h: 12, rx: 6 },
  { id: 'Chest', el: 'rect', x: 70, y: 74, w: 60, h: 36, rx: 8 },
  { id: 'Arms', el: 'rect', x: 46, y: 74, w: 16, h: 78, rx: 8 },
  { id: 'Arms', el: 'rect', x: 138, y: 74, w: 16, h: 78, rx: 8, key: 'Arms-R' },
  { id: 'Stomach', el: 'rect', x: 72, y: 110, w: 56, h: 28, rx: 8 },
  { id: 'Abdomen', el: 'rect', x: 74, y: 138, w: 52, h: 26, rx: 8 },
  { id: 'Hips', el: 'rect', x: 70, y: 164, w: 60, h: 24, rx: 10 },
  { id: 'Legs', el: 'rect', x: 73, y: 188, w: 24, h: 112, rx: 10 },
  {
    id: 'Legs',
    el: 'rect',
    x: 103,
    y: 188,
    w: 24,
    h: 112,
    rx: 10,
    key: 'Legs-R',
  },
  // drawn on top of arms/legs so they remain individually clickable
  { id: 'Hands', el: 'circle', cx: 54, cy: 160, r: 10 },
  { id: 'Hands', el: 'circle', cx: 146, cy: 160, r: 10, key: 'Hands-R' },
  { id: 'Knees', el: 'circle', cx: 85, cy: 250, r: 12 },
  { id: 'Knees', el: 'circle', cx: 115, cy: 250, r: 12, key: 'Knees-R' },
  { id: 'Feet', el: 'rect', x: 71, y: 300, w: 26, h: 14, rx: 5 },
  {
    id: 'Feet',
    el: 'rect',
    x: 103,
    y: 300,
    w: 26,
    h: 14,
    rx: 5,
    key: 'Feet-R',
  },
]

export default function BodyMap({ selected = [], onToggle, dark = false }) {
  const sel = (id) => selected.includes(id)
  const fill = (id) => (sel(id) ? '#3B82F6' : dark ? '#374151' : '#e5e7eb')
  const stroke = (id) => (sel(id) ? '#1d4ed8' : dark ? '#4b5563' : '#cbd5e1')

  const common = (r) => ({
    fill: fill(r.id),
    stroke: stroke(r.id),
    strokeWidth: 1.5,
    opacity: sel(r.id) ? 1 : 0.7,
    onClick: () => onToggle(r.id),
    style: { cursor: 'pointer', transition: 'all 150ms' },
  })

  return (
    <div className="flex flex-col items-center gap-2">
      <svg
        width="190"
        height="330"
        viewBox="0 0 200 330"
        role="group"
        aria-label="Body map"
      >
        {REGIONS.map((r, i) =>
          r.el === 'circle' ? (
            <circle
              key={r.key || `${r.id}-${i}`}
              cx={r.cx}
              cy={r.cy}
              r={r.r}
              {...common(r)}
            >
              <title>{r.id}</title>
            </circle>
          ) : (
            <rect
              key={r.key || `${r.id}-${i}`}
              x={r.x}
              y={r.y}
              width={r.w}
              height={r.h}
              rx={r.rx}
              {...common(r)}
            >
              <title>{r.id}</title>
            </rect>
          ),
        )}
      </svg>
      <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
        Tap a region, or use the list below
      </p>
    </div>
  )
}

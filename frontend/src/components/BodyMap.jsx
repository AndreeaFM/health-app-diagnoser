// Interactive SVG body map
const CLICKABLE = [
  { id: 'Head', d: 'M100,20 a28,28 0 1,1 0,56 a28,28 0 1,1 0,-56' },
  { id: 'Throat', d: 'M88,76 L112,76 L115,96 L85,96 Z' },
  { id: 'Chest', d: 'M72,96 L128,96 L132,148 L68,148 Z' },
  { id: 'Stomach', d: 'M70,148 L130,148 L128,188 L72,188 Z' },
  { id: 'Limbs', d: 'M42,96 L68,96 L72,178 L44,178 Z', label: 'Left arm' },
  {
    id: 'Limbs',
    d: 'M132,96 L158,96 L156,178 L128,178 Z',
    label: 'Right arm',
    key: 'Limbs-R',
  },
  { id: 'Limbs', d: 'M72,188 L98,188 L96,272 L70,272 Z', label: 'Left leg' },
  {
    id: 'Limbs',
    d: 'M102,188 L128,188 L130,272 L104,272 Z',
    label: 'Right leg',
    key: 'Limbs-L',
  },
]

const LABELS = [
  { x: 100, y: 52, t: 'Head' },
  { x: 100, y: 88, t: 'Throat' },
  { x: 100, y: 125, t: 'Chest' },
  { x: 100, y: 170, t: 'Stomach' },
  { x: 55, y: 138, t: 'Arm' },
  { x: 145, y: 138, t: 'Arm' },
  { x: 84, y: 232, t: 'Leg' },
  { x: 116, y: 232, t: 'Leg' },
]

export default function BodyMap({ selected = [], onToggle, dark = false }) {
  const sel = (id) => selected.includes(id)

  return (
    <div className="flex flex-col items-center gap-3">
      <svg
        width="200"
        height="285"
        viewBox="0 0 200 285"
        className="cursor-pointer"
      >
        {CLICKABLE.map((a, i) => (
          <path
            key={a.key || `${a.id}-${i}`}
            d={a.d}
            fill={sel(a.id) ? '#3B82F6' : dark ? '#374151' : '#e5e7eb'}
            stroke={sel(a.id) ? '#1d4ed8' : dark ? '#4b5563' : '#d1d5db'}
            strokeWidth="1.5"
            opacity={sel(a.id) ? 1 : 0.65}
            onClick={() => onToggle(a.id)}
            className="transition-all duration-150 hover:opacity-90"
          />
        ))}
        {LABELS.map((l, i) => (
          <text
            key={i}
            x={l.x}
            y={l.y}
            textAnchor="middle"
            fontSize="8"
            fill={dark ? '#9ca3af' : '#6b7280'}
            pointerEvents="none"
          >
            {l.t}
          </text>
        ))}
      </svg>

      <div className="w-full">
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-2 text-center">
          Tap body or choose below
        </p>
        <div className="flex flex-wrap gap-2 justify-center">
          {['Back', 'Skin', 'Other'].map((area) => (
            <button
              key={area}
              type="button"
              onClick={() => onToggle(area)}
              className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                sel(area)
                  ? 'bg-blue-50 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700'
              }`}
            >
              {area}
            </button>
          ))}
        </div>
        {selected.length > 0 && (
          <p className="text-xs text-center mt-2 text-blue-600 dark:text-blue-400 font-medium">
            Selected: {[...new Set(selected)].join(', ')}
          </p>
        )}
      </div>
    </div>
  )
}

// Interactive body map — tap a region to select it
// Areas map to the same values as the chip selector

const AREAS = [
  {
    id: 'Head',
    label: 'Head',
    d: 'M 100 20 A 28 28 0 1 1 100 76 A 28 28 0 1 1 100 20 Z',
  },
  { id: 'Throat', label: 'Throat', d: 'M 88 76 L 112 76 L 115 95 L 85 95 Z' },
  { id: 'Chest', label: 'Chest', d: 'M 72 95 L 128 95 L 132 145 L 68 145 Z' },
  {
    id: 'Stomach',
    label: 'Stomach',
    d: 'M 70 145 L 130 145 L 128 185 L 72 185 Z',
  },
  {
    id: 'Back',
    label: 'Back',
    d: 'M 70 95 L 130 95 L 130 185 L 70 185 Z',
    hidden: true,
  },
  { id: 'Limbs', label: 'Arms', d: 'M 42 95 L 68 95 L 72 175 L 44 175 Z' },
  {
    id: 'Limbs',
    label: 'Arms R',
    d: 'M 132 95 L 158 95 L 156 175 L 128 175 Z',
    key: 'Limbs-R',
  },
  { id: 'Limbs', label: 'Legs', d: 'M 72 185 L 98 185 L 96 270 L 70 270 Z' },
  {
    id: 'Limbs',
    label: 'Legs R',
    d: 'M 102 185 L 128 185 L 130 270 L 104 270 Z',
    key: 'Limbs-L',
  },
  { id: 'Skin', label: 'Skin', hidden: true },
  { id: 'Other', label: 'Other', hidden: true },
]

const VISIBLE_AREAS = AREAS.filter((a) => !a.hidden && a.d)

export default function BodyMap({ selected = [], onToggle, dark = false }) {
  const isSelected = (id) => selected.includes(id)

  const getColor = (id) => {
    if (isSelected(id)) return '#3B82F6'
    return dark ? '#374151' : '#e5e7eb'
  }

  const getStroke = (id) => {
    if (isSelected(id)) return '#1d4ed8'
    return dark ? '#4b5563' : '#d1d5db'
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <svg
          width="200"
          height="290"
          viewBox="0 0 200 290"
          className="cursor-pointer"
        >
          {/* Body outline fill */}
          <ellipse
            cx="100"
            cy="48"
            rx="28"
            ry="28"
            fill={dark ? '#1f2937' : '#f9fafb'}
            stroke={dark ? '#374151' : '#e5e7eb'}
            strokeWidth="1"
          />
          <rect
            x="70"
            y="95"
            width="60"
            height="95"
            rx="4"
            fill={dark ? '#1f2937' : '#f9fafb'}
            stroke={dark ? '#374151' : '#e5e7eb'}
            strokeWidth="1"
          />

          {/* Clickable areas */}
          {VISIBLE_AREAS.map((area) => (
            <path
              key={area.key || area.id}
              d={area.d}
              fill={getColor(area.id)}
              stroke={getStroke(area.id)}
              strokeWidth="1.5"
              opacity={isSelected(area.id) ? 1 : 0.6}
              onClick={() => onToggle(area.id)}
              className="transition-all duration-150 hover:opacity-90"
              style={{ cursor: 'pointer' }}
            />
          ))}

          {/* Labels */}
          {[
            { x: 100, y: 52, label: 'Head' },
            { x: 100, y: 88, label: 'Throat' },
            { x: 100, y: 125, label: 'Chest' },
            { x: 100, y: 168, label: 'Stomach' },
            { x: 55, y: 138, label: 'Arms' },
            { x: 145, y: 138, label: 'Arms' },
            { x: 84, y: 232, label: 'Legs' },
            { x: 116, y: 232, label: 'Legs' },
          ].map((l, i) => (
            <text
              key={i}
              x={l.x}
              y={l.y}
              textAnchor="middle"
              fontSize="8"
              fill={dark ? '#9ca3af' : '#6b7280'}
              pointerEvents="none"
            >
              {l.label}
            </text>
          ))}
        </svg>
      </div>

      {/* Chip row for non-body areas + selected summary */}
      <div className="w-full">
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-2 text-center">
          Tap the body or select below
        </p>
        <div className="flex flex-wrap gap-2 justify-center">
          {['Back', 'Skin', 'Other'].map((area) => (
            <button
              key={area}
              type="button"
              onClick={() => onToggle(area)}
              className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                isSelected(area)
                  ? 'bg-blue-50 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300'
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

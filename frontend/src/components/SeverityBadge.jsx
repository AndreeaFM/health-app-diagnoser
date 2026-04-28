const MAP = {
  1: { label: 'Mild', cls: 'bg-green-100  text-green-800' },
  2: { label: 'Moderate', cls: 'bg-amber-100  text-amber-800' },
  3: { label: 'Severe', cls: 'bg-orange-100 text-orange-800' },
  4: { label: 'Very severe', cls: 'bg-red-100    text-red-800' },
}

export default function SeverityBadge({ severity }) {
  const s = MAP[severity] || {
    label: 'Unknown',
    cls: 'bg-gray-100 text-gray-600',
  }
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${s.cls}`}
    >
      {s.label}
    </span>
  )
}

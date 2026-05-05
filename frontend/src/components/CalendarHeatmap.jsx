const SEV_COLORS = {
  0: { light: '#f3f4f6', dark: '#1f2937', label: 'No data' },
  1: { light: '#bbf7d0', dark: '#14532d', label: 'Mild' },
  2: { light: '#fde68a', dark: '#78350f', label: 'Moderate' },
  3: { light: '#fed7aa', dark: '#7c2d12', label: 'Severe' },
  4: { light: '#fecaca', dark: '#7f1d1d', label: 'Very severe' },
}

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

function buildGrid(entries) {
  const avgMap = {}
  entries.forEach((e) => {
    const d = new Date(e.createdAt).toISOString().split('T')[0]
    if (!avgMap[d]) avgMap[d] = []
    avgMap[d].push(e.severity)
  })
  Object.keys(avgMap).forEach((d) => {
    const arr = avgMap[d]
    avgMap[d] = Math.round(arr.reduce((a, b) => a + b, 0) / arr.length)
  })

  const today = new Date()
  const start = new Date(today)
  start.setDate(start.getDate() - 7 * 12)
  start.setDate(start.getDate() - start.getDay())

  const weeks = []
  const cur = new Date(start)
  while (cur <= today) {
    const week = []
    for (let d = 0; d < 7; d++) {
      const dateStr = cur.toISOString().split('T')[0]
      week.push({
        date: dateStr,
        severity: cur > today ? null : avgMap[dateStr] ?? 0,
        month: cur.getMonth(),
        isFuture: cur > today,
      })
      cur.setDate(cur.getDate() + 1)
    }
    weeks.push(week)
  }
  return weeks
}

export default function CalendarHeatmap({ entries = [], dark = false }) {
  const weeks = buildGrid(entries)
  const cell = 14
  const gap = 3
  const padLeft = 28
  const padTop = 20
  const width = weeks.length * (cell + gap) + padLeft
  const height = 7 * (cell + gap) + padTop + 28

  // Month labels
  const monthLabels = []
  let lastMonth = null
  weeks.forEach((week, i) => {
    const d = week.find((d) => !d.isFuture)
    if (d && d.month !== lastMonth) {
      monthLabels.push({ col: i, label: MONTHS[d.month] })
      lastMonth = d.month
    }
  })

  return (
    <div className="overflow-x-auto">
      <svg width={width} height={height} style={{ display: 'block' }}>
        {monthLabels.map(({ col, label }) => (
          <text
            key={`${col}-${label}`}
            x={padLeft + col * (cell + gap)}
            y={12}
            fontSize={10}
            fill={dark ? '#9ca3af' : '#6b7280'}
          >
            {label}
          </text>
        ))}
        {['', 'Mon', '', 'Wed', '', 'Fri', ''].map((l, i) => (
          <text
            key={i}
            x={padLeft - 4}
            y={padTop + i * (cell + gap) + cell - 2}
            fontSize={9}
            fill={dark ? '#6b7280' : '#9ca3af'}
            textAnchor="end"
          >
            {l}
          </text>
        ))}
        {weeks.map((week, wi) =>
          week.map((day, di) => {
            if (day.isFuture || day.severity === null) return null
            const c = SEV_COLORS[day.severity] || SEV_COLORS[0]
            return (
              <g key={`${wi}-${di}`}>
                <rect
                  x={padLeft + wi * (cell + gap)}
                  y={padTop + di * (cell + gap)}
                  width={cell}
                  height={cell}
                  rx={3}
                  fill={dark ? c.dark : c.light}
                />
                <title>
                  {day.date} — {day.severity === 0 ? 'No entries' : c.label}
                </title>
              </g>
            )
          })
        )}
      </svg>
      <div className="flex items-center gap-2 mt-2 px-1">
        <span className="text-xs text-gray-400 dark:text-gray-500">Less</span>
        {[0, 1, 2, 3, 4].map((s) => (
          <div
            key={s}
            style={{
              background: dark ? SEV_COLORS[s].dark : SEV_COLORS[s].light,
            }}
            className="w-3.5 h-3.5 rounded-sm"
            title={SEV_COLORS[s].label}
          />
        ))}
        <span className="text-xs text-gray-400 dark:text-gray-500">
          More severe
        </span>
      </div>
    </div>
  )
}

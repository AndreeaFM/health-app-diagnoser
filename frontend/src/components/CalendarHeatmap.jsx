// Calendar heatmap — shows severity by day for the last 12 weeks
// Like GitHub's contribution graph but for health

const SEV_COLORS = {
  0: { light: '#f3f4f6', dark: '#1f2937', label: 'No data' },
  1: { light: '#bbf7d0', dark: '#14532d', label: 'Mild' },
  2: { light: '#fde68a', dark: '#78350f', label: 'Moderate' },
  3: { light: '#fed7aa', dark: '#7c2d12', label: 'Severe' },
  4: { light: '#fecaca', dark: '#7f1d1d', label: 'Very severe' },
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
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
  // Build a map of date → avg severity
  const map = {}
  entries.forEach((e) => {
    const d = new Date(e.createdAt).toISOString().split('T')[0]
    if (!map[d]) map[d] = []
    map[d].push(e.severity)
  })
  const avgMap = {}
  Object.entries(map).forEach(([date, sevs]) => {
    avgMap[date] = Math.round(sevs.reduce((a, b) => a + b, 0) / sevs.length)
  })

  // Build 12 weeks of days ending today
  const today = new Date()
  const end = new Date(today)
  const start = new Date(today)
  start.setDate(start.getDate() - 7 * 12)

  // Align start to Sunday
  start.setDate(start.getDate() - start.getDay())

  const weeks = []
  let cur = new Date(start)

  while (cur <= end) {
    const week = []
    for (let d = 0; d < 7; d++) {
      const dateStr = cur.toISOString().split('T')[0]
      const isFuture = cur > today
      week.push({
        date: dateStr,
        severity: isFuture ? null : avgMap[dateStr] ?? 0,
        day: cur.getDay(),
        month: cur.getMonth(),
        dayOfMonth: cur.getDate(),
        isFuture,
      })
      cur.setDate(cur.getDate() + 1)
    }
    weeks.push(week)
  }
  return weeks
}

function buildMonthLabels(weeks) {
  const labels = []
  let lastMonth = null
  weeks.forEach((week, i) => {
    const firstDay = week.find((d) => !d.isFuture)
    if (firstDay && firstDay.month !== lastMonth) {
      labels.push({ col: i, label: MONTHS[firstDay.month] })
      lastMonth = firstDay.month
    }
  })
  return labels
}

export default function CalendarHeatmap({ entries = [], dark = false }) {
  const weeks = buildGrid(entries)
  const labels = buildMonthLabels(weeks)

  const cellSize = 14
  const gap = 3
  const padLeft = 28
  const padTop = 20

  const width = weeks.length * (cellSize + gap) + padLeft
  const height = 7 * (cellSize + gap) + padTop + 20

  return (
    <div className="overflow-x-auto">
      <svg width={width} height={height} style={{ display: 'block' }}>
        {/* Month labels */}
        {labels.map(({ col, label }) => (
          <text
            key={`${col}-${label}`}
            x={padLeft + col * (cellSize + gap)}
            y={12}
            fontSize={10}
            fill={dark ? '#9ca3af' : '#6b7280'}
          >
            {label}
          </text>
        ))}

        {/* Day labels */}
        {['', 'Mon', '', 'Wed', '', 'Fri', ''].map((label, i) => (
          <text
            key={i}
            x={padLeft - 4}
            y={padTop + i * (cellSize + gap) + cellSize - 2}
            fontSize={9}
            fill={dark ? '#6b7280' : '#9ca3af'}
            textAnchor="end"
          >
            {label}
          </text>
        ))}

        {/* Cells */}
        {weeks.map((week, wi) =>
          week.map((day, di) => {
            if (day.isFuture) return null
            const colors = SEV_COLORS[day.severity] || SEV_COLORS[0]
            const fill = dark ? colors.dark : colors.light
            const x = padLeft + wi * (cellSize + gap)
            const y = padTop + di * (cellSize + gap)

            return (
              <g key={`${wi}-${di}`}>
                <rect
                  x={x}
                  y={y}
                  width={cellSize}
                  height={cellSize}
                  rx={3}
                  fill={fill}
                />
                <title>
                  {day.date} —{' '}
                  {day.severity === 0
                    ? 'No entries'
                    : SEV_COLORS[day.severity]?.label}
                </title>
              </g>
            )
          })
        )}
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-2 mt-2 px-1">
        <span className="text-xs text-gray-400">Less</span>
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
        <span className="text-xs text-gray-400">More severe</span>
      </div>
    </div>
  )
}

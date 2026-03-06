/**
 * Circular progress ring.
 * Props: percent (0–100), size (px), stroke (px), label, sublabel
 */
export default function ProgressRing({
  percent = 0,
  size = 96,
  stroke = 8,
  label,
  sublabel,
}) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (percent / 100) * circ
  const color =
    percent >= 80 ? '#16a34a' : percent >= 50 ? '#2563eb' : percent >= 25 ? '#d97706' : '#dc2626'

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      {label && (
        <span className="text-sm font-bold text-gray-800" style={{ marginTop: -size * 0.65 + 'px', position: 'relative' }}>
          {label}
        </span>
      )}
      {sublabel && <span className="text-xs text-gray-500">{sublabel}</span>}
    </div>
  )
}

/**
 * Badge component — small coloured label.
 * variant: 'pending' | 'approved' | 'rejected' | 'info'
 */
export default function Badge({ label, variant = 'info' }) {
  const styles = {
    pending:  'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    info:     'bg-blue-100 text-blue-800',
  }
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[variant] ?? styles.info}`}>
      {label}
    </span>
  )
}

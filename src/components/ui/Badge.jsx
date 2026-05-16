// Reusable Badge component with color variants
const variantMap = {
  success: 'badge-success', warning: 'badge-warning', danger: 'badge-danger',
  info: 'badge-info', muted: 'badge-muted', purple: 'badge-purple',
  // Status aliases
  resolved: 'badge-success', flagged: 'badge-danger', review: 'badge-warning',
  active: 'badge-success', inactive: 'badge-muted', critical: 'badge-danger',
  high: 'badge-warning', medium: 'badge-info', low: 'badge-muted',
  delivered: 'badge-success', 'in-transit': 'badge-info', held: 'badge-warning',
  cancelled: 'badge-muted', positive: 'badge-success', negative: 'badge-danger', neutral: 'badge-muted',
};

export default function Badge({ children, variant = 'muted', dot = false }) {
  const cls = variantMap[variant] || variantMap[children?.toLowerCase()] || 'badge-muted';
  return (
    <span className={`badge ${cls}`}>
      {dot && <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />}
      {children}
    </span>
  );
}

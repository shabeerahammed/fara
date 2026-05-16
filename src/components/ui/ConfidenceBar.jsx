// Color-coded confidence bar based on score
export default function ConfidenceBar({ score, showLabel = true }) {
  const color =
    score >= 80 ? 'var(--accent-cyan)' :
    score >= 60 ? 'var(--accent-green)' :
    score >= 40 ? 'var(--accent-amber)' :
    'var(--accent-red)';

  const label =
    score >= 80 ? 'High' :
    score >= 60 ? 'Good' :
    score >= 40 ? 'Low' : 'Critical';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div className="confidence-bar-track" style={{ flex: 1, minWidth: 80 }}>
        <div className="confidence-bar-fill" style={{ width: `${score}%`, background: color }} />
      </div>
      {showLabel && (
        <span style={{ fontSize: 11, fontFamily: 'Inter, sans-serif', color, minWidth: 60 }}>
          {score}% <span style={{ color: 'var(--text-muted)' }}>{label}</span>
        </span>
      )}
    </div>
  );
}

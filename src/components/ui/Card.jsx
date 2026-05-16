// Reusable Card component with optional title/action header
export default function Card({ title, action, children, className = '', noPad = false }) {
  return (
    <div className={`card ${className}`}>
      {title && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'Inter, sans-serif' }}>
            {title}
          </h3>
          {action}
        </div>
      )}
      <div style={noPad ? { margin: '-20px' } : {}}>{children}</div>
    </div>
  );
}

import { motion } from 'framer-motion';

export default function Loader({ text = 'Loading...' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', gap: 16 }}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 32 }}>
        {[0, 1, 2, 3, 4].map(i => (
          <motion.div
            key={i}
            style={{ width: 4, background: 'var(--accent-cyan)', borderRadius: 2 }}
            animate={{ height: [12, 28, 12] }}
            transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.12 }}
          />
        ))}
      </div>
      <span style={{ color: 'var(--text-muted)', fontSize: 12, fontFamily: 'Inter, sans-serif' }}>{text}</span>
    </div>
  );
}

export function InlineLoader() {
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--accent-cyan)' }}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </div>
  );
}

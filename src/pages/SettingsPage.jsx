import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '../app/store';
import Card from '../components/ui/Card';

function Toggle({ value, onChange }) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
        background: value ? 'var(--accent-cyan)' : 'var(--border)',
        position: 'relative', transition: 'background 0.2s', flexShrink: 0,
        padding: 0,
      }}
    >
      <motion.div
        animate={{ x: value ? 22 : 2 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        style={{ width: 20, height: 20, borderRadius: '50%', background: 'white', position: 'absolute', top: 2 }}
      />
    </button>
  );
}

export default function SettingsPage() {
  const { user, setRole } = useAppStore();
  const [settings, setSettings] = useState({
    liveMonitoring: true, emailAlerts: true,
    autoEscalate: true, darkMode: true,
    confidenceThreshold: 35, refreshInterval: 5,
  });

  const set = (key, val) => setSettings(s => ({ ...s, [key]: val }));

  return (
    <div style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Settings</h2>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif', marginTop: 4 }}>
          System configuration &amp; preferences
        </p>
      </div>

      {/* Profile */}
      <Card title="User Profile">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 700, color: 'white',
          }}>{user.avatar}</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{user.name}</div>
            <div style={{ fontSize: 12, color: 'var(--accent-cyan)', fontFamily: 'Inter, sans-serif', textTransform: 'uppercase', marginTop: 2 }}>
              {user.role}
            </div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            {['admin', 'agent'].map(r => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={user.role === r ? 'btn-primary' : 'btn-ghost'}
                style={{ fontSize: 12, padding: '6px 14px' }}
              >
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* System Settings */}
      <Card title="System Settings">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {[
            { key: 'liveMonitoring', label: 'Live Monitoring', desc: 'Real-time call tracking and AI analysis' },
            { key: 'emailAlerts', label: 'Email Alerts', desc: 'Send email notifications for flagged calls' },
            { key: 'autoEscalate', label: 'Auto-Escalation', desc: 'Automatically escalate critical confidence calls' },
            { key: 'darkMode', label: 'Dark Mode', desc: 'Use dark theme (recommended)' },
          ].map((s, i) => (
            <motion.div
              key={s.key}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.06 }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 0',
                borderBottom: i < 3 ? '1px solid rgba(26,37,64,0.5)' : 'none',
              }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{s.label}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{s.desc}</div>
              </div>
              <Toggle value={settings[s.key]} onChange={v => set(s.key, v)} />
            </motion.div>
          ))}
        </div>
      </Card>

      {/* Threshold Settings */}
      <Card title="AI Thresholds">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {[
            { key: 'confidenceThreshold', label: 'Min. Confidence Score', min: 10, max: 90, unit: '%', desc: 'Calls below this confidence are flagged for human review' },
            { key: 'refreshInterval', label: 'Dashboard Refresh', min: 1, max: 60, unit: 's', desc: 'How often the dashboard data refreshes' },
          ].map(s => (
            <div key={s.key}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{s.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{s.desc}</div>
                </div>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 16, fontWeight: 700, color: 'var(--accent-cyan)' }}>
                  {settings[s.key]}{s.unit}
                </span>
              </div>
              <input
                type="range" min={s.min} max={s.max} value={settings[s.key]}
                onChange={e => set(s.key, Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent-cyan)', cursor: 'pointer' }}
              />
            </div>
          ))}
        </div>
      </Card>

      {/* Save */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button className="btn-ghost">Reset to Defaults</button>
        <button className="btn-primary">Save Changes</button>
      </div>
    </div>
  );
}

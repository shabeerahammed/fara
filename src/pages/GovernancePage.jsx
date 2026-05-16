import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldAlert, ShieldCheck, AlertTriangle, ToggleLeft, ToggleRight, Zap } from 'lucide-react';
import { apiService } from '../services/api';
import { mockCalls } from '../services/mockData';
import Badge from '../components/ui/Badge';
import Card from '../components/ui/Card';
import ConfidenceBar from '../components/ui/ConfidenceBar';
import Loader from '../components/ui/Loader';

const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
const severityColors = { critical: '#ef4444', high: '#f59e0b', medium: '#06b6d4', low: '#10b981' };

export default function GovernancePage() {
  const qc = useQueryClient();
  const [ruleSearch, setRuleSearch] = useState('');

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['rules'],
    queryFn: apiService.getRules,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }) => apiService.toggleRule(id, active),
    onSuccess: () => qc.invalidateQueries(['rules']),
  });

  const flaggedCalls = mockCalls.filter(c => c.status === 'flagged' || c.status === 'review');
  const sortedRules = [...rules]
    .filter(r => r.name.toLowerCase().includes(ruleSearch.toLowerCase()))
    .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  if (isLoading) return <Loader text="Loading governance data..." />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Summary row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {[
          { icon: ShieldAlert, label: 'Critical Rules', value: rules.filter(r => r.severity === 'critical').length, color: '#ef4444' },
          { icon: AlertTriangle, label: 'High Severity', value: rules.filter(r => r.severity === 'high').length, color: '#f59e0b' },
          { icon: ShieldCheck, label: 'Active Rules', value: rules.filter(r => r.active).length, color: '#10b981' },
          { icon: Zap, label: 'Total Triggered', value: rules.reduce((s, r) => s + r.triggered, 0), color: '#8b5cf6' },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            className="stat-card"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            style={{ borderTop: `2px solid ${s.color}` }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: `${s.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <s.icon size={18} color={s.color} />
              </div>
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)' }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif' }}>{s.label.toUpperCase()}</div>
          </motion.div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20 }}>

        {/* Rules List */}
        <Card title="AI Governance Rules" action={
          <input
            className="search-input"
            placeholder="Filter rules..."
            value={ruleSearch}
            onChange={e => setRuleSearch(e.target.value)}
            style={{ width: 180 }}
          />
        }>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sortedRules.map((rule, i) => (
              <motion.div
                key={rule.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                style={{
                  background: 'var(--bg-secondary)',
                  border: `1px solid ${rule.active ? 'var(--border)' : 'rgba(26,37,64,0.3)'}`,
                  borderLeft: `3px solid ${severityColors[rule.severity]}`,
                  borderRadius: 10, padding: '16px',
                  opacity: rule.active ? 1 : 0.55,
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: 'var(--text-muted)' }}>{rule.id}</span>
                      <Badge variant={rule.severity}>{rule.severity}</Badge>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{rule.name}</div>
                  </div>
                  <button
                    onClick={() => toggleMutation.mutate({ id: rule.id, active: !rule.active })}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: rule.active ? 'var(--accent-green)' : 'var(--text-muted)', padding: 0, display: 'flex' }}
                    title={rule.active ? 'Disable rule' : 'Enable rule'}
                  >
                    {rule.active ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif', marginBottom: 4 }}>TRIGGER</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{rule.trigger}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif', marginBottom: 4 }}>ACTION</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{rule.action}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: 11, fontFamily: 'Inter, sans-serif', color: 'var(--text-muted)' }}>
                    Triggered <span style={{ color: severityColors[rule.severity], fontWeight: 700 }}>{rule.triggered}x</span> this week
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </Card>

        {/* Flagged calls sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card title="Flagged Conversations">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {flaggedCalls.map((call, i) => (
                <motion.div
                  key={call.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  style={{
                    background: 'var(--bg-secondary)', borderRadius: 10,
                    padding: '14px', border: '1px solid var(--border)',
                    borderLeft: `2px solid ${call.status === 'flagged' ? 'var(--accent-red)' : 'var(--accent-amber)'}`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: 'var(--accent-cyan)' }}>{call.id}</span>
                    <Badge variant={call.status} dot>{call.status}</Badge>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{call.customer}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>{call.agent} • {call.topic}</div>
                  <ConfidenceBar score={call.confidence} />
                  {call.flags?.length > 0 && (
                    <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {call.flags.slice(0, 2).map(f => (
                        <span key={f} style={{
                          padding: '2px 7px', borderRadius: 3,
                          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                          fontSize: 10, color: '#ef4444', fontFamily: 'Inter, sans-serif',
                        }}>{f}</span>
                      ))}
                      {call.flags.length > 2 && (
                        <span style={{ padding: '2px 7px', fontSize: 10, color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif' }}>+{call.flags.length - 2} more</span>
                      )}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </Card>

          {/* AI Decision summary */}
          <Card title="AI Decision Summary">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'Auto-resolved', value: 89, color: 'var(--accent-green)', pct: 71 },
                { label: 'Flagged for Review', value: 27, color: 'var(--accent-amber)', pct: 22 },
                { label: 'Escalated', value: 9, color: 'var(--accent-red)', pct: 7 },
              ].map(item => (
                <div key={item.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                    <span style={{ color: item.color, fontFamily: 'Inter, sans-serif' }}>{item.value}</span>
                  </div>
                  <div className="confidence-bar-track">
                    <motion.div
                      className="confidence-bar-fill"
                      style={{ background: item.color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${item.pct}%` }}
                      transition={{ delay: 0.5, duration: 0.8 }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

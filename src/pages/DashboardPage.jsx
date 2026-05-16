import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, RadialBarChart, RadialBar
} from 'recharts';
import {
  Phone, AlertTriangle, Brain, CheckCircle2,
  Users, Clock, TrendingUp, TrendingDown, ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { apiService } from '../services/api';
import { mockChartData, mockCalls } from '../services/mockData';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import ConfidenceBar from '../components/ui/ConfidenceBar';
import Loader from '../components/ui/Loader';
import { useAppStore } from '../app/store';

// ─── Stat Card ──────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, delta, deltaLabel, color, index }) {
  return (
    <motion.div
      className="stat-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
      style={{ borderTop: `2px solid ${color}` }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: `${color}15`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={20} color={color} />
        </div>
        {delta !== undefined && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 500, color: delta >= 0 ? 'var(--accent-green)' : 'var(--accent-red)', fontFamily: 'Inter, sans-serif' }}>
            {delta >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {delta >= 0 ? '+' : ''}{delta}%
          </div>
        )}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1, marginBottom: 4 }}>
        {value}
      </div>
      <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif' }}>{label}</div>
      {deltaLabel && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>{deltaLabel}</div>
      )}
    </motion.div>
  );
}

// ─── Custom Tooltip ─────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 8, padding: '10px 14px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
    }}>
      <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 6, fontFamily: 'Inter, sans-serif' }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ fontSize: 13, fontWeight: 500, color: p.color, fontFamily: 'Inter, sans-serif' }}>
          {p.name}: <strong>{p.value}</strong>
        </div>
      ))}
    </div>
  );
}

// ─── Dashboard Page ──────────────────────────────────────────
export default function DashboardPage() {
  const navigate = useNavigate();
  const { addNotification, user } = useAppStore();
  const [liveStats, setLiveStats] = useState(null);
  const [ticker, setTicker] = useState(0);

  // Fetch stats via React Query
  const { data: stats, isLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: apiService.getStats,
    refetchInterval: 8000,
  });

  // Live simulation: every 5s add a tiny update
  useEffect(() => {
    const interval = setInterval(() => {
      setTicker(t => t + 1);
      setLiveStats(prev => ({
        totalCalls: (prev?.totalCalls || stats?.totalCalls || 1247) + Math.floor(Math.random() * 3),
        flaggedCalls: (prev?.flaggedCalls || stats?.flaggedCalls || 37) + (Math.random() > 0.8 ? 1 : 0),
        avgConfidence: Math.min(99, Math.max(60, (prev?.avgConfidence || 74) + (Math.random() > 0.5 ? 1 : -1))),
        resolvedToday: (prev?.resolvedToday || stats?.resolvedToday || 89) + (Math.random() > 0.6 ? 1 : 0),
        activeAgents: stats?.activeAgents || 12,
        pendingReview: stats?.pendingReview || 8,
      }));
    }, 5000);
    return () => clearInterval(interval);
  }, [stats]);

  // Occasionally push a live notification
  useEffect(() => {
    const interval = setInterval(() => {
      const msgs = [
        { type: 'warning', message: 'New flagged call detected — Agent Nina Alvarez' },
        { type: 'info', message: 'AI confidence improved to 89% on call C-009' },
        { type: 'danger', message: 'Low confidence call C-010 requires human review' },
      ];
      const rnd = msgs[Math.floor(Math.random() * msgs.length)];
      addNotification({ ...rnd, time: 'just now' });
    }, 18000);
    return () => clearInterval(interval);
  }, []);

  const display = liveStats || stats || { totalCalls: 1247, flaggedCalls: 37, avgConfidence: 74, resolvedToday: 89, activeAgents: 12, pendingReview: 8 };

  const statCards = [
    { icon: Phone, label: 'TOTAL CALLS TODAY', value: display.totalCalls?.toLocaleString(), delta: 12, deltaLabel: 'vs yesterday', color: '#06b6d4' },
    { icon: AlertTriangle, label: 'FLAGGED CALLS', value: display.flaggedCalls, delta: -3, deltaLabel: 'requires review', color: '#ef4444' },
    { icon: Brain, label: 'AVG AI CONFIDENCE', value: `${display.avgConfidence}%`, delta: 5, deltaLabel: 'model accuracy', color: '#8b5cf6' },
    { icon: CheckCircle2, label: 'RESOLVED TODAY', value: display.resolvedToday, delta: 8, deltaLabel: 'closed tickets', color: '#10b981' },
    { icon: Users, label: 'ACTIVE AGENTS', value: display.activeAgents, delta: undefined, deltaLabel: 'online now', color: '#f59e0b' },
    { icon: Clock, label: 'PENDING REVIEW', value: display.pendingReview, delta: undefined, deltaLabel: 'awaiting action', color: '#2563eb' },
  ];

  // Recent flagged calls
  const flaggedCalls = mockCalls.filter(c => c.status === 'flagged');

  if (isLoading && !liveStats) return <Loader text="Loading dashboard..." />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── WELCOME BANNER ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}
      >
        <div>
          <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>
            Good morning, {user.name.split(' ')[0]} 👋
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>
            AI governance system is <span style={{ color: 'var(--accent-green)' }}>operational</span>. {display.flaggedCalls} calls require your attention.
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="live-badge"><div className="live-dot" /> LIVE MONITORING</div>
          <span style={{ fontSize: 11, fontFamily: 'Inter, sans-serif', color: 'var(--text-muted)' }}>
            tick #{ticker}
          </span>
        </div>
      </motion.div>

      {/* ── STAT GRID ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
        {statCards.map((s, i) => <StatCard key={s.label} {...s} index={i} />)}
      </div>

      {/* ── CHARTS ROW ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Call Volume Chart */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          <Card title="Call Volume — Today" action={<span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif' }}>hourly</span>}>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={mockChartData.callVolume} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="callGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-muted)', fontFamily: 'Inter' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-muted)', fontFamily: 'Inter' }} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="calls" stroke="#2563eb" strokeWidth={2} fill="url(#callGradient)" name="Calls" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>

        {/* Weekly Flagged vs Resolved */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>
          <Card title="Weekly — Flagged vs Resolved" action={<span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif' }}>this week</span>}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={mockChartData.weeklyFlagged} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-muted)', fontFamily: 'Inter' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-muted)', fontFamily: 'Inter' }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="resolved" fill="#10b981" fillOpacity={0.7} radius={[3, 3, 0, 0]} name="Resolved" />
                <Bar dataKey="flagged" fill="#ef4444" fillOpacity={0.8} radius={[3, 3, 0, 0]} name="Flagged" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>
      </div>

      {/* ── BOTTOM ROW ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 16 }}>

        {/* Flagged calls quick list */}
        <Card
          title="Flagged Calls — Requires Action"
          action={
            <button
              className="btn-ghost"
              style={{ fontSize: 11, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4 }}
              onClick={() => navigate('/calls')}
            >
              View all <ArrowRight size={12} />
            </button>
          }
          noPad
        >
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th><th>Agent</th><th>Topic</th><th>Confidence</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {flaggedCalls.map((call, i) => (
                <motion.tr
                  key={call.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.07 }}
                  onClick={() => navigate('/calls')}
                  style={{ cursor: 'pointer' }}
                >
                  <td><span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: 'var(--accent-cyan)' }}>{call.id}</span></td>
                  <td style={{ color: 'var(--text-primary)' }}>{call.agent}</td>
                  <td>{call.topic}</td>
                  <td style={{ minWidth: 160 }}><ConfidenceBar score={call.confidence} /></td>
                  <td><Badge variant={call.status} dot>{call.status}</Badge></td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </Card>

        {/* Agent performance */}
        <Card title="Agent Performance">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {mockChartData.agentPerformance.map((a, i) => (
              <motion.div
                key={a.agent}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.08 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{a.agent}</span>
                  <span style={{ fontSize: 11, fontFamily: 'Inter, sans-serif', color: 'var(--text-muted)' }}>
                    {a.calls} calls
                  </span>
                </div>
                <ConfidenceBar score={a.score} />
              </motion.div>
            ))}

            {/* Mini summary stats */}
            <div style={{ marginTop: 8, paddingTop: 16, borderTop: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { label: 'Best Agent', value: 'James W.', color: 'var(--accent-green)' },
                { label: 'Needs Help', value: 'Nina A.', color: 'var(--accent-amber)' },
                { label: 'Avg Score', value: '77%', color: 'var(--accent-cyan)' },
                { label: 'Top Topic', value: 'Billing', color: 'var(--accent-purple)' },
              ].map(s => (
                <div key={s.label} style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif', marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

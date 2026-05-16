import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Play, Pause, SkipBack, SkipForward, Search, Filter, X, Volume2 } from 'lucide-react';
import { apiService } from '../services/api';
import Badge from '../components/ui/Badge';
import Card from '../components/ui/Card';
import ConfidenceBar from '../components/ui/ConfidenceBar';
import Loader from '../components/ui/Loader';
import Modal from '../components/ui/Modal';

// ─── Audio Player (UI mock) ──────────────────────────────────
function AudioPlayer({ call }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(80);

  const togglePlay = () => {
    setPlaying(p => !p);
    if (!playing) {
      const interval = setInterval(() => {
        setProgress(p => {
          if (p >= 100) { clearInterval(interval); setPlaying(false); return 0; }
          return p + 1;
        });
      }, 200);
    }
  };

  const bars = Array.from({ length: 40 }, (_, i) => ({
    height: Math.floor(Math.random() * 24) + 4,
    active: (i / 40) * 100 < progress,
  }));

  return (
    <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: '16px', border: '1px solid var(--border)' }}>
      {/* Waveform */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, height: 36, marginBottom: 12 }}>
        {bars.map((b, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: b.height,
              borderRadius: 2,
              background: b.active
                ? 'linear-gradient(180deg, var(--accent-cyan), var(--accent-blue))'
                : 'var(--border-bright)',
              transition: 'background 0.1s',
              animation: playing && Math.abs(i - (progress / 100) * 40) < 3 ? 'wave 0.4s infinite' : 'none',
            }}
          />
        ))}
      </div>

      {/* Progress */}
      <div
        className="audio-progress"
        style={{ marginBottom: 12, cursor: 'pointer' }}
        onClick={e => {
          const rect = e.currentTarget.getBoundingClientRect();
          setProgress(((e.clientX - rect.left) / rect.width) * 100);
        }}
      >
        <div className="audio-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, fontFamily: 'Inter, sans-serif', color: 'var(--text-muted)' }}>
          {Math.floor(progress * 0.0432)}:{String(Math.floor((progress * 0.0432 % 1) * 60)).padStart(2, '0')} / {call.duration}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4 }}>
            <SkipBack size={16} />
          </button>
          <button
            onClick={togglePlay}
            style={{
              width: 36, height: 36, borderRadius: '50%', border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-cyan))',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
            }}
          >
            {playing ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4 }}>
            <SkipForward size={16} />
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Volume2 size={13} color="var(--text-muted)" />
          <input type="range" min={0} max={100} value={volume} onChange={e => setVolume(e.target.value)}
            style={{ width: 60, accentColor: 'var(--accent-cyan)', cursor: 'pointer' }} />
        </div>
      </div>
    </div>
  );
}

// ─── Call Detail Modal ───────────────────────────────────────
function CallModal({ call, onClose }) {
  if (!call) return null;
  return (
    <Modal open={!!call} onClose={onClose} title={`Call ${call.id} — ${call.topic}`} width={680}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Meta */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { label: 'Agent', value: call.agent },
            { label: 'Customer', value: call.customer },
            { label: 'Duration', value: call.duration },
            { label: 'Time', value: call.time },
          ].map(m => (
            <div key={m.label} style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '12px 14px' }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif', marginBottom: 4 }}>{m.label.toUpperCase()}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{m.value}</div>
            </div>
          ))}
        </div>

        {/* Audio Player */}
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif', marginBottom: 8 }}>AUDIO PLAYBACK</div>
          <AudioPlayer call={call} />
        </div>

        {/* AI Summary */}
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif', marginBottom: 8 }}>AI SUMMARY</div>
          <div style={{
            background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.2)',
            borderRadius: 8, padding: '14px 16px',
            fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6,
          }}>
            {call.summary}
          </div>
        </div>

        {/* Confidence + Sentiment */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif', marginBottom: 8 }}>AI CONFIDENCE</div>
            <ConfidenceBar score={call.confidence} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif', marginBottom: 8 }}>SENTIMENT</div>
            <Badge variant={call.sentiment} dot>{call.sentiment}</Badge>
          </div>
        </div>

        {/* Flags */}
        {call.flags?.length > 0 && (
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif', marginBottom: 8 }}>FLAGS TRIGGERED</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {call.flags.map(f => (
                <span key={f} style={{
                  padding: '3px 10px', borderRadius: 4,
                  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
                  fontSize: 11, color: '#ef4444', fontFamily: 'Inter, sans-serif',
                }}>
                  {f}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Transcript */}
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif', marginBottom: 8 }}>TRANSCRIPT</div>
          <div className="transcript-box">
            {call.transcript.split('\n').map((line, i) => {
              const isAgent = line.startsWith('Agent:');
              return (
                <div key={i} style={{ marginBottom: 6, color: isAgent ? 'var(--accent-cyan)' : 'var(--text-secondary)' }}>
                  {line}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ─── Call Logs Page ──────────────────────────────────────────
export default function CallLogsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedCall, setSelectedCall] = useState(null);

  const { data: calls = [], isLoading } = useQuery({
    queryKey: ['calls', search, statusFilter],
    queryFn: () => apiService.getCalls({ search, status: statusFilter }),
  });

  const statusOptions = ['all', 'flagged', 'resolved', 'review'];

  if (isLoading) return <Loader text="Loading call logs..." />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header + Filters */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Call Logs</h2>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif', marginTop: 2 }}>
            {calls.length} records
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              className="search-input"
              placeholder="Search calls..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 32 }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, display: 'flex' }}>
                <X size={13} />
              </button>
            )}
          </div>
          <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            {statusOptions.map(s => <option key={s} value={s}>{s === 'all' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <Card noPad>
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th><th>Agent</th><th>Customer</th><th>Topic</th>
              <th>Duration</th><th>Confidence</th><th>Sentiment</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {calls.map((call, i) => (
              <motion.tr
                key={call.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => setSelectedCall(call)}
                style={{ cursor: 'pointer' }}
              >
                <td><span style={{ fontFamily: 'Inter, sans-serif', color: 'var(--accent-cyan)', fontSize: 12 }}>{call.id}</span></td>
                <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{call.agent}</td>
                <td>{call.customer}</td>
                <td>{call.topic}</td>
                <td><span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12 }}>{call.duration}</span></td>
                <td style={{ minWidth: 160 }}><ConfidenceBar score={call.confidence} /></td>
                <td><Badge variant={call.sentiment} dot>{call.sentiment}</Badge></td>
                <td><Badge variant={call.status} dot>{call.status}</Badge></td>
              </motion.tr>
            ))}
          </tbody>
        </table>
        {calls.length === 0 && (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, fontFamily: 'Inter, sans-serif' }}>
            No calls match your filters
          </div>
        )}
      </Card>

      {/* Call Detail Modal */}
      <CallModal call={selectedCall} onClose={() => setSelectedCall(null)} />
    </div>
  );
}

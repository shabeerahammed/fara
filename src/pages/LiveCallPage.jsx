import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Phone, Activity, AlertTriangle, Bot, Zap, RefreshCw } from 'lucide-react';
import { socketService } from '../services/socket';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import ConfidenceBar from '../components/ui/ConfidenceBar';

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const OLLAMA_URL = import.meta.env.VITE_OLLAMA_URL ?? 'http://localhost:11434/api/generate';
const OLLAMA_MODEL = import.meta.env.VITE_OLLAMA_MODEL ?? 'llama3.2';
const ANALYSIS_INTERVAL = 5000; // ms between Ollama polls

// ─── ACTION META ──────────────────────────────────────────────────────────────
const ACTION_CONFIG = {
  ISSUE_REFUND: { label: 'Process Quick Refund', color: '#185FA5' },
  OFFER_RETENTION: { label: 'Send 20% Loyalty Offer', color: '#854F0B' },
  ESCALATE: { label: 'Escalate to Manager', color: '#A32D2D' },
  EMPATHIZE: { label: 'Log Empathy Interaction', color: '#993556' },
  PROVIDE_INFO: { label: 'Pull Account Info', color: '#3B6D11' },
  NONE: { label: 'No Action Required', color: '#5F5E5A' },
};

// ─── OLLAMA HELPERS ───────────────────────────────────────────────────────────
function buildPrompt(transcript) {
  return `You are a call center compliance AI. Analyze this transcript and respond ONLY with valid JSON — no markdown, no extra text.

Transcript: "${transcript}"

JSON schema:
{
  "intent": "REFUND_REQUEST"|"CANCELLATION"|"COMPLAINT"|"INQUIRY"|"BILLING"|"TECHNICAL"|"OTHER",
  "sentiment": "POSITIVE"|"NEUTRAL"|"NEGATIVE"|"VERY_NEGATIVE",
  "confidence": <0.0–1.0>,
  "summary": "<1–2 sentences>",
  "flags": ["PROFANITY"|"HIGH_URGENCY"|"ESCALATION_NEEDED"|"LEGAL_THREAT"|"POLICY_VIOLATION"],
  "agentScript": "<what the agent should say next>",
  "agentAction": "ISSUE_REFUND"|"OFFER_RETENTION"|"ESCALATE"|"EMPATHIZE"|"PROVIDE_INFO"|"NONE"
}`;
}

async function queryOllama(transcript) {
  try {
    const res = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: OLLAMA_MODEL, prompt: buildPrompt(transcript), stream: false }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const match = (data.response ?? '').match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : null;
  } catch {
    return null;
  }
}

// Keyword fallback — only used when Ollama is unreachable
function mockAnalysis(transcript) {
  const t = transcript.toLowerCase();
  if (t.includes('refund') || t.includes('money back'))
    return { intent: 'REFUND_REQUEST', sentiment: 'NEGATIVE', confidence: 0.91, summary: 'Customer requesting a refund.', flags: ['HIGH_URGENCY'], agentScript: "I completely understand — let me process that refund right now.", agentAction: 'ISSUE_REFUND' };
  if (t.includes('cancel'))
    return { intent: 'CANCELLATION', sentiment: 'NEGATIVE', confidence: 0.85, summary: 'Customer considering cancellation.', flags: [], agentScript: "Before you go, I'd love to offer you an exclusive 20% loyalty discount.", agentAction: 'OFFER_RETENTION' };
  if (t.includes('angry') || t.includes('unacceptable') || t.includes('terrible'))
    return { intent: 'COMPLAINT', sentiment: 'VERY_NEGATIVE', confidence: 0.88, summary: 'Customer expressing strong dissatisfaction.', flags: ['HIGH_URGENCY', 'ESCALATION_NEEDED'], agentScript: "I sincerely apologize — let me escalate this immediately.", agentAction: 'ESCALATE' };
  return { intent: 'INQUIRY', sentiment: 'NEUTRAL', confidence: 0.78, summary: 'Customer making a general inquiry.', flags: [], agentScript: "Of course! Let me look into that for you right away.", agentAction: 'PROVIDE_INFO' };
}

// ─── SMALL ATOMS ─────────────────────────────────────────────────────────────

function RecordingDot({ active }) {
  return (
    <span style={{
      display: 'inline-block', width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
      background: active ? '#ef4444' : 'var(--border-bright)',
      animation: active ? 'pulse 2s infinite' : 'none',
    }} />
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', color: 'var(--text-secondary)', marginBottom: 10 }}>
      {children}
    </div>
  );
}

// ─── AGENT ASSIST PANEL ───────────────────────────────────────────────────────
function AgentAssistPanel({ analysis, isAnalyzing, ollamaStatus, onAction }) {
  const [actionLogged, setActionLogged] = useState(null);
  useEffect(() => { setActionLogged(null); }, [analysis]);

  if (isAnalyzing) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '18px 0' }}>
      <RefreshCw size={15} color="var(--text-muted)" style={{ animation: 'spin 1s linear infinite' }} />
      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Analyzing with {OLLAMA_MODEL}…</span>
    </div>
  );

  if (!analysis) return (
    <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>
      Awaiting transcript data…
    </p>
  );

  const action = ACTION_CONFIG[analysis.agentAction] ?? ACTION_CONFIG.NONE;
  const isOk = ollamaStatus === 'ok';

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={analysis.agentAction + analysis.sentiment}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
      >
        {/* Ollama connection pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: isOk ? '#639922' : '#BA7517', flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {isOk ? `Ollama · ${OLLAMA_MODEL}` : 'Demo mode — Ollama not detected'}
          </span>
        </div>

        {/* AI Summary */}
        {analysis.summary && (
          <div style={{
            background: 'var(--bg-secondary)', borderRadius: 6, padding: '9px 11px',
            fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6,
            borderLeft: '3px solid var(--accent-blue)',
          }}>
            {analysis.summary}
          </div>
        )}

        {/* Suggested script */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 5 }}>
            SUGGESTED SCRIPT
          </div>
          <div style={{
            background: 'var(--bg-secondary)', borderRadius: 6, padding: '9px 11px',
            fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.7,
            fontStyle: 'italic', borderLeft: '3px solid #639922',
          }}>
            "{analysis.agentScript}"
          </div>
        </div>

        {/* Action button */}
        {analysis.agentAction !== 'NONE' && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              setActionLogged(action.label);
              onAction(analysis.agentAction, analysis.intent);
            }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              padding: '9px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 600, transition: 'background 0.2s',
              background: actionLogged ? '#EAF3DE' : action.color,
              color: actionLogged ? '#3B6D11' : '#fff',
            }}
          >
            <Zap size={13} />
            {actionLogged ? `✓ ${actionLogged} logged` : action.label}
          </motion.button>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────
export default function LiveCallPage() {
  // Call state
  const [isRecording, setIsRecording] = useState(false);
  const [callId, setCallId] = useState(null);
  // Content state
  const [transcript, setTranscript] = useState('');
  const [flags, setFlags] = useState([]);
  const [socketAnalysis, setSocketAnalysis] = useState(null); // backend Ollama via socket
  const [agentAnalysis, setAgentAnalysis] = useState(null); // frontend Ollama direct
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [ollamaStatus, setOllamaStatus] = useState('unknown');

  // Refs — never trigger re-renders
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const recognitionRef = useRef(null);
  const pollRef = useRef(null);
  const liveTranscript = useRef(''); // always current, no closure staleness

  // ── Ollama analysis runner ─────────────────────────────────────────────────
  const runAnalysis = useCallback(async (text) => {
    if (!text || text.length < 20) return;
    setIsAnalyzing(true);
    try {
      const result = await queryOllama(text);
      if (result) {
        setOllamaStatus('ok');
        setAgentAnalysis(result);
        result.flags?.forEach(f => setFlags(prev => [...new Set([...prev, f])]));
      } else {
        setOllamaStatus('mock');
        setAgentAnalysis(mockAnalysis(text));
      }
    } catch {
      setOllamaStatus('mock');
      setAgentAnalysis(mockAnalysis(text));
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  // ── Socket listeners ───────────────────────────────────────────────────────
  useEffect(() => {
    socketService.connect();

    socketService.socket.on('call:stream:transcript', ({ text }) => {
      // Backend transcript is fallback — prefer local SpeechRecognition
      if (!liveTranscript.current) {
        setTranscript(text);
        liveTranscript.current = text;
      }
    });
    socketService.socket.on('call:stream:analysis', (data) => setSocketAnalysis(data));
    socketService.socket.on('call:stream:flag', ({ flag }) =>
      setFlags(prev => [...new Set([...prev, flag])])
    );

    return () => {
      socketService.socket.off('call:stream:transcript');
      socketService.socket.off('call:stream:analysis');
      socketService.socket.off('call:stream:flag');
    };
  }, []);

  // ── Start call ─────────────────────────────────────────────────────────────
  const startCall = async () => {
    // Reset all content state first
    setTranscript('');
    setFlags([]);
    setSocketAnalysis(null);
    setAgentAnalysis(null);
    liveTranscript.current = '';

    const newCallId = `LIVE-${Date.now()}`;
    setCallId(newCallId);

    // 1. MediaRecorder → socket → backend Whisper pipeline
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = async ({ data }) => {
        if (data.size > 0)
          socketService.socket.emit('call:stream:audio', {
            callId: newCallId,
            audioChunk: await data.arrayBuffer(),
            mimeType: recorder.mimeType,
          });
      };
      // Emit end after final chunk — prevents race condition
      recorder.onstop = () => socketService.socket.emit('call:stream:end', { callId: newCallId });

      socketService.socket.emit('call:stream:start', { callId: newCallId });
      recorder.start(3000);
    } catch (err) {
      console.error('MediaRecorder failed:', err);
    }

    // 2. Web Speech API → local transcript for direct Ollama calls (Chrome/Edge)
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (SR) {
      const rec = new SR();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';
      rec.onresult = (event) => {
        const text = Array.from(event.results).map(r => r[0].transcript).join(' ').trim();
        setTranscript(text);
        liveTranscript.current = text;
      };
      rec.onerror = (e) => console.warn('SpeechRecognition:', e.error);
      rec.start();
      recognitionRef.current = rec;
    }

    // 3. Periodic Ollama analysis
    pollRef.current = setInterval(() => {
      if (liveTranscript.current.length > 20) runAnalysis(liveTranscript.current);
    }, ANALYSIS_INTERVAL);

    setIsRecording(true);
  };

  // ── End call ───────────────────────────────────────────────────────────────
  const endCall = () => {
    if (mediaRecorderRef.current?.state !== 'inactive') mediaRecorderRef.current.stop();
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;

    recognitionRef.current?.stop();
    recognitionRef.current = null;

    clearInterval(pollRef.current);
    runAnalysis(liveTranscript.current); // final analysis on end

    setIsRecording(false);
    setCallId(null);
  };

  // ── Action handler (lifted out of AgentAssistPanel for socket access) ──────
  const handleAction = useCallback((action, intent) => {
    socketService.socket.emit('call:action:taken', { action, intent, callId, timestamp: Date.now() });
  }, [callId]);

  // ── Cleanup on unmount ─────────────────────────────────────────────────────
  useEffect(() => () => {
    recognitionRef.current?.stop();
    clearInterval(pollRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
  }, []);

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1100, margin: '0 auto' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h2 style={{
            margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text-primary)',
            display: 'flex', alignItems: 'center', gap: 9,
          }}>
            Live Call Governance
            <Activity size={18} color={isRecording ? '#ef4444' : 'var(--text-muted)'} />
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
            Voice → Whisper → Ollama {OLLAMA_MODEL} → Agent Assist
          </p>
        </div>

        <button
          onClick={isRecording ? endCall : startCall}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
            padding: '10px 20px', borderRadius: 8, border: 'none',
            cursor: 'pointer', fontWeight: 600, fontSize: 14,
            background: isRecording ? '#ef4444' : 'var(--accent-blue)',
            color: '#fff',
            boxShadow: isRecording
              ? '0 4px 12px rgba(239,68,68,0.3)'
              : '0 4px 12px rgba(37,99,235,0.3)',
          }}
        >
          {isRecording ? <Phone size={16} /> : <Mic size={16} />}
          {isRecording ? 'End Call' : 'Start Live Call'}
        </button>
      </div>

      {/* ── Body: Transcript (left wide) + Right column ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>

        {/* LEFT — Transcript */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <RecordingDot active={isRecording} />
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', color: 'var(--text-secondary)' }}>
              LIVE TRANSCRIPT
            </span>
            {callId && (
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>· {callId}</span>
            )}
            {isRecording && (
              <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>
                Ollama every {ANALYSIS_INTERVAL / 1000}s
              </span>
            )}
          </div>

          <div style={{
            minHeight: 300, background: 'var(--bg-secondary)', borderRadius: 8,
            padding: 16, fontSize: 14, color: 'var(--text-primary)',
            lineHeight: 1.7, border: '1px solid var(--border)',
          }}>
            {transcript || (
              <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                {isRecording ? 'Listening…' : 'Click "Start Live Call" and begin speaking.'}
              </span>
            )}
          </div>
        </Card>

        {/* RIGHT — three stacked cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Governance Alerts */}
          <Card>
            <SectionLabel>GOVERNANCE ALERTS</SectionLabel>
            {flags.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {flags.map(flag => (
                  <motion.div
                    key={flag}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 10px', borderRadius: 6,
                      background: 'rgba(239,68,68,0.08)',
                      border: '1px solid rgba(239,68,68,0.25)',
                    }}
                  >
                    <AlertTriangle size={13} color="#ef4444" />
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#ef4444' }}>{flag}</span>
                  </motion.div>
                ))}
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>No issues detected.</p>
            )}
          </Card>

          {/* Real-time Analysis */}
          <Card>
            <SectionLabel>REAL-TIME ANALYSIS</SectionLabel>
            {socketAnalysis ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>INTENT</div>
                  <Badge variant={socketAnalysis.intent}>{socketAnalysis.intent}</Badge>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>SENTIMENT</div>
                  <Badge variant={socketAnalysis.sentiment} dot>{socketAnalysis.sentiment}</Badge>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>CONFIDENCE</div>
                  <ConfidenceBar score={socketAnalysis.confidence} />
                </div>
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>Awaiting data…</p>
            )}
          </Card>

          {/* Agent Assist */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <Bot size={13} color="var(--text-secondary)" />
              <SectionLabel style={{ marginBottom: 0 }}>AGENT ASSIST</SectionLabel>
            </div>
            <AgentAssistPanel
              analysis={agentAnalysis}
              isAnalyzing={isAnalyzing}
              ollamaStatus={ollamaStatus}
              onAction={handleAction}
            />
          </Card>

        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1);   opacity: 1; }
          50%       { transform: scale(1.5); opacity: 0.5; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
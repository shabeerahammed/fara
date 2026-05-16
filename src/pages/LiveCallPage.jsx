import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Phone, Activity, AlertTriangle, Bot, Zap, RefreshCw } from 'lucide-react';
import { socketService } from '../services/socket';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import ConfidenceBar from '../components/ui/ConfidenceBar';

// ─── OLLAMA CONFIG ────────────────────────────────────────────────────────────
const OLLAMA_URL = 'http://localhost:11434/api/generate';
const OLLAMA_MODEL = 'llama3.2';
const ANALYSIS_INTERVAL_MS = 5000; // re-analyze every 5 seconds

function buildAnalysisPrompt(transcript) {
  return `You are a call center compliance AI. Analyze this live call transcript and respond ONLY with a valid JSON object. No extra text, no markdown, no explanation.

Transcript: "${transcript}"

Respond with ONLY this JSON:
{
  "intent": "REFUND_REQUEST" | "CANCELLATION" | "COMPLAINT" | "INQUIRY" | "BILLING" | "TECHNICAL" | "OTHER",
  "sentiment": "POSITIVE" | "NEUTRAL" | "NEGATIVE" | "VERY_NEGATIVE",
  "confidence": <number 0.0 to 1.0>,
  "summary": "<1-2 sentence summary>",
  "flags": ["PROFANITY" | "HIGH_URGENCY" | "ESCALATION_NEEDED" | "LEGAL_THREAT" | "POLICY_VIOLATION"],
  "agentScript": "<suggested response for the agent to say next>",
  "agentAction": "ISSUE_REFUND" | "OFFER_RETENTION" | "ESCALATE" | "EMPATHIZE" | "PROVIDE_INFO" | "NONE"
}`;
}

async function queryOllama(transcript) {
  try {
    const res = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: buildAnalysisPrompt(transcript),
        stream: false,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const jsonMatch = (data.response || '').match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    return JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }
}

// Fallback mock when Ollama isn't reachable
function getMockAnalysis(transcript) {
  const t = transcript.toLowerCase();
  if (t.includes('refund') || t.includes('money back')) {
    return {
      intent: 'REFUND_REQUEST', sentiment: 'NEGATIVE', confidence: 0.91,
      summary: 'Customer requesting a refund for a recent purchase.',
      flags: ['HIGH_URGENCY'],
      agentScript: "I completely understand. Let me process that refund for you right now and ensure this doesn't happen again.",
      agentAction: 'ISSUE_REFUND',
    };
  }
  if (t.includes('cancel')) {
    return {
      intent: 'CANCELLATION', sentiment: 'NEGATIVE', confidence: 0.85,
      summary: 'Customer considering or requesting cancellation of their subscription.',
      flags: [],
      agentScript: "Before you go, I'd love to offer you an exclusive 20% loyalty discount as a thank you for being with us.",
      agentAction: 'OFFER_RETENTION',
    };
  }
  if (t.includes('angry') || t.includes('unacceptable') || t.includes('terrible')) {
    return {
      intent: 'COMPLAINT', sentiment: 'VERY_NEGATIVE', confidence: 0.88,
      summary: 'Customer expressing strong dissatisfaction.',
      flags: ['HIGH_URGENCY', 'ESCALATION_NEEDED'],
      agentScript: 'I hear you and I sincerely apologize. Your experience is not what we stand for. Let me escalate this right now.',
      agentAction: 'ESCALATE',
    };
  }
  return {
    intent: 'INQUIRY', sentiment: 'NEUTRAL', confidence: 0.78,
    summary: 'Customer making a general inquiry.',
    flags: [],
    agentScript: 'Of course! Let me look into that for you right away.',
    agentAction: 'PROVIDE_INFO',
  };
}

// ─── ACTION CONFIG ────────────────────────────────────────────────────────────
const ACTION_CONFIG = {
  ISSUE_REFUND:     { label: 'Process Quick Refund',    color: '#185FA5', bg: '#E6F1FB' },
  OFFER_RETENTION:  { label: 'Send 20% Loyalty Offer',  color: '#854F0B', bg: '#FAEEDA' },
  ESCALATE:         { label: 'Escalate to Manager',     color: '#A32D2D', bg: '#FCEBEB' },
  EMPATHIZE:        { label: 'Log Empathy Interaction', color: '#993556', bg: '#FBEAF0' },
  PROVIDE_INFO:     { label: 'Pull Account Info',       color: '#3B6D11', bg: '#EAF3DE' },
  NONE:             { label: 'No Action Required',      color: '#5F5E5A', bg: '#F1EFE8' },
};

// ─── AGENT ASSIST PANEL ───────────────────────────────────────────────────────
function AgentAssistPanel({ analysis, isAnalyzing, ollamaStatus }) {
  const [actionDone, setActionDone] = useState(null);

  // Reset action button when new analysis arrives
  useEffect(() => { setActionDone(null); }, [analysis]);

  if (isAnalyzing) {
    return (
      <div style={{ padding: '12px 0', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
        <RefreshCw size={16} color="var(--text-muted)" style={{ animation: 'spin 1s linear infinite' }} />
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Llama 3 is analyzing...</span>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>
        Awaiting transcript data...
      </div>
    );
  }

  const actionCfg = ACTION_CONFIG[analysis.agentAction] || ACTION_CONFIG.NONE;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={analysis.agentAction + analysis.sentiment}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
      >
        {/* Ollama status pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: ollamaStatus === 'ok' ? '#639922' : '#BA7517',
          }} />
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {ollamaStatus === 'ok' ? 'Ollama · Llama 3 connected' : 'Demo mode (Ollama not detected)'}
          </span>
        </div>

        {/* AI Summary */}
        {analysis.summary && (
          <div style={{
            background: 'var(--bg-secondary)', borderRadius: 6, padding: '10px 12px',
            fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6,
            borderLeft: '3px solid var(--accent-blue)',
          }}>
            {analysis.summary}
          </div>
        )}

        {/* Suggested Script */}
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 6, letterSpacing: '0.04em' }}>
            SUGGESTED SCRIPT
          </div>
          <div style={{
            background: 'var(--bg-secondary)', borderRadius: 6, padding: '10px 12px',
            fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.7,
            fontStyle: 'italic', borderLeft: '3px solid #639922',
          }}>
            "{analysis.agentScript}"
          </div>
        </div>

        {/* Action Button */}
        {analysis.agentAction !== 'NONE' && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              setActionDone(actionCfg.label);
              socketService.socket.emit('call:action:taken', {
                action: analysis.agentAction,
                intent: analysis.intent,
                timestamp: Date.now(),
              });
            }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '10px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: actionDone ? '#EAF3DE' : actionCfg.color,
              color: actionDone ? '#3B6D11' : 'white',
              fontSize: 13, fontWeight: 600, transition: 'background 0.2s',
            }}
          >
            <Zap size={14} />
            {actionDone ? `✓ ${actionDone} logged` : actionCfg.label}
          </motion.button>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function LiveCallPage() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [flags, setFlags] = useState([]);
  const [aiAnalysis, setAiAnalysis] = useState(null);       // from socket (existing)
  const [agentAnalysis, setAgentAnalysis] = useState(null); // from Ollama
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [ollamaStatus, setOllamaStatus] = useState('unknown');
  const [callId, setCallId] = useState(null);

  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const recognitionRef = useRef(null);
  const analyzeTimerRef = useRef(null);
  const latestTranscript = useRef('');

  // ── Ollama analysis ──
  const runOllamaAnalysis = useCallback(async (text) => {
    if (!text || text.length < 20) return;
    setIsAnalyzing(true);
    try {
      const result = await queryOllama(text);
      if (result) {
        setOllamaStatus('ok');
        setAgentAnalysis(result);
        // Also push ollama flags back into existing flag system
        if (result.flags?.length) {
          result.flags.forEach(f => {
            setFlags(prev => [...new Set([...prev, f])]);
          });
        }
      } else {
        setOllamaStatus('mock');
        setAgentAnalysis(getMockAnalysis(text));
      }
    } catch {
      setOllamaStatus('mock');
      setAgentAnalysis(getMockAnalysis(text));
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  // ── Socket setup (existing pattern preserved) ──
  useEffect(() => {
    socketService.connect();

    socketService.socket.on('call:stream:transcript', (data) => {
      // Only use the backend transcript if the local SpeechRecognition hasn't picked up anything yet,
      // or if the local recognition is unsupported.
      if (!recognitionRef.current || !latestTranscript.current) {
        setTranscript(data.text);
        latestTranscript.current = data.text;
      }
    });
    socketService.socket.on('call:stream:analysis', (data) => {
      setAiAnalysis(data);
    });
    socketService.socket.on('call:stream:flag', (data) => {
      setFlags(prev => [...new Set([...prev, data.flag])]);
    });

    return () => {
      socketService.socket.off('call:stream:transcript');
      socketService.socket.off('call:stream:analysis');
      socketService.socket.off('call:stream:flag');
    };
  }, []);

  // ── Start call ──
  const startCall = async () => {
    // --- Existing: MediaRecorder → socket audio stream ---
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const newCallId = `LIVE-${Date.now()}`;
      setCallId(newCallId);
      socketService.socket.emit('call:stream:start', { callId: newCallId });

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = async (e) => {
        if (e.data.size > 0) {
          const buffer = await e.data.arrayBuffer();
          socketService.socket.emit('call:stream:audio', {
            callId: newCallId,
            audioChunk: buffer,
            mimeType: mediaRecorder.mimeType,
          });
        }
      };

      mediaRecorder.onstop = () => {
        // Emit end only after final chunk is sent (fixes race condition)
        socketService.socket.emit('call:stream:end', { callId: newCallId });
      };

      mediaRecorder.start(3000);
    } catch (err) {
      console.error('MediaRecorder error:', err);
    }

    // --- New: Web Speech API → local transcript for Ollama ---
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        let full = '';
        for (let i = 0; i < event.results.length; i++) {
          full += event.results[i][0].transcript + ' ';
        }
        const trimmed = full.trim();
        // Only update local transcript if socket isn't providing one
        if (!latestTranscript.current) {
          setTranscript(trimmed);
        }
        latestTranscript.current = trimmed;
      };

      recognition.onerror = (e) => console.warn('SpeechRecognition error:', e.error);
      recognition.start();
      recognitionRef.current = recognition;
    } else {
      console.warn('SpeechRecognition not available — Ollama will use socket transcript only');
    }

    // --- Periodic Ollama analysis ---
    analyzeTimerRef.current = setInterval(() => {
      if (latestTranscript.current?.length > 20) {
        runOllamaAnalysis(latestTranscript.current);
      }
    }, ANALYSIS_INTERVAL_MS);

    setIsRecording(true);
    setTranscript('');
    setFlags([]);
    setAiAnalysis(null);
    setAgentAnalysis(null);
    latestTranscript.current = '';
  };

  // ── End call ──
  const endCall = () => {
    // Stop MediaRecorder (onstop will emit call:stream:end)
    if (mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current?.stop();
    }
    // Stop microphone
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;

    // Stop speech recognition
    recognitionRef.current?.stop();
    recognitionRef.current = null;

    // Stop Ollama polling; run one final analysis
    clearInterval(analyzeTimerRef.current);
    if (latestTranscript.current?.length > 20) {
      runOllamaAnalysis(latestTranscript.current);
    }

    setIsRecording(false);
    setCallId(null);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      clearInterval(analyzeTimerRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 900, margin: '0 auto' }}>

      {/* Header — unchanged from original */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}>
            Live Call Governance <Activity size={20} color={isRecording ? '#ef4444' : 'var(--text-muted)'} />
          </h2>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif', marginTop: 4 }}>
            Real-time voice → Ollama Llama 3 → Agent Assist
          </div>
        </div>

        <button
          onClick={isRecording ? endCall : startCall}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 20px', borderRadius: 8,
            border: 'none', cursor: 'pointer', fontWeight: 600,
            background: isRecording ? '#ef4444' : 'var(--accent-blue)',
            color: 'white',
            boxShadow: isRecording ? '0 4px 12px rgba(239,68,68,0.3)' : '0 4px 12px rgba(37,99,235,0.3)',
          }}
        >
          {isRecording ? <Phone size={18} /> : <Mic size={18} />}
          {isRecording ? 'End Call' : 'Start Live Call'}
        </button>
      </div>

      {/* 3-column grid: Transcript | Governance + Analysis | Agent Assist */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 20 }}>

        {/* Col 1: Live Transcript — unchanged */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: isRecording ? '#ef4444' : 'var(--border-bright)',
              animation: isRecording ? 'pulse 2s infinite' : 'none',
            }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
              LIVE TRANSCRIPT {callId ? `(${callId})` : ''}
            </span>
          </div>

          <div style={{
            minHeight: 300, background: 'var(--bg-secondary)', borderRadius: 8, padding: 16,
            fontFamily: 'Inter, sans-serif', fontSize: 14, color: 'var(--text-primary)',
            lineHeight: 1.6, border: '1px solid var(--border)',
          }}>
            {transcript ? transcript : (
              <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                {isRecording ? 'Listening...' : 'Click "Start Live Call" and begin speaking.'}
              </span>
            )}
          </div>

          {isRecording && (
            <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-muted)' }}>
              Ollama analysis runs every {ANALYSIS_INTERVAL_MS / 1000}s
            </div>
          )}
        </Card>

        {/* Col 2: Governance Alerts + Real-time Analysis — unchanged */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          <Card>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12 }}>
              GOVERNANCE ALERTS
            </div>
            {flags.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {flags.map(flag => (
                  <motion.div
                    key={flag}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    style={{
                      padding: 12, borderRadius: 6,
                      background: 'rgba(239,68,68,0.1)',
                      border: '1px solid rgba(239,68,68,0.3)',
                      display: 'flex', alignItems: 'center', gap: 8,
                    }}
                  >
                    <AlertTriangle size={16} color="#ef4444" />
                    <span style={{ fontSize: 13, color: '#ef4444', fontWeight: 600 }}>{flag}</span>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No compliance issues detected.</div>
            )}
          </Card>

          <Card>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12 }}>
              REAL-TIME ANALYSIS
            </div>
            {aiAnalysis ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>INTENT</div>
                  <Badge variant={aiAnalysis.intent}>{aiAnalysis.intent}</Badge>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>SENTIMENT</div>
                  <Badge variant={aiAnalysis.sentiment} dot>{aiAnalysis.sentiment}</Badge>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>CONFIDENCE</div>
                  <ConfidenceBar score={aiAnalysis.confidence} />
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Awaiting enough data...</div>
            )}
          </Card>

        </div>

        {/* Col 3: Agent Assist (NEW) */}
        <Card>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Bot size={14} />
            AGENT ASSIST
          </div>
          <AgentAssistPanel
            analysis={agentAnalysis}
            isAnalyzing={isAnalyzing}
            ollamaStatus={ollamaStatus}
          />
        </Card>

      </div>

      <style>{`
        @keyframes pulse {
          0%   { transform: scale(1);   opacity: 1; }
          50%  { transform: scale(1.5); opacity: 0.5; }
          100% { transform: scale(1);   opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

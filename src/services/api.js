import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper to map backend CallLog to frontend Call object
const mapCall = (backendCall) => ({
  id:         backendCall.call_id,
  agent:      backendCall.agent_id === 'UNASSIGNED' ? 'AI Agent' : backendCall.agent_id,
  customer:   backendCall.customer_id || 'Unknown',
  topic:      backendCall.ai_result?.intent || 'Review Needed',
  duration:   backendCall.duration_secs ? `${Math.floor(backendCall.duration_secs / 60)}:${String(backendCall.duration_secs % 60).padStart(2, '0')}` : '0:00',
  time:       new Date(backendCall.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  status:     backendCall.governance_result?.status?.toLowerCase() || 'review',
  confidence: backendCall.ai_result?.confidence || 0,
  sentiment:  backendCall.ai_result?.sentiment?.toLowerCase() || 'neutral',
  summary:    backendCall.ai_result?.summary || '',
  transcript: backendCall.governance_result?.masked_transcript || backendCall.transcript || '',
  flags:      backendCall.governance_result?.flags || [],
});

export const apiService = {
  // Dashboard stats
  getStats: async () => {
    const res = await api.get('/calls/stats');
    // Map backend response { summary, charts } to what DashboardPage expects
    const { summary, charts } = res.data.data;
    return {
      ...summary,
      charts, // including charts in the returned object so they can be used if needed
    };
  },

  // Calls
  getCalls: async (filters = {}) => {
    const params = {
      status:     filters.status !== 'all' ? filters.status?.toUpperCase() : undefined,
      search:     filters.search,
      page:       filters.page,
      limit:      filters.limit,
    };
    const res = await api.get('/calls/logs', { params });
    return res.data.data.logs.map(mapCall);
  },

  getCall: async (id) => {
    const res = await api.get(`/calls/${id}`);
    return mapCall(res.data.data);
  },

  // Trigger processing
  processCall: async (callId) => {
    const res = await api.post('/calls/process', { call_id: callId });
    return res.data;
  },

  // Governance rules (Mocked or from backend if added)
  getRules: async () => {
    // Backend doesn't have a rules endpoint yet, returning empty or mock
    return [];
  },

  toggleRule: async (id, active) => {
    return { id, active };
  },

  // Delivery orders
  getOrders: async (filters = {}) => {
    const res = await api.get('/delivery/orders', { params: filters });
    return (res.data.data.orders || []).map(o => {
      let mappedStatus = o.status.toLowerCase();
      if (mappedStatus === 'shipped') mappedStatus = 'in-transit';
      if (mappedStatus === 'pending') mappedStatus = o.flagged ? 'flagged' : 'held';
      if (mappedStatus === 'processing') mappedStatus = 'in-transit';
      
      return {
        id:       o.order_id,
        customer: o.customer_id || 'Unknown',
        items:    Array.isArray(o.items) ? o.items.length : o.items || 1,
        value:    o.notes?.match(/\$[\d,.]+/)?.[0] || '$0.00',
        carrier:  o.notes?.match(/(FedEx|UPS|USPS|Digital)/)?.[0] || 'Standard',
        tracking: o.order_id,
        eta:      'Pending',
        status:   mappedStatus,
        callRef:  o.call_id
      };
    });
  },

  updateOrderStatus: async (id, status) => {
    let backendStatus = status.toUpperCase();
    if (status === 'in-transit') backendStatus = 'SHIPPED';
    
    const res = await api.put('/delivery/update', { order_id: id, status: backendStatus });
    return res.data;
  },
};

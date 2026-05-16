// ============================================================
// MOCK DATA — AI Governance Call-to-Text Delivery System
// ============================================================

export const mockCalls = [
  {
    id: "C-001", agent: "Sarah Chen", customer: "Marcus Holley",
    duration: "4:32", time: "09:14 AM", status: "flagged",
    confidence: 42, sentiment: "negative", topic: "Refund Dispute",
    summary: "Customer demanded full refund for damaged item. Agent offered 50% which was rejected.",
    transcript: "Agent: Thank you for calling, how can I help?\nCustomer: I need a full refund for this broken product!\nAgent: I understand your frustration. Let me pull up your order...\nCustomer: This is unacceptable! I want my money back immediately.\nAgent: Our policy allows us to offer a 50% refund or replacement.\nCustomer: That's ridiculous. I'm filing a chargeback.",
    flags: ["hostile-language", "chargeback-threat"]
  },
  {
    id: "C-002", agent: "James Wright", customer: "Priya Patel",
    duration: "2:18", time: "09:47 AM", status: "resolved",
    confidence: 91, sentiment: "positive", topic: "Order Status",
    summary: "Customer inquired about delivery. Agent confirmed dispatch and ETA.",
    transcript: "Agent: Good morning! How can I assist?\nCustomer: Hi, I'm checking on order #88234.\nAgent: It was dispatched yesterday, arriving by Thursday.\nCustomer: Great, thank you so much!",
    flags: []
  },
  {
    id: "C-003", agent: "Nina Alvarez", customer: "Tom Reeves",
    duration: "7:11", time: "10:02 AM", status: "flagged",
    confidence: 31, sentiment: "negative", topic: "Billing Error",
    summary: "Double charge discovered. Agent escalated to billing team but customer became irate.",
    transcript: "Agent: Thank you for your patience. I see the billing discrepancy.\nCustomer: I've been charged twice! Fix it now!\nAgent: I'm escalating to our billing department immediately.\nCustomer: This is the third time this has happened. I want to speak to a manager!\nAgent: Of course, please hold.",
    flags: ["double-charge", "escalation-required", "repeat-complaint"]
  },
  {
    id: "C-004", agent: "Ryan Park", customer: "Lisa Monroe",
    duration: "3:44", time: "10:30 AM", status: "resolved",
    confidence: 88, sentiment: "neutral", topic: "Product Query",
    summary: "Customer asked about product compatibility. Agent provided accurate technical info.",
    transcript: "Agent: Hello! What can I help you with today?\nCustomer: Does your X500 model work with Android 14?\nAgent: Yes, it's fully compatible with Android 14 and above.\nCustomer: And the Bluetooth range?\nAgent: Up to 30 feet in open space.",
    flags: []
  },
  {
    id: "C-005", agent: "Sarah Chen", customer: "Derek Washington",
    duration: "9:05", time: "11:15 AM", status: "review",
    confidence: 67, sentiment: "neutral", topic: "Cancellation",
    summary: "Customer requested account cancellation. Agent attempted retention but failed.",
    transcript: "Agent: I'm sorry to hear you want to cancel. May I ask why?\nCustomer: I found a cheaper competitor.\nAgent: We can match their pricing with a loyalty discount.\nCustomer: I've already made my decision.\nAgent: Understood. Proceeding with cancellation.",
    flags: ["churn-risk", "retention-failed"]
  },
  {
    id: "C-006", agent: "James Wright", customer: "Angela Torres",
    duration: "1:55", time: "11:48 AM", status: "resolved",
    confidence: 95, sentiment: "positive", topic: "Compliment",
    summary: "Customer called to praise previous agent. Quick positive interaction.",
    transcript: "Agent: Thank you for calling!\nCustomer: I just wanted to say the rep who helped me last week was amazing.\nAgent: That's wonderful to hear! I'll pass along your feedback.\nCustomer: Please do. You all are the best!",
    flags: []
  },
  {
    id: "C-007", agent: "Nina Alvarez", customer: "Bryan Scott",
    duration: "12:33", time: "12:22 PM", status: "flagged",
    confidence: 18, sentiment: "negative", topic: "Legal Threat",
    summary: "Customer threatened legal action over product defect. High risk interaction.",
    transcript: "Agent: Thank you for your patience—\nCustomer: Don't thank me. My lawyer will be contacting you about this defective product.\nAgent: Sir, let me connect you with our customer relations team.\nCustomer: No. Tell your company to expect a lawsuit.",
    flags: ["legal-threat", "high-priority", "lawyer-mentioned"]
  },
  {
    id: "C-008", agent: "Ryan Park", customer: "Zoe Kim",
    duration: "5:20", time: "01:10 PM", status: "resolved",
    confidence: 82, sentiment: "positive", topic: "Upgrade",
    summary: "Customer upgraded subscription plan. Successful upsell.",
    transcript: "Agent: I see you're on our basic plan. We have some great options!\nCustomer: Oh? What's included in the premium?\nAgent: Unlimited storage, priority support, and advanced analytics.\nCustomer: That sounds perfect. Let's do it!",
    flags: []
  },
];

export const mockGovernanceRules = [
  { id: "R-001", name: "Legal Threat Detection", trigger: "keywords: lawyer, lawsuit, court, legal action", action: "Immediate escalation to compliance team", severity: "critical", active: true, triggered: 3 },
  { id: "R-002", name: "Chargeback Alert", trigger: "keywords: chargeback, dispute charge, credit card company", action: "Flag for billing supervisor review", severity: "high", active: true, triggered: 7 },
  { id: "R-003", name: "Repeat Complaint Rule", trigger: "Same customer ID, >2 complaints in 30 days", action: "Auto-assign to senior agent", severity: "medium", active: true, triggered: 12 },
  { id: "R-004", name: "Low Confidence Override", trigger: "AI confidence score < 35%", action: "Human review required before resolution", severity: "high", active: true, triggered: 5 },
  { id: "R-005", name: "Hostile Language Filter", trigger: "Profanity or abusive language detected", action: "Warn agent, log interaction", severity: "medium", active: true, triggered: 9 },
  { id: "R-006", name: "Retention Failure", trigger: "Customer cancellation attempt + failed retention", action: "Notify retention team within 1hr", severity: "medium", active: false, triggered: 4 },
];

export const mockDeliveryOrders = [
  { id: "ORD-8823", customer: "Marcus Holley", items: 2, value: "$149.99", carrier: "FedEx", tracking: "FX88234561", status: "flagged", eta: "Mar 20", zone: "Zone A", callRef: "C-001" },
  { id: "ORD-8824", customer: "Priya Patel", items: 1, value: "$39.00", carrier: "UPS", tracking: "1Z9823041", status: "delivered", eta: "Mar 17", zone: "Zone C", callRef: "C-002" },
  { id: "ORD-8825", customer: "Tom Reeves", items: 4, value: "$329.50", carrier: "USPS", tracking: "9400111899", status: "held", eta: "Pending", zone: "Zone B", callRef: "C-003" },
  { id: "ORD-8826", customer: "Lisa Monroe", items: 1, value: "$89.99", carrier: "FedEx", tracking: "FX00291834", status: "in-transit", eta: "Mar 19", zone: "Zone A", callRef: "C-004" },
  { id: "ORD-8827", customer: "Derek Washington", items: 3, value: "$219.00", carrier: "UPS", tracking: "1Z4491829", status: "cancelled", eta: "N/A", zone: "Zone D", callRef: "C-005" },
  { id: "ORD-8828", customer: "Bryan Scott", items: 2, value: "$499.00", carrier: "FedEx", tracking: "FX11223344", status: "flagged", eta: "Pending", zone: "Zone B", callRef: "C-007" },
  { id: "ORD-8829", customer: "Zoe Kim", items: 1, value: "$0.00", carrier: "Digital", tracking: "DIGITAL", status: "delivered", eta: "Instant", zone: "Zone E", callRef: "C-008" },
];

export const mockChartData = {
  callVolume: [
    { time: "6AM", calls: 12 }, { time: "7AM", calls: 28 }, { time: "8AM", calls: 45 },
    { time: "9AM", calls: 67 }, { time: "10AM", calls: 89 }, { time: "11AM", calls: 94 },
    { time: "12PM", calls: 72 }, { time: "1PM", calls: 68 }, { time: "2PM", calls: 81 },
    { time: "3PM", calls: 76 }, { time: "4PM", calls: 55 }, { time: "5PM", calls: 34 },
  ],
  confidenceDistribution: [
    { range: "0-20%", count: 8 }, { range: "20-40%", count: 14 },
    { range: "40-60%", count: 22 }, { range: "60-80%", count: 35 }, { range: "80-100%", count: 41 },
  ],
  weeklyFlagged: [
    { day: "Mon", flagged: 5, resolved: 38 }, { day: "Tue", flagged: 8, resolved: 42 },
    { day: "Wed", flagged: 3, resolved: 51 }, { day: "Thu", flagged: 11, resolved: 45 },
    { day: "Fri", flagged: 7, resolved: 39 }, { day: "Sat", flagged: 2, resolved: 18 },
    { day: "Sun", flagged: 1, resolved: 9 },
  ],
  agentPerformance: [
    { agent: "Sarah C.", score: 72, calls: 28 }, { agent: "James W.", score: 91, calls: 35 },
    { agent: "Nina A.", score: 58, calls: 22 }, { agent: "Ryan P.", score: 88, calls: 31 },
  ],
};

export const mockStats = {
  totalCalls: 1247, flaggedCalls: 37, avgConfidence: 74,
  resolvedToday: 89, activeAgents: 12, pendingReview: 8,
};

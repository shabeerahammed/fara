# GovAI Backend — AI Governance Call-to-Text Delivery System

Production-style Node.js/Express backend that processes customer call audio through a full AI pipeline:
**Upload → S3 → Transcribe → Bedrock NLP → Governance Engine → Delivery System**

---

## 🏗 Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js (Express.js) |
| Database | MongoDB (Mongoose ODM) |
| Audio Storage | AWS S3 |
| Speech-to-Text | AWS Transcribe |
| AI / NLP | Amazon Bedrock (Claude) |
| Real-time | Socket.io WebSockets |
| Logging | Winston (structured JSON) |
| Testing | Jest |

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env — set USE_MOCK_AWS=true to run without real AWS keys

# 3. Start MongoDB (local)
mongod --dbpath /data/db

# 4. Run in development
npm run dev

# 5. Run tests
npm test
```

Server starts on **http://localhost:5000**

---

## 📁 Folder Structure

```
backend/
├── app.js                          # Express app factory (routes + middleware)
├── server.js                       # HTTP server + Socket.io + MongoDB bootstrap
├── .env.example                    # Environment variable template
├── jest.config.js
└── src/
    ├── config/
    │   ├── index.js                # Typed config from env vars
    │   └── database.js             # Mongoose connection helper
    │
    ├── controllers/
    │   ├── callsController.js      # Upload, process, logs endpoints
    │   └── deliveryController.js   # Create/update/list orders
    │
    ├── routes/
    │   ├── calls.js                # POST /upload, POST /process, GET /logs
    │   ├── delivery.js             # POST /create, PUT /update, GET /orders
    │   └── health.js               # GET /health
    │
    ├── services/
    │   ├── s3Service.js            # S3 upload, presigned URL, delete
    │   ├── transcribeService.js    # AWS Transcribe + realistic mock
    │   ├── bedrockService.js       # Bedrock Claude NLP + mock
    │   ├── governanceService.js    # ← CORE: Rules engine + PII masking
    │   ├── pipelineService.js      # Async pipeline orchestrator
    │   └── deliveryService.js      # Webhook + DeliveryOrder persistence
    │
    ├── models/
    │   ├── CallLog.js              # Full call document schema
    │   └── DeliveryOrder.js        # Delivery order schema with history
    │
    ├── middleware/
    │   ├── errorHandler.js         # Global Express error handler
    │   ├── requestLogger.js        # Morgan → Winston HTTP logs
    │   └── rateLimiter.js          # express-rate-limit
    │
    ├── utils/
    │   ├── logger.js               # Winston logger (JSON in prod, colour in dev)
    │   ├── retry.js                # Exponential back-off retry wrapper
    │   └── apiResponse.js          # Standardised response helpers
    │
    └── __tests__/
        ├── setup.js                # Jest env setup
        ├── governanceService.test.js
        └── bedrockService.test.js
```

---

## 🌐 API Reference

### POST `/api/calls/upload`
Upload an audio file. Stores in S3 and creates a CallLog record.

**Request:** `multipart/form-data`
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| audio | File | ✅ | mp3, wav, m4a, ogg, webm (max 100MB) |
| agent_id | string | ❌ | Agent identifier |
| customer_id | string | ❌ | Customer identifier |
| auto_process | boolean | ❌ | Start pipeline immediately |

**Response:**
```json
{
  "success": true,
  "message": "Audio uploaded successfully",
  "data": {
    "call_id": "a1b2c3d4-...",
    "audio_url": "https://govai-call-audio.s3.amazonaws.com/audio/...",
    "audio_key": "audio/uuid-filename.mp3",
    "status": "QUEUED"
  }
}
```

---

### POST `/api/calls/process`
Trigger the full AI pipeline for an uploaded call (async).

**Request body:**
```json
{ "call_id": "a1b2c3d4-..." }
```

**Response:**
```json
{
  "success": true,
  "message": "Processing started",
  "data": {
    "call_id": "a1b2c3d4-...",
    "processing_status": "PROCESSING",
    "websocket_events": ["pipeline:start", "pipeline:stage", "pipeline:end"]
  }
}
```

---

### GET `/api/calls/logs`
Paginated call log list with optional filters.

**Query params:** `status`, `governance`, `agent_id`, `page`, `limit`

```
GET /api/calls/logs?governance=BLOCKED&page=1&limit=10
```

---

### GET `/api/calls/:callId`
Full detail for a single call including pipeline stage timeline.

---

### POST `/api/delivery/create`
Manually create a delivery order.

```json
{
  "call_id": "a1b2c3d4-...",
  "delivery_address": "45 Marina Tower, Dubai Marina",
  "contact_number": "050-123-4567",
  "notes": "Leave at reception"
}
```

---

### PUT `/api/delivery/update`
Update order status.

```json
{
  "order_id": "ORD-88234",
  "status": "SHIPPED",
  "updated_by": "agent_007",
  "note": "Dispatched via FedEx"
}
```

---

### GET `/health`
Service health check (DB connectivity, uptime, mode).

---

## ⚡ WebSocket Events

Connect with any Socket.io client on the server URL.

```javascript
const socket = io('http://localhost:5000');

// Subscribe to a specific call
socket.emit('subscribe:call', 'a1b2c3d4-...');

// Listen for pipeline progress
socket.on('pipeline:start',  data => console.log('Started:', data));
socket.on('pipeline:stage',  data => console.log('Stage:', data.stage, data.status));
socket.on('pipeline:end',    data => console.log('Done:', data));
```

**Event payloads:**
```
pipeline:stage  →  { callId, stage: 'TRANSCRIBE'|'AI_ANALYSIS'|'GOVERNANCE'|'DELIVERY', status: 'IN_PROGRESS'|'SUCCESS'|'FAILED'|'SKIPPED', data? }
pipeline:end    →  { callId, status: 'COMPLETED'|'FAILED', governance, intent }
```

---

## 🛡 Governance Engine

Located in `src/services/governanceService.js`.

### Rules applied (in order):

| Rule | Trigger | Penalty | Status Effect |
|------|---------|---------|---------------|
| LOW_CONFIDENCE | AI confidence < 80% | `(80-score) × 0.5` | REVIEW_REQUIRED |
| MISSING_ORDER_ID | Intent requires order but none found | 15 pts | REVIEW_REQUIRED |
| ABUSE_DETECTED | Profanity / abusive keywords found | 50 pts | **BLOCKED** |
| LEGAL_THREAT | Legal keywords (sue, lawsuit, lawyer…) | 30 pts | REVIEW_REQUIRED |
| UNKNOWN_INTENT | Intent is UNKNOWN / OTHER | 10 pts | REVIEW_REQUIRED |
| HIGH_URGENCY | Urgency = HIGH | 0 pts | Flag only |

### Output schema:
```json
{
  "status": "APPROVED | REVIEW_REQUIRED | BLOCKED",
  "governance_score": 85,
  "flags": ["LOW_CONFIDENCE", "MISSING_ORDER_ID"],
  "masked_transcript": "Call [PHONE REDACTED] or email [EMAIL REDACTED]"
}
```

---

## 🧠 Bedrock Prompt Format

The system prompt instructs Claude to return strict JSON:

```
You are a call-centre AI analyst.
Return ONLY valid JSON matching this schema:
{
  "intent": "CHANGE_ADDRESS | REFUND_REQUEST | DELIVERY_ENQUIRY | ...",
  "entities": { "order_id", "new_address", "phone", "email", "amount" },
  "summary": "2-3 sentence summary",
  "confidence": 0-100,
  "sentiment": "POSITIVE | NEUTRAL | NEGATIVE",
  "urgency": "LOW | MEDIUM | HIGH"
}
```

---

## 🔧 Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 5000 | HTTP port |
| MONGODB_URI | mongodb://localhost:27017/govai | MongoDB connection string |
| AWS_ACCESS_KEY_ID | — | AWS credentials |
| AWS_SECRET_ACCESS_KEY | — | AWS credentials |
| AWS_REGION | us-east-1 | AWS region |
| S3_BUCKET_NAME | govai-call-audio | S3 bucket name |
| BEDROCK_MODEL_ID | anthropic.claude-3-haiku-20240307-v1:0 | Bedrock model |
| CONFIDENCE_THRESHOLD | 80 | Min AI confidence before flag |
| USE_MOCK_AWS | true | `true` = no real AWS calls |
| DELIVERY_WEBHOOK_URL | http://localhost:4000/api/ingest | Delivery system URL |

---

## 🧪 Tests

```bash
npm test            # Run all tests
npm test -- --coverage  # With coverage report
```

Test files cover:
- Governance rules engine (all status decisions)
- PII masking patterns
- Bedrock mock intent/entity extraction
- Governance score calculation

---

## 🌍 AWS Setup (Production)

```bash
# 1. Create S3 bucket
aws s3 mb s3://govai-call-audio --region us-east-1

# 2. Enable Bedrock model access in AWS Console
#    → Amazon Bedrock → Model access → Enable Claude Haiku

# 3. Set env vars and flip USE_MOCK_AWS=false
```

Required IAM permissions:
```json
{
  "Effect": "Allow",
  "Action": [
    "s3:PutObject", "s3:GetObject", "s3:DeleteObject",
    "transcribe:StartTranscriptionJob", "transcribe:GetTranscriptionJob",
    "bedrock:InvokeModel"
  ],
  "Resource": "*"
}
```

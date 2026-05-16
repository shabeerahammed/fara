# GovAI — AI Governance Call-to-Text Delivery System

A production-ready React dashboard for AI-powered call center governance.

## 🚀 Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:5173

## 🏗 Tech Stack

| Tool | Purpose |
|------|---------|
| React 18 + Vite | Frontend framework |
| Tailwind CSS v4 | Utility-first styling |
| Zustand | Global state (auth, UI, notifications) |
| React Query | Server state & caching |
| Recharts | Dashboard charts |
| Framer Motion | Animations |
| React Router v6 | Client-side routing |
| Lucide React | Icon library |

## 📁 Folder Structure

```
src/
├── app/
│   ├── router.jsx        # Route definitions
│   └── store.js          # Zustand global store
├── components/
│   └── ui/
│       ├── Badge.jsx     # Status indicator badge
│       ├── Card.jsx      # Container card
│       ├── ConfidenceBar.jsx  # Color-coded AI confidence bar
│       ├── Loader.jsx    # Animated loading states
│       ├── Modal.jsx     # Animated modal dialog
│       └── Table.jsx     # Reusable data table
├── layouts/
│   ├── MainLayout.jsx    # Page shell with sidebar + navbar
│   ├── Navbar.jsx        # Top navigation with notifications
│   └── Sidebar.jsx       # Collapsible side navigation
├── pages/
│   ├── DashboardPage.jsx # Main dashboard (fully implemented)
│   ├── CallLogsPage.jsx  # Call list + audio player + transcript modal
│   ├── GovernancePage.jsx # AI rules + flagged calls panel
│   ├── DeliveryPage.jsx  # Order management
│   └── SettingsPage.jsx  # System config
├── services/
│   ├── api.js            # API service layer (mock async)
│   └── mockData.js       # All mock data
└── index.css             # Global styles + CSS variables
```

## 🎨 Features

- **Dashboard**: Live stats, call volume chart, weekly flagged/resolved chart, agent performance
- **Call Logs**: Searchable/filterable table, mock audio player with waveform, AI summary, transcript
- **Governance Panel**: Toggle-able rules, confidence scoring, flagged conversations list
- **Delivery Panel**: Order management with status updates
- **Settings**: Toggle preferences, AI threshold sliders, role switcher
- **Role-based UI**: Switch between Admin and Agent roles
- **Live simulation**: Stats update every 5 seconds, notifications push every 18 seconds
- **Collapsible Sidebar**: Animates between full and icon-only mode

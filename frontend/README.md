# Cybersecurity Threat Intelligence Platform — Frontend Dashboard

A modern, high-performance React dashboard for cybersecurity analysts, SOC teams, and vulnerability researchers. Designed with a dark, glassmorphic aesthetic inspired by premium analytics workstations, the frontend directly consumes real threat intelligence data from the FastAPI backend.

---

## Key Features & Pages

- **Overview Dashboard (`/`)**:
  - Vulnerability KPIs: Total Vulnerabilities, Critical count, High count, Weighted Average CVSS.
  - Vulnerability trends area chart tracking yearly CVE frequency and high-severity trajectory.
  - Risk Snapshot panel displaying top prioritized vulnerabilities with distinct CVSS and Model Priority metrics.
  - Secondary analytical distributions: Attack Vector (horizontal bar chart), Severity (donut chart), CVSS score bands.
- **Vulnerability Intelligence Explorer (`/vulnerabilities`)**:
  - Multi-attribute filtering by Severity, Attack Vector, CWE, and CVSS score range.
  - Instant client-side search across CVE ID, description, and CWE names.
  - Paginated data table with server-side limit and offset query parameters.
  - One-click sliding drawer preview and direct link to detailed CVE analysis.
- **Dedicated CVE Detail Page (`/vulnerabilities/:id`)**:
  - Comprehensive vulnerability breakdown: Base CVSS score, CVSS standard version, publication timeline.
  - Complete CVSS vector metrics: Attack Vector, Attack Complexity, Privileges Required, User Interaction, and Scope.
  - Normalized CVSS v2 vs v3 handling: Labeled "Not applicable in CVSS v2" for non-v2 fields, with dedicated v2 metrics (Authentication, User Interaction Required, Obtain All/User Privilege).
  - Common Weakness Enumeration (CWE) taxonomy and exposure scope.
- **Threat Analytics Workspace (`/analytics`)**:
  - 8 responsive Recharts visualizations:
    1. Vulnerability Trends (Volume & High Severity)
    2. Severity Distribution
    3. CVSS Score Bands
    4. Attack Vectors
    5. Attack Complexity
    6. Privileges Required
    7. User Interaction
    8. Scope
- **CWE Intelligence (`/cwe`)**:
  - Weakness category distribution bar chart.
  - Selected weakness focus panel with average CVSS, max CVSS, and high-severity counts.
  - Ranked CWE roster table with direct link to filter associated CVEs.
- **Machine Learning & Risk Prioritization (`/risk-ml`)**:
  - Unsupervised ML cluster distribution.
  - Risk Matrix: Scatter plot of CVSS Base Score vs. Model-Derived Priority Score.
  - Ranked model-prioritized vulnerabilities with cluster filtering.
- **CVSS Analysis (`/cvss`)**:
  - CVSS version distribution (CVSS 2.0 vs 3.0 vs 3.1).
  - CVSS score tier distribution.
  - Architectural comparison matrix between legacy v2.0 and modern v3.x specifications.
- **Global Sliding Window & Shortcuts**:
  - Reusable sliding drawer (`CVEDetailDrawer`) allowing instant inspection of any CVE from any card or table without losing page context.
  - Global Command Search Modal (`Ctrl+K` / `Cmd+K`) for rapid CVE lookup.
  - Live API status indicator with 30-second automated health checks (`/api/health`).

---

## Technology Stack

- **Framework**: React 18
- **Build Tool**: Vite 5
- **Routing**: React Router DOM v6
- **Styling**: Tailwind CSS, PostCSS, Autoprefixer (custom glassmorphic theme and dark palette)
- **Visualizations**: Recharts
- **Icons**: Lucide React

---

## Installation & Setup

### 1. Install Dependencies

From the `frontend` directory:

```bash
cd frontend
npm install
```

### 2. Configure Backend URL (Optional)

By default, Vite's development server proxies all `/api/*` requests directly to `http://localhost:8000`.

To override the backend URL directly, create a `.env` file in the `frontend` directory:

```env
VITE_API_BASE_URL=http://localhost:8000
```

### 3. Run Development Server

```bash
npm run dev
```

The application will start at `http://localhost:5173`.

### 4. Build for Production

```bash
npm run build
```

The compiled and optimized assets will be emitted to `frontend/dist/`.

### 5. Preview Production Build

```bash
npm run preview
```

---

## Architecture & Folder Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── common/
│   │   │   ├── Badge.jsx            # Severity, CVSS, and Cluster badges
│   │   │   ├── Card.jsx             # Glassmorphic Card & MetricCard
│   │   │   ├── CommandKSearch.jsx   # Global Ctrl+K search dialog
│   │   │   ├── EmptyState.jsx       # Styled empty data states
│   │   │   ├── ErrorCard.jsx        # Graceful error boundaries & retry cards
│   │   │   └── Skeleton.jsx         # Card, chart, and table loading skeletons
│   │   ├── cve/
│   │   │   └── CVEDetailDrawer.jsx  # Slide-over inspection drawer
│   │   └── layout/
│   │       ├── Header.jsx           # Greeting, workspace tabs, search & status
│   │       ├── Layout.jsx           # Root layout orchestrator
│   │       └── Sidebar.jsx          # Collapsible navigation & API monitor
│   ├── context/
│   │   └── DrawerContext.jsx        # Global sliding drawer state provider
│   ├── pages/
│   │   ├── Analytics.jsx            # 8-chart Threat Analytics workspace
│   │   ├── CVEDetail.jsx            # Dedicated single CVE analysis page
│   │   ├── CVSSAnalysis.jsx         # CVSS version and metric comparison
│   │   ├── CWEIntelligence.jsx      # CWE distribution and ranked roster
│   │   ├── Dashboard.jsx            # Main Overview dashboard
│   │   ├── RiskML.jsx               # ML clusters and priority scoring
│   │   └── Vulnerabilities.jsx      # Filterable CVE explorer
│   ├── services/
│   │   └── api.js                   # Centralized API client for FastAPI
│   ├── utils/
│   │   ├── constants.js             # Nav items, workspace tabs, filter options
│   │   └── formatters.js            # CVSS, severity colors, dates, v2 null handling
│   ├── App.jsx                      # Routing configuration
│   ├── index.css                    # Tailwind directives & glassmorphic classes
│   └── main.jsx                     # Application bootstrap
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── vite.config.js
└── README.md
```

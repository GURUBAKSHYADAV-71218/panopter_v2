# Panopter — All Documents. One Investigative Lens.

**DataOps Innovation Hackathon 2026 · Problem Statement PS-2**

Panopter is a multi-document intelligence and investigation platform. It helps users investigate related documents together, detecting discrepancies, missing information, duplicate references, and chronology conflicts — with traceable evidence for every finding.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ (tested on 24.x)
- npm 10+
- Supabase account (optional — demo mode works without it)

### 1. Clone and install
```bash
git clone <repo-url>
cd panopter_final
npm install
```

### 2. Configure environment
```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

> **Demo mode**: If you skip `.env.local`, the app shows a demo banner and uses local in-memory demo data with no authentication required.

### 3. Apply database migrations (Supabase users only)
In the Supabase SQL Editor, run:
```sql
-- Apply schema
-- Copy and paste: supabase/migrations/001_initial_schema.sql

-- Apply demo seed (optional — replace {USER_ID} with your user UUID first)
-- Copy and paste: supabase/seed.sql
```

### 4. Run development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 5. Build for production
```bash
npm run build
npm start
```

---

## 📋 Features

| # | Feature | Status |
|---|---|---|
| 1 | Intelligent document understanding (PDF.js + Tesseract.js OCR) | ✅ |
| 2 | Cross-document relationship intelligence | ✅ |
| 3 | Evidence-based forensic investigation | ✅ |
| 4 | 3-panel document preview with page navigation | ✅ |
| 5 | Search across investigations, documents, findings | ✅ |
| 6 | Filters and sorting | ✅ |
| 7 | Duplicate file detection (SHA-256) | ✅ |
| 8 | Retry failed document processing | ✅ |
| 9 | Real-time processing progress | ✅ |
| 10 | Cancel processing | ✅ |
| 11 | Investigation notes (CRUD) | ✅ |
| 12 | Bookmark findings | ✅ |
| 13 | Hindi/English interface (i18n ready) | ✅ |
| 14 | Recent activity feed | ✅ |
| 15 | Dashboard statistics | ✅ |
| 16 | PDF report download (jsPDF) | ✅ |
| 17 | CSV and JSON export | ✅ |

---

## 🏗 Architecture

```
panopter_final/
├── src/
│   ├── app/
│   │   ├── (auth)/          # Login, register, forgot/reset password
│   │   ├── (app)/           # Protected application pages
│   │   │   ├── dashboard/
│   │   │   ├── investigations/
│   │   │   │   ├── [investigationId]/
│   │   │   │   │   ├── documents/
│   │   │   │   │   ├── findings/
│   │   │   │   │   ├── relationships/
│   │   │   │   │   ├── timeline/
│   │   │   │   │   ├── report/
│   │   │   │   │   └── review/
│   │   │   ├── documents/
│   │   │   ├── findings/
│   │   │   ├── relationships/
│   │   │   ├── timeline/
│   │   │   ├── reports/
│   │   │   └── settings/
│   │   └── auth/callback/   # Supabase OAuth callback
│   ├── components/
│   │   ├── layout/          # AppShell, Sidebar, TopBar
│   │   └── ui/              # Badge, Toast, ErrorBoundary, EmptyState
│   ├── features/
│   │   ├── comparison/      # Deterministic comparison engine
│   │   ├── documents/       # Processing pipeline, pending files store
│   │   └── extraction/      # Document classifier, field extractor
│   ├── lib/
│   │   ├── supabase/        # Client, server, middleware
│   │   ├── pdf/             # PDF.js text extractor
│   │   ├── ocr/             # Tesseract.js OCR processor
│   │   ├── hashing/         # SHA-256 duplicate detection
│   │   ├── normalization/   # Amount, date, vendor normalisation
│   │   ├── validation/      # File type/size validation
│   │   └── demo/            # Demo mode data
│   └── types/               # TypeScript types
├── supabase/
│   ├── migrations/001_initial_schema.sql
│   └── seed.sql             # Demo data (replace {USER_ID})
└── ...config files
```

---

## 🎯 Demo Scenario

**Scenario A — Amount Discrepancy Detection**
- Purchase Order: **₹4,50,000** (approved)
- Invoice: **₹4,85,000** (billed — ₹35,000 more than PO)
- Delivery Receipt: **₹4,50,000** (payment confirmed)
- Panopter flags a **Critical** finding: "Invoice amount exceeds Purchase Order total"
- Evidence: PO page 2, Invoice page 2, Receipt page 1

Upload the three `[DEMO]` documents from the seed data, or use the demo mode (no Supabase required).

---

## ⚠️ Disclaimer

All Panopter findings are labelled as requiring human review. The platform does not prove fraud, forgery, or any legal conclusion. It identifies potential discrepancies for review by qualified professionals.

Language used: "potential discrepancy", "requires human review" — never "Fraud confirmed".

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15.3.9 (App Router) |
| Language | TypeScript 5 (strict mode) |
| Styling | Tailwind CSS 3 |
| Auth & DB | Supabase (PostgreSQL + RLS) |
| PDF extraction | PDF.js (CDN worker) |
| OCR | Tesseract.js (CDN lang data) |
| Reports | jsPDF |
| Testing | Vitest 3.x |

---

## 🔒 Security

- Row Level Security (RLS) on all Supabase tables — users can only access their own data
- No service-role key in browser code
- Files are processed client-side and not stored permanently server-side
- Auth via Supabase email+password with PKCE flow

---

## 📄 License

Built for DataOps Innovation Hackathon 2026. All demo data is fictional.

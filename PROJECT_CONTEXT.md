# PROJECT_CONTEXT.md — Panopter

## Project Purpose
Panopter is a multi-document intelligence and investigation platform. It helps users investigate several related documents together — extracting information, detecting inconsistencies, mapping entity relationships, and presenting evidence-grounded findings.

**Tagline:** All Documents. One Investigative Lens.  
**Hackathon:** DataOps Innovation Hackathon 2026  
**Problem Statement:** PS-2 — AI-Powered Document Forensics and Contextual Intelligence System

---

## Product Scope

Panopter accepts multiple documents (PDF, JPG, PNG), extracts readable information, identifies document types, compares information across related documents, detects inconsistencies and relationships, and allows human reviewers to verify findings. It generates investigation reports and exports structured data.

**What Panopter is NOT:**
- It does not automatically prove fraud or forgery.
- It does not use an external LLM as the investigation engine.
- It does not permanently store original document files (browser-side processing).
- Language used is always cautious: "potential discrepancy", "requires human review".

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js (App Router), React, TypeScript (strict), Tailwind CSS |
| Auth & DB | Supabase Auth + PostgreSQL + RLS |
| Document Processing | PDF.js, Tesseract.js (pre-trained OCR) |
| Investigation Engine | Custom deterministic TypeScript rules |
| Visualization | Custom SVG-based graph + timeline |
| Reports | jsPDF |
| Exports | CSV utilities, JSON |
| Deployment | Vercel + Supabase hosted |

---

## Architecture

```
Browser
  ├── Next.js App (App Router)
  │   ├── (auth) routes — public
  │   └── (app) routes — protected
  │
  ├── Document Processing — entirely in-browser
  │   ├── PDF.js (embedded text extraction + rendering)
  │   ├── Tesseract.js (OCR for scanned docs/images)
  │   └── Custom TypeScript engine (compare, classify, score)
  │
  └── Supabase
      ├── Authentication
      ├── PostgreSQL (metadata, extracted fields, findings)
      └── Row Level Security (user data isolation)
```

---

## Implementation State

**Session started:** 2026-11-06  
**Current phase:** Phase 0 (Inspect & Plan) → Moving to Phase 1

---

## Important Constraints

1. Browser processes documents — original files are NOT permanently stored server-side.
2. No service-role key in browser code — ever.
3. No paid LLM for core investigation engine.
4. Tesseract.js uses pre-trained `tessdata_fast` models (eng + hin).
5. OCR model files pinned in `public/models/tesseract/`.
6. All findings must be evidence-grounded with real source references.
7. No fake statistics in production user dashboards.

---

## Current Blockers

- **Supabase credentials required from user** — Project URL and anon key needed to enable auth and database features. Application is built to work structurally without them and shows a clear setup guide when missing.

---

## How to Resume Development

1. Open terminal in `d:\certificate\panopter_final`
2. Run `npm install`
3. Copy `.env.example` to `.env.local` and fill in Supabase credentials
4. Run `npm run dev`
5. Check `BUILD_STATUS.md` for current phase and next steps
6. Check `DECISIONS.md` for key architecture choices

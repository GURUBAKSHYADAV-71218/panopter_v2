# DECISIONS.md — Panopter Architecture Decisions

---

## D-001: Browser-Side Document Processing
**Decision:** Process documents entirely in the browser using PDF.js and Tesseract.js.  
**Reason:** Eliminates backend infrastructure for file processing; reduces hosting costs; avoids storing sensitive document content server-side.  
**Alternatives:** Server-side processing with a Node.js API route; cloud OCR service.  
**Impact:** Original files are not permanently stored. After the browser session ends, the binary file is gone. Only extracted metadata, text, and findings are persisted in Supabase.  
**Date:** 2026-11-06

---

## D-002: No External LLM for Core Engine
**Decision:** Use deterministic TypeScript comparison rules for the investigation engine.  
**Reason:** No paid API dependency; reproducible and explainable results; no hallucination risk; works offline after initial load.  
**Alternatives:** OpenAI GPT-4 API; Google Gemini API.  
**Impact:** Comparison logic must be explicitly coded. Cannot handle novel document formats without new rules. All findings are rule-based and explainable.  
**Date:** 2026-11-06

---

## D-003: Tesseract.js with Pinned tessdata_fast Models
**Decision:** Download eng.traineddata and hin.traineddata from tessdata_fast and serve from public/models/tesseract/.  
**Reason:** Explicit, version-pinned model source. No runtime dependency on external CDN. Verifiable model origin.  
**Alternatives:** Let Tesseract.js download from its default CDN at runtime.  
**Impact:** Increases repository/deployment size by approximately 8–15 MB. Models are served as static assets.  
**Date:** 2026-11-06

---

## D-004: Supabase for Auth and Database
**Decision:** Use Supabase hosted PostgreSQL with RLS for all persistence.  
**Reason:** Provides managed auth, real-time capabilities, RLS for user isolation, and a free tier suitable for hackathon.  
**Alternatives:** Firebase, PlanetScale, self-hosted Postgres.  
**Impact:** Requires Supabase project setup by the user. All secrets in environment variables only.  
**Date:** 2026-11-06

---

## D-005: Custom SVG Relationship Graph
**Decision:** Implement the relationship graph using custom SVG rendering in React.  
**Reason:** No external graph library dependency; fully controllable visual appearance; failure-isolated.  
**Alternatives:** D3.js, React Flow, Cytoscape.js.  
**Impact:** More implementation effort. Graph is fully self-contained and matches the dark enterprise design system.  
**Date:** 2026-11-06

---

## D-006: jsPDF for Report Generation
**Decision:** Use jsPDF for client-side PDF report generation.  
**Reason:** No server round-trip; works offline; widely used.  
**Alternatives:** Server-side Puppeteer PDF generation.  
**Impact:** Report layout is built programmatically (not from HTML). Large reports must handle page breaks manually.  
**Date:** 2026-11-06

---

## D-007: Next.js App Router with Route Groups
**Decision:** Use Next.js App Router with (auth) and (app) route groups.  
**Reason:** Clean separation of public and protected routes; layouts can be applied per group; middleware-based protection.  
**Alternatives:** Next.js Pages Router.  
**Impact:** Middleware.ts handles auth protection. Each route group has its own layout.  
**Date:** 2026-11-06

---

## D-008: Tailwind CSS Design Tokens for the Dark Enterprise Theme
**Decision:** Define the design system in tailwind.config.ts as custom color tokens (panopter-bg, panopter-surface, panopter-accent, etc.).  
**Reason:** Single source of truth for colors. No hardcoded shades scattered across components.  
**Alternatives:** CSS custom properties only; Styled Components.  
**Impact:** All components use token class names. Theme changes only require updating tailwind.config.ts.  
**Date:** 2026-11-06

---

## D-009: Document Duplicate Detection via SHA-256
**Decision:** Use Web Crypto API (SubtleCrypto) to compute SHA-256 hashes of uploaded files.  
**Reason:** Filename is not a reliable duplicate indicator. SHA-256 detects identical content regardless of filename.  
**Alternatives:** MD5 (weaker); file size + filename (unreliable).  
**Impact:** Hashing is async. Computed before processing begins. If hashing fails, show a warning and continue with other validation steps.  
**Date:** 2026-11-06

---

## D-010: Vitest for Unit Tests, Playwright for E2E
**Decision:** Use Vitest for unit and integration tests, Playwright for end-to-end browser tests.  
**Reason:** Vitest is fast, compatible with Next.js, and uses Vite-compatible configuration. Playwright is the industry standard for E2E.  
**Alternatives:** Jest + Cypress.  
**Impact:** Test scripts configured in package.json. Separate config files for Vitest and Playwright.  
**Date:** 2026-11-06

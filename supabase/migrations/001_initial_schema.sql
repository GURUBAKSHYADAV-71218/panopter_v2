-- ============================================================
-- Panopter Database Migration: 001 — Initial Schema
-- Apply this via the Supabase SQL Editor or CLI
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 1. profiles ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ── 2. investigations ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.investigations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft','processing','completed','completed_with_warnings','failed','archived')),
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_investigations_user_id ON public.investigations(user_id);

-- ── 3. documents ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.documents (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  investigation_id   UUID NOT NULL REFERENCES public.investigations(id) ON DELETE CASCADE,
  user_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name          TEXT NOT NULL,
  file_type          TEXT NOT NULL,
  file_size          BIGINT NOT NULL DEFAULT 0,
  file_hash          TEXT,
  processing_status  TEXT NOT NULL DEFAULT 'pending'
                       CHECK (processing_status IN (
                         'pending','validating','extracting_text','ocr_processing',
                         'classifying','extracting_fields','comparing',
                         'completed','completed_with_warnings','failed','cancelled'
                       )),
  document_type      TEXT NOT NULL DEFAULT 'unknown'
                       CHECK (document_type IN (
                         'invoice','purchase_order','receipt','bank_statement',
                         'agreement','general','unknown'
                       )),
  extraction_source  TEXT CHECK (extraction_source IN ('embedded_text','ocr','manual')),
  page_count         INTEGER,
  processing_error   TEXT,
  created_at         TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at         TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_documents_investigation_id ON public.documents(investigation_id);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON public.documents(user_id);

-- ── 4. extracted_fields ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.extracted_fields (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id      UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  field_name       TEXT NOT NULL,
  field_value      TEXT NOT NULL,
  normalized_value TEXT,
  page_number      INTEGER,
  source_excerpt   TEXT,
  source_type      TEXT NOT NULL DEFAULT 'embedded_text'
                     CHECK (source_type IN ('embedded_text','ocr','manual')),
  confidence       REAL,
  created_at       TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at       TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_extracted_fields_document_id ON public.extracted_fields(document_id);
CREATE INDEX IF NOT EXISTS idx_extracted_fields_user_id ON public.extracted_fields(user_id);

-- ── 5. findings ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.findings (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  investigation_id UUID NOT NULL REFERENCES public.investigations(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  description      TEXT NOT NULL,
  finding_type     TEXT NOT NULL
                     CHECK (finding_type IN (
                       'amount_mismatch','date_inconsistency','vendor_mismatch',
                       'missing_field','duplicate_reference','reference_mismatch',
                       'account_mismatch','chronology_inconsistency','general_inconsistency'
                     )),
  priority_score   INTEGER NOT NULL DEFAULT 0 CHECK (priority_score BETWEEN 0 AND 100),
  priority_level   TEXT NOT NULL DEFAULT 'low'
                     CHECK (priority_level IN ('low','moderate','high','critical')),
  review_status    TEXT NOT NULL DEFAULT 'needs_review'
                     CHECK (review_status IN ('needs_review','confirmed','dismissed')),
  created_at       TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at       TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_findings_investigation_id ON public.findings(investigation_id);
CREATE INDEX IF NOT EXISTS idx_findings_user_id ON public.findings(user_id);

-- ── 6. finding_evidence ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.finding_evidence (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  finding_id      UUID NOT NULL REFERENCES public.findings(id) ON DELETE CASCADE,
  document_id     UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  page_number     INTEGER,
  field_name      TEXT NOT NULL,
  observed_value  TEXT NOT NULL,
  compared_value  TEXT,
  source_excerpt  TEXT,
  evidence_type   TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_finding_evidence_finding_id ON public.finding_evidence(finding_id);

-- ── 7. entities ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.entities (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  investigation_id UUID NOT NULL REFERENCES public.investigations(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type      TEXT NOT NULL
                     CHECK (entity_type IN ('person','organization','account_reference','transaction_reference','document')),
  display_name     TEXT NOT NULL,
  normalized_name  TEXT NOT NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_entities_investigation_id ON public.entities(investigation_id);

-- ── 8. entity_relationships ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.entity_relationships (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  investigation_id       UUID NOT NULL REFERENCES public.investigations(id) ON DELETE CASCADE,
  user_id                UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_entity_id       UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  target_entity_id       UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  relationship_type      TEXT NOT NULL,
  supporting_document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  created_at             TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_entity_relationships_investigation_id ON public.entity_relationships(investigation_id);

-- ── 9. investigation_notes ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.investigation_notes (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  investigation_id UUID NOT NULL REFERENCES public.investigations(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content          TEXT NOT NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at       TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_investigation_notes_investigation_id ON public.investigation_notes(investigation_id);

-- ── 10. bookmarks ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bookmarks (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  finding_id UUID NOT NULL REFERENCES public.findings(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (finding_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON public.bookmarks(user_id);

-- ── 11. review_history ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.review_history (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  finding_id      UUID NOT NULL REFERENCES public.findings(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  previous_status TEXT NOT NULL,
  new_status      TEXT NOT NULL,
  review_note     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_review_history_finding_id ON public.review_history(finding_id);

-- ── 12. activity_logs ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  investigation_id UUID REFERENCES public.investigations(id) ON DELETE SET NULL,
  activity_type    TEXT NOT NULL,
  description      TEXT NOT NULL,
  metadata         JSONB,
  created_at       TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_investigation_id ON public.activity_logs(investigation_id);

-- ── Automatic updated_at triggers ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER handle_updated_at_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER handle_updated_at_investigations
  BEFORE UPDATE ON public.investigations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER handle_updated_at_documents
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER handle_updated_at_extracted_fields
  BEFORE UPDATE ON public.extracted_fields
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER handle_updated_at_findings
  BEFORE UPDATE ON public.findings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER handle_updated_at_investigation_notes
  BEFORE UPDATE ON public.investigation_notes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── Auto-create profile on user signup ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE public.profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investigations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extracted_fields    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.findings            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finding_evidence    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entities            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entity_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investigation_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_history      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs       ENABLE ROW LEVEL SECURITY;

-- profiles: users can only read/update their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- investigations: full CRUD for own investigations
CREATE POLICY "Users can CRUD own investigations" ON public.investigations
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- documents
CREATE POLICY "Users can CRUD own documents" ON public.documents
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- extracted_fields
CREATE POLICY "Users can CRUD own extracted_fields" ON public.extracted_fields
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- findings
CREATE POLICY "Users can CRUD own findings" ON public.findings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- finding_evidence
CREATE POLICY "Users can CRUD own finding_evidence" ON public.finding_evidence
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- entities
CREATE POLICY "Users can CRUD own entities" ON public.entities
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- entity_relationships
CREATE POLICY "Users can CRUD own entity_relationships" ON public.entity_relationships
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- investigation_notes
CREATE POLICY "Users can CRUD own investigation_notes" ON public.investigation_notes
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- bookmarks
CREATE POLICY "Users can CRUD own bookmarks" ON public.bookmarks
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- review_history
CREATE POLICY "Users can CRUD own review_history" ON public.review_history
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- activity_logs
CREATE POLICY "Users can CRUD own activity_logs" ON public.activity_logs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

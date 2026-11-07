-- ============================================================
-- Panopter Demo Seed — DataOps Hackathon 2026
-- ============================================================
-- IMPORTANT: This seed data is SIMULATED and clearly labelled
-- as DEMO data. It does NOT represent real extracted documents.
-- All amounts, names, and references are fictional.
-- ============================================================
--
-- Instructions:
-- 1. Apply 001_initial_schema.sql first (via Supabase SQL Editor)
-- 2. Apply THIS file AFTER replacing {USER_ID} with a real Supabase user UUID
-- 3. The user must already exist in auth.users
--
-- Replace {USER_ID} with your actual Supabase user ID before running.
-- Example: a1b2c3d4-e5f6-7890-abcd-ef1234567890
-- ============================================================

DO $$
DECLARE
  v_user_id      UUID := '{USER_ID}'::UUID;  -- REPLACE THIS
  v_inv_id       UUID := gen_random_uuid();
  v_po_id        UUID := gen_random_uuid();
  v_inv_doc_id   UUID := gen_random_uuid();
  v_rcpt_id      UUID := gen_random_uuid();
  v_finding1_id  UUID := gen_random_uuid();
  v_finding2_id  UUID := gen_random_uuid();
  v_finding3_id  UUID := gen_random_uuid();
BEGIN

  -- ── Create profile if not exists
  INSERT INTO public.profiles (id, full_name)
  VALUES (v_user_id, 'Demo Investigator')
  ON CONFLICT (id) DO NOTHING;

  -- ── Investigation: Vendor Payment Verification
  INSERT INTO public.investigations (id, user_id, name, description, status)
  VALUES (
    v_inv_id,
    v_user_id,
    '[DEMO] Vendor Payment Verification — ABC Supplies',
    'Demo scenario: Purchase Order for ₹4,50,000 vs Invoice for ₹4,85,000 vs Receipt for ₹4,50,000. Detects ₹35,000 discrepancy between PO and Invoice.',
    'completed'
  );

  -- ── Document 1: Purchase Order
  INSERT INTO public.documents (id, investigation_id, user_id, file_name, file_type, file_size, processing_status, document_type, extraction_source, page_count)
  VALUES (
    v_po_id, v_inv_id, v_user_id,
    '[DEMO] Purchase_Order_PO-2026-104.pdf', 'application/pdf', 245000,
    'completed', 'purchase_order', 'embedded_text', 4
  );

  -- Extracted fields for PO
  INSERT INTO public.extracted_fields (document_id, user_id, field_name, field_value, normalized_value, page_number, source_excerpt, source_type)
  VALUES
    (v_po_id, v_user_id, 'po_number', 'PO-2026-104', 'PO-2026-104', 1, 'PO Number: PO-2026-104', 'embedded_text'),
    (v_po_id, v_user_id, 'vendor_name', 'ABC Supplies Pvt. Ltd.', 'abc supplies pvt ltd', 1, 'Vendor: ABC Supplies Pvt. Ltd.', 'embedded_text'),
    (v_po_id, v_user_id, 'amount', '4,50,000', '450000', 2, 'Grand Total: ₹4,50,000', 'embedded_text'),
    (v_po_id, v_user_id, 'document_date', '12 Oct 2026', '2026-10-12', 1, 'Date: 12 Oct 2026', 'embedded_text'),
    (v_po_id, v_user_id, 'currency', 'INR', 'INR', 2, 'Currency: INR', 'embedded_text');

  -- ── Document 2: Invoice
  INSERT INTO public.documents (id, investigation_id, user_id, file_name, file_type, file_size, processing_status, document_type, extraction_source, page_count)
  VALUES (
    v_inv_doc_id, v_inv_id, v_user_id,
    '[DEMO] Invoice_INV-2026-211.pdf', 'application/pdf', 189000,
    'completed', 'invoice', 'embedded_text', 3
  );

  -- Extracted fields for Invoice
  INSERT INTO public.extracted_fields (document_id, user_id, field_name, field_value, normalized_value, page_number, source_excerpt, source_type)
  VALUES
    (v_inv_doc_id, v_user_id, 'invoice_number', 'INV-2026-211', 'INV-2026-211', 1, 'Invoice No: INV-2026-211', 'embedded_text'),
    (v_inv_doc_id, v_user_id, 'po_reference', 'PO-2026-104', 'PO-2026-104', 1, 'Reference PO: PO-2026-104', 'embedded_text'),
    (v_inv_doc_id, v_user_id, 'vendor_name', 'ABC Supplies Pvt. Ltd.', 'abc supplies pvt ltd', 1, 'From: ABC Supplies Pvt. Ltd.', 'embedded_text'),
    (v_inv_doc_id, v_user_id, 'amount', '4,85,000', '485000', 2, 'Invoice Total: ₹4,85,000', 'embedded_text'),
    (v_inv_doc_id, v_user_id, 'document_date', '13 Oct 2026', '2026-10-13', 1, 'Invoice Date: 13 Oct 2026', 'embedded_text'),
    (v_inv_doc_id, v_user_id, 'currency', 'INR', 'INR', 2, 'Currency: INR', 'embedded_text');

  -- ── Document 3: Receipt
  INSERT INTO public.documents (id, investigation_id, user_id, file_name, file_type, file_size, processing_status, document_type, extraction_source, page_count)
  VALUES (
    v_rcpt_id, v_inv_id, v_user_id,
    '[DEMO] Delivery_Receipt_RCPT-2026-087.pdf', 'application/pdf', 95000,
    'completed', 'receipt', 'embedded_text', 1
  );

  -- Extracted fields for Receipt
  INSERT INTO public.extracted_fields (document_id, user_id, field_name, field_value, normalized_value, page_number, source_excerpt, source_type)
  VALUES
    (v_rcpt_id, v_user_id, 'receipt_number', 'RCPT-2026-087', 'RCPT-2026-087', 1, 'Receipt No: RCPT-2026-087', 'embedded_text'),
    (v_rcpt_id, v_user_id, 'po_reference', 'PO-2026-104', 'PO-2026-104', 1, 'Against PO: PO-2026-104', 'embedded_text'),
    (v_rcpt_id, v_user_id, 'vendor_name', 'ABC Supplies Pvt. Ltd.', 'abc supplies pvt ltd', 1, 'Supplier: ABC Supplies Pvt. Ltd.', 'embedded_text'),
    (v_rcpt_id, v_user_id, 'amount', '4,50,000', '450000', 1, 'Payment Received: ₹4,50,000', 'embedded_text'),
    (v_rcpt_id, v_user_id, 'document_date', '14 Oct 2026', '2026-10-14', 1, 'Date: 14 Oct 2026', 'embedded_text');

  -- ── Finding 1: Amount Discrepancy (Critical)
  INSERT INTO public.findings (id, investigation_id, user_id, title, description, finding_type, priority_score, priority_level, review_status)
  VALUES (
    v_finding1_id, v_inv_id, v_user_id,
    '[DEMO] Invoice amount exceeds Purchase Order total',
    'The invoice total (₹4,85,000) is ₹35,000 higher than the approved purchase order amount (₹4,50,000). The delivery receipt confirms payment of ₹4,50,000, matching the original PO. This discrepancy requires human review and may indicate an unauthorised price change.',
    'amount_mismatch', 92, 'critical', 'needs_review'
  );

  -- Evidence for Finding 1
  INSERT INTO public.finding_evidence (finding_id, document_id, user_id, page_number, field_name, observed_value, compared_value, source_excerpt, evidence_type)
  VALUES
    (v_finding1_id, v_po_id, v_user_id, 2, 'amount', '₹4,50,000', '₹4,85,000', 'Grand Total: ₹4,50,000', 'primary'),
    (v_finding1_id, v_inv_doc_id, v_user_id, 2, 'amount', '₹4,85,000', '₹4,50,000', 'Invoice Total: ₹4,85,000', 'primary'),
    (v_finding1_id, v_rcpt_id, v_user_id, 1, 'amount', '₹4,50,000', NULL, 'Payment Received: ₹4,50,000', 'corroborating');

  -- ── Finding 2: Missing Reference on Invoice (High)
  INSERT INTO public.findings (id, investigation_id, user_id, title, description, finding_type, priority_score, priority_level, review_status)
  VALUES (
    v_finding2_id, v_inv_id, v_user_id,
    '[DEMO] PO reference cross-validated between documents',
    'All three documents reference PO-2026-104 consistently. The purchase order, invoice, and receipt share this reference number, confirming document linkage.',
    'duplicate_reference', 15, 'low', 'confirmed'
  );

  -- Evidence for Finding 2
  INSERT INTO public.finding_evidence (finding_id, document_id, user_id, page_number, field_name, observed_value, compared_value, source_excerpt, evidence_type)
  VALUES
    (v_finding2_id, v_po_id, v_user_id, 1, 'po_number', 'PO-2026-104', 'PO-2026-104', 'PO Number: PO-2026-104', 'primary'),
    (v_finding2_id, v_inv_doc_id, v_user_id, 1, 'po_reference', 'PO-2026-104', 'PO-2026-104', 'Reference PO: PO-2026-104', 'corroborating');

  -- ── Finding 3: Date consistency check (Moderate)
  INSERT INTO public.findings (id, investigation_id, user_id, title, description, finding_type, priority_score, priority_level, review_status)
  VALUES (
    v_finding3_id, v_inv_id, v_user_id,
    '[DEMO] Document date sequence appears consistent',
    'PO (12 Oct), Invoice (13 Oct), and Receipt (14 Oct) follow a logical chronological sequence. No chronology issues detected.',
    'date_inconsistency', 10, 'low', 'confirmed'
  );

  -- Entities
  INSERT INTO public.entities (investigation_id, user_id, entity_type, display_name, normalized_name)
  VALUES
    (v_inv_id, v_user_id, 'organization', 'ABC Supplies Pvt. Ltd.', 'abc supplies pvt ltd'),
    (v_inv_id, v_user_id, 'document', '[DEMO] PO-2026-104', 'po-2026-104'),
    (v_inv_id, v_user_id, 'transaction_reference', 'INV-2026-211', 'inv-2026-211');

  -- Activity logs
  INSERT INTO public.activity_logs (user_id, investigation_id, activity_type, description)
  VALUES
    (v_user_id, v_inv_id, 'investigation_created', '[DEMO] Investigation created: Vendor Payment Verification — ABC Supplies'),
    (v_user_id, v_inv_id, 'document_added', '[DEMO] 3 documents added'),
    (v_user_id, v_inv_id, 'document_processing_completed', '[DEMO] All documents processed successfully'),
    (v_user_id, v_inv_id, 'finding_generated', '[DEMO] 3 findings generated from document comparison');

  RAISE NOTICE 'Demo seed applied successfully. Investigation ID: %', v_inv_id;
END $$;

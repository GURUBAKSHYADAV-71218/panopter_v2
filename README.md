# Panopter V2
## All Documents. One Investigative Lens.

**A Forensic Investigation & Evidence Analysis Platform**

**DataOps Innovation Hackathon 2026 | Problem Statement PS-2**

[![Framework](https://img.shields.io/badge/Framework-Next.js-black)](https://nextjs.org/)
[![Language](https://img.shields.io/badge/Language-TypeScript-blue)](https://www.typescriptlang.org/)
[![Styling](https://img.shields.io/badge/Styling-Tailwind%20CSS-38B2AC)](https://tailwindcss.com/)
[![PDF Processing](https://img.shields.io/badge/PDF-PDF.js-orange)](https://mozilla.github.io/pdf.js/)
[![OCR](https://img.shields.io/badge/OCR-Tesseract.js-green)](https://tesseract.projectnaptha.com/)

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Problem Statement](#2-problem-statement)
3. [Our Solution](#3-our-solution)
4. [Project Objectives](#4-project-objectives)
5. [Key Features](#5-key-features)
6. [How Panopter Works](#6-how-panopter-works)
7. [Technology Stack](#7-technology-stack)
8. [System Architecture](#8-system-architecture)
9. [Application Data Storage](#9-application-data-storage)
10. [Project Structure](#10-project-structure)
11. [Getting Started](#11-getting-started)
12. [Available Commands](#12-available-commands)
13. [Testing and Validation](#13-testing-and-validation)
14. [Current Limitations](#14-current-limitations)
15. [Future Scope and Roadmap](#15-future-scope-and-roadmap)
16. [Responsible Use and Disclaimer](#16-responsible-use-and-disclaimer)
17. [Project Information](#17-project-information)

---

## 1. Introduction

Panopter V2 is a document-based forensic investigation and evidence analysis platform designed to help users organise, examine, and review information collected from multiple investigation-related documents.

Investigations frequently involve different types of records, including invoices, purchase orders, receipts, reports, statements, and other supporting documents. Important information may be distributed across these records, making manual examination difficult and time-consuming.

Panopter provides a structured workspace where users can manage investigations, upload documents, process available document content, organise findings, examine relationships, review chronological events, and generate reports.

The platform focuses on improving the organisation, traceability, and review of investigation-related information.

**Core idea: Bring multiple documents together and provide one organised investigative view.**

---

## 2. Problem Statement

### The Challenge

Document-based investigations can become complicated when information is spread across multiple records.

Common challenges include:

- **Missing Information:** Important details may be absent from one or more documents.
- **Duplicate References:** The same file or reference may appear multiple times.
- **Inconsistent Information:** Values, dates, names, or other details may differ between related records.
- **Chronology Conflicts:** Events may not follow an expected chronological sequence.
- **Fragmented Evidence:** Supporting information may be difficult to organise and trace back to its source.
- **Manual Review Effort:** Investigators may need to examine multiple documents separately before understanding their connections.

### Why This Matters

Without a structured investigation workflow, identifying relevant information and understanding relationships between documents can require significant manual effort.

Panopter aims to make this process more organised by bringing document management and investigation review into one platform.

---

## 3. Our Solution

Panopter V2 provides a centralised investigation workspace for managing documents and reviewing information across an investigation.

Instead of treating each document as an isolated record, the platform supports a broader investigation workflow.

Its main capabilities include:

1. Investigation creation and management.
2. PDF document upload and processing.
3. Text extraction and OCR support.
4. Findings and evidence organisation.
5. Relationship analysis.
6. Chronological timeline review.
7. Investigation report generation.

The platform is designed to assist investigators in identifying information that may require further examination.

**Panopter supports investigation and human decision-making; it does not replace professional judgement.**

---

## 4. Project Objectives

Panopter V2 aims to:

- Simplify the management of multiple investigation-related documents.
- Provide a structured document processing workflow.
- Help users review potential discrepancies and inconsistencies.
- Improve the organisation of findings and supporting evidence.
- Make relationships between relevant information easier to examine.
- Present events in a chronological timeline.
- Provide downloadable reports for investigation documentation.
- Establish a foundation for future cloud-based and collaborative investigation workflows.

---

## 5. Key Features

### 5.1 Investigation Management

Users can create and manage investigation workspaces.

Each investigation provides an organised place for associated documents, findings, evidence, relationships, and analysis.

This helps keep investigation-related information organised instead of scattered across separate records.

### 5.2 Document Upload and Management

Users can upload PDF documents associated with an investigation.

The document management workflow supports organising uploaded files and reviewing their processing information.

### 5.3 PDF Text Extraction

Panopter uses PDF.js to extract available text from supported PDF documents.

This makes document content easier to examine without manually reading every page.

### 5.4 OCR-Based Text Recognition

For scanned documents and image-based content, Tesseract.js provides OCR-based text recognition.

OCR helps convert supported image content into machine-readable text for further review.

The quality of extracted information depends on document clarity, image quality, language support, and document structure.

### 5.5 Findings Management

The findings area helps users organise and review information that may require attention.

Findings can support the investigation process by highlighting potential inconsistencies or relevant observations.

### 5.6 Evidence Organisation

Supporting evidence can be organised alongside investigation findings.

The objective is to make relevant information easier to review and trace during an investigation.

### 5.7 Relationship Analysis

Related entities and records can be examined through the relationships functionality.

This helps users understand how different pieces of investigation information may be connected.

### 5.8 Timeline Analysis

The timeline functionality organises relevant events chronologically.

It helps investigators examine the sequence of recorded events and identify potential timing inconsistencies that may require further review.

### 5.9 Duplicate File Detection

Panopter includes SHA-256-based file hashing functionality to support duplicate file identification.

This can help reduce repeated file entries and improve document organisation.

### 5.10 Search and Filtering

Search and filtering capabilities help users navigate investigation-related information more efficiently.

### 5.11 Investigation Notes

Users can maintain notes associated with their investigation workflow.

### 5.12 PDF Report Generation

Panopter uses jsPDF to generate downloadable PDF reports.

Reports help present investigation-related information in a structured format for review and documentation.

---

## 6. How Panopter Works

The application follows a structured investigation workflow.

```text
Create Investigation
        |
        v
Upload Documents
        |
        v
Document Processing
        |
        v
Text Extraction / OCR
        |
        v
Review Findings and Evidence
        |
        v
Analyse Relationships
        |
        v
Review Chronological Timeline
        |
        v
Generate Investigation Report
```

### Step 1: Create an Investigation

The user creates an investigation workspace to organise a particular case or review activity.

### Step 2: Upload Documents

Relevant PDF documents are uploaded and associated with the investigation.

### Step 3: Process Documents

The application processes supported documents using PDF text extraction and OCR where applicable.

### Step 4: Review Findings

The user reviews available findings and identifies information that may require additional examination.

### Step 5: Examine Relationships

Related entities and records can be examined to understand possible connections.

### Step 6: Review the Timeline

Events can be reviewed chronologically to understand the sequence of information available in the investigation.

### Step 7: Generate a Report

The user can generate a downloadable PDF report containing investigation-related information.

---

## 7. Technology Stack

Panopter V2 uses modern web technologies and document-processing libraries.

| Layer | Technology | Purpose |
|---|---|---|
| Framework | Next.js 15 | Application framework and routing |
| Frontend | React | User interface |
| Language | TypeScript | Type-safe application development |
| Styling | Tailwind CSS | Responsive interface styling |
| PDF Processing | PDF.js | PDF text extraction |
| OCR | Tesseract.js | Text recognition from supported images |
| Report Generation | jsPDF | PDF report creation |
| Duplicate Detection | SHA-256 | File hashing |
| Application Storage | Browser localStorage | Local application data persistence |
| Testing | Vitest | Automated unit testing |

### Why These Technologies?

**Next.js and React:** Provide the foundation for building a modular and interactive web application.

**TypeScript:** Improves code structure and helps identify type-related issues during development.

**Tailwind CSS:** Supports consistent and responsive interface design.

**PDF.js:** Enables browser-side PDF document processing and text extraction.

**Tesseract.js:** Provides OCR capabilities for supported scanned document content.

**jsPDF:** Supports downloadable PDF report generation.

**Browser localStorage:** Allows the current V2 implementation to persist application data locally in the browser without requiring an active cloud database.

---

## 8. System Architecture

Panopter V2 currently follows a browser-based application architecture.

### Architecture Overview

```text
             USER
               |
               v
       NEXT.JS APPLICATION
               |
       +-------+--------+
       |                |
       v                v
  INVESTIGATION     DOCUMENT
   MANAGEMENT       MANAGEMENT
       |                |
       |                v
       |         PDF.JS / OCR
       |                |
       +-------+--------+
               |
               v
       FINDINGS & EVIDENCE
               |
       +-------+--------+
       |                |
       v                v
  RELATIONSHIPS       TIMELINE
       |                |
       +-------+--------+
               |
               v
       PDF REPORT GENERATION
               |
               v
        BROWSER STORAGE
          (localStorage)
```

### Architecture Components

- **Presentation Layer:** Provides the user interface and navigation.
- **Application Layer:** Handles investigation management and application workflows.
- **Document Processing Layer:** Supports PDF text extraction and OCR.
- **Analysis Layer:** Supports findings, relationships, and timeline review.
- **Reporting Layer:** Generates downloadable PDF reports.
- **Storage Layer:** Persists application data in browser localStorage.

The architecture reflects the current V2 implementation and does not represent a deployed cloud database backend.

---

## 9. Application Data Storage

### Current Implementation: Browser-Based Storage

Panopter V2 currently uses browser localStorage for application data management.

This approach allows the application to operate without requiring users to configure a cloud database or authentication provider.

### Advantages

- No external database account is required for the current application.
- No database configuration is needed to run the application.
- Data can persist in the same browser across sessions, subject to browser storage availability.
- Suitable for the current standalone demonstration workflow.

### Current Limitations

- Data is stored locally in the browser.
- Data is not automatically synchronised between different devices.
- Multiple users cannot automatically collaborate through a shared database.
- Clearing browser storage can result in loss of locally stored application data.
- Browser storage is not a substitute for secure centralised database storage.

### Planned Future Addition: Supabase Integration

**Supabase is planned as a future enhancement and is not the active database implementation of Panopter V2.**

The repository may contain legacy Supabase-related files and configuration, but the current V2 application workflow uses browser-based local storage.

A future Supabase integration could provide:

- Centralised PostgreSQL database storage.
- Persistent cloud-based investigation records.
- User authentication and account management.
- Role-based access control.
- Row Level Security (RLS).
- Multi-user investigation collaboration.
- Cross-device data synchronisation.
- More scalable data management.

This integration will require separate implementation, security configuration, testing, and validation before being considered part of the active application.

---

## 10. Project Structure

The application uses a modular source-code organisation.

```text
panopter_v2/
│
├── src/
│   ├── app/
│   │   ├── dashboard/
│   │   ├── investigations/
│   │   ├── documents/
│   │   ├── findings/
│   │   ├── relationships/
│   │   ├── timeline/
│   │   └── reports/
│   │
│   ├── components/
│   │   ├── layout/
│   │   └── ui/
│   │
│   ├── features/
│   │   ├── comparison/
│   │   ├── documents/
│   │   └── extraction/
│   │
│   ├── lib/
│   │   ├── store/
│   │   ├── pdf/
│   │   ├── ocr/
│   │   ├── hashing/
│   │   ├── normalization/
│   │   └── validation/
│   │
│   └── types/
│
├── public/
├── package.json
├── tsconfig.json
├── next.config.*
└── README.md
```

*Note: This is a conceptual overview of the source organisation. Exact filenames and folders may vary with the repository's current implementation.*

---

## 11. Getting Started

Follow these steps to run Panopter V2 locally.

### Prerequisites

- Node.js 20 or later recommended.
- npm.
- Git.

### Step 1: Clone the Repository

```bash
git clone https://github.com/GURUBAKSHYADAV-71218/panopter_v2.git
```

### Step 2: Navigate to the Project

```bash
cd panopter_v2
```

### Step 3: Install Dependencies

```bash
npm install
```

### Step 4: Start the Development Server

```bash
npm run dev
```

### Step 5: Open the Application

Visit:

```text
http://localhost:3000
```

The current V2 application does not require Supabase credentials or a Supabase account to run its browser-based workflow.

---

## 12. Available Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm start` | Start the production server |
| `npm test` | Run automated tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Generate test coverage |
| `npm run type-check` | Run TypeScript type checking |
| `npm run lint` | Run the configured lint command |

---

## 13. Testing and Validation

Testing helps maintain application reliability and catch development issues.

The project includes Vitest for automated testing and TypeScript type checking.

### Validation Areas

- TypeScript type checking.
- Document-related utility testing.
- Data normalisation testing.
- Application workflow verification.
- Manual review of document upload and processing.
- Manual review of investigation findings and reporting.

### Testing Transparency

Automated unit tests do not automatically establish that every application workflow is fully tested.

Features should be considered validated only to the extent that the relevant automated or manual checks have actually been completed.

---

## 14. Current Limitations

The current version focuses on a standalone browser-based investigation workflow.

Some limitations include:

1. Application data is stored locally in the browser.
2. Cross-device synchronisation is not currently provided.
3. Shared multi-user investigations are not currently supported through a centralised database.
4. OCR accuracy depends on the quality and readability of source documents.
5. Extracted information may require manual correction and verification.
6. Findings are intended to support human review rather than make final legal conclusions.
7. Cloud database integration and authentication are planned future enhancements.

These limitations define areas for further development.

---

## 15. Future Scope and Roadmap

Panopter V2 establishes a foundation for a more advanced investigation and evidence management platform.

The following improvements are planned as future development opportunities.

### 15.1 Supabase Cloud Database Integration

Integrate Supabase as a centralised PostgreSQL database backend.

Potential capabilities:

- Persistent cloud storage for investigation records.
- Centralised document metadata.
- Cross-device synchronisation.
- Structured database relationships.
- Secure data access policies.

### 15.2 Authentication and User Management

Introduce secure user accounts and authentication.

Potential capabilities:

- Email-based authentication.
- User profiles.
- Investigator accounts.
- Role-based permissions.
- Investigation access management.

### 15.3 Multi-user Collaboration

Enable multiple authorised investigators to collaborate on the same investigation.

Potential capabilities:

- Shared investigation workspaces.
- Team-based evidence review.
- Collaborative notes.
- Activity history.
- Assignment and review workflows.

### 15.4 Advanced Document Intelligence

Improve document understanding and cross-document comparison.

Potential capabilities:

- More advanced field extraction.
- Better document classification.
- Improved OCR handling.
- Cross-document information comparison.
- More comprehensive discrepancy identification.

### 15.5 Advanced Timeline Analysis

Extend timeline capabilities to support more detailed event reconstruction.

Potential capabilities:

- Improved chronological comparison.
- Identification of potentially conflicting event dates.
- Better event filtering.
- Visual event connections.

### 15.6 Audit Trails and Evidence Traceability

Introduce more comprehensive tracking of investigation activity.

Potential capabilities:

- Change history.
- Evidence access records.
- Finding update history.
- Investigation activity logs.
- Improved source traceability.

### 15.7 Scalability and Performance

Prepare the platform for larger investigation datasets and more demanding workflows.

Potential capabilities:

- Efficient document processing.
- Background processing.
- Improved data management.
- Cloud infrastructure.
- Performance optimisation.

**Roadmap note:** These items represent future development possibilities, not features currently claimed as implemented.

---

## 16. Responsible Use and Disclaimer

Panopter is an investigation support platform intended to help organise and review document-based information.

The presence of a discrepancy or inconsistency does not independently establish fraud, forgery, criminal activity, or legal liability.

All findings should be interpreted in context and reviewed by qualified human investigators.

The platform is designed to support:

- Evidence organisation.
- Information review.
- Potential discrepancy identification.
- Chronological analysis.
- Investigation documentation.

It is not intended to replace professional judgement, legal investigation, or independent verification of source documents.

---

## 17. Project Information

**Project Name:** Panopter V2  
**Category:** Forensic Investigation & Evidence Analysis  
**Hackathon:** DataOps Innovation Hackathon 2026  
**Problem Statement:** PS-2

### Project Links

- **GitHub Repository:** https://github.com/GURUBAKSHYADAV-71218/panopter_v2
- **Live Application:** Add the verified V2 production deployment URL here.

---

## Acknowledgement

Built as part of the DataOps Innovation Hackathon 2026.

Panopter aims to make document-based investigations more structured, organised, and easier to review by bringing multiple records together through one investigative lens.

**Panopter V2 — All Documents. One Investigative Lens.**

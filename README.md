# Tractable

Regulatory compliance management platform for UK financial services. Maps products against regulatory obligations, analyses documents (T&Cs, Fair Value Assessments, Target Market Assessments) using Claude, and generates a compliance matrix showing where you stand.

## What it does

- **Obligation database** — Seeded with FCA regulations (Consumer Duty, BCOBS, MCOB, CONC, PSR 2017) broken down into individual obligations with applicability mappings per product type
- **Product compliance matrix** — Create a product, and Tractable generates a matrix of every applicable obligation. Upload your documents and it analyses each one against those obligations automatically
- **AI document analysis** — Claude Sonnet 4.5 reads your T&Cs, FVA, or TMA and assesses each obligation as addressed / partially addressed / not addressed, with evidence quotes, gap identification, and recommendations
- **PDF/DOCX upload** — Drop a PDF or DOCX of your product terms at creation time; Tractable extracts the text, infers product details to pre-fill the form, and kicks off analysis in the background
- **Clause generation** — Generate compliant clause text for obligations that need addressing
- **Triage view** — Filter and sort the compliance matrix to focus on what needs attention

## Stack

- **Next.js 15** (App Router) + **React 19**
- **Tailwind CSS v4**
- **Prisma** + **PostgreSQL**
- **Claude API** (Anthropic SDK) for document analysis, obligation extraction, product extraction, and clause generation
- **pdf-parse** v2 + **mammoth** for PDF/DOCX text extraction

## Getting started

### Prerequisites

- Node.js 20+
- Docker (for PostgreSQL)
- Anthropic API key

### Setup

```bash
# Clone
git clone https://github.com/KilgoreHerring/JustReadTheInstructions.git
cd JustReadTheInstructions

# Install
npm install

# Start PostgreSQL
docker compose up -d

# Configure environment
cp .env.local.example .env.local
# Edit .env.local with your ANTHROPIC_API_KEY

# Also create .env for database URL
echo 'DATABASE_URL="postgresql://regmatrix:regmatrix@localhost:5432/regmatrix"' > .env

# Set up database
npx prisma db push
npm run db:seed

# Run
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

| Variable | Where | Description |
|---|---|---|
| `DATABASE_URL` | `.env` | PostgreSQL connection string |
| `ANTHROPIC_API_KEY` | `.env.local` | Your Anthropic API key |

## Project structure

```
src/
  app/                          # Next.js App Router pages + API routes
    api/
      extract-product/          # PDF/DOCX upload + Claude product extraction
      obligations/extract/      # AI obligation extraction from regulation text
      products/                 # Product CRUD + document upload + analysis
      regulations/              # Regulation listing
    products/                   # Product pages (list, detail, matrix, new)
    regulations/                # Regulation pages
    obligations/                # Obligation browser
    horizon/                    # Regulatory horizon scanning (placeholder)
  components/
    compliance-matrix.tsx       # The main matrix view with triage filtering
    document-upload.tsx         # Document upload slots (T&Cs, FVA, TMA)
    document-analysis-results.tsx
    product-form.tsx            # Product creation with PDF/DOCX auto-fill
    sidebar-nav.tsx             # Navigation
    context-panel.tsx           # Right-hand detail panel
    clause-generation-card.tsx  # AI clause generation
  lib/
    claude.ts                   # Claude API wrapper (streaming)
    document-analyser.ts        # Document analysis pipeline
    document-parser.ts          # PDF/DOCX text extraction
    matching-engine.ts          # Obligation-to-product matching + matrix generation
    obligation-extractor.ts     # AI extraction of obligations from regulation text
    product-extractor.ts        # AI extraction of product details from documents
    clause-generator.ts         # AI clause text generation
data/
  seed/                         # Seed data (regulators, product types, obligations)
prisma/
  schema.prisma                 # Database schema
  seed.ts                       # Database seeder
```

## Design

"The Modern Codex" — a three-zone viewport-locked layout with Newsreader for headings, Inter for body text, and JetBrains Mono for citations. Dark neutral palette with amber accents.

## Name

Named in the spirit of Iain M. Banks' Culture series. The repo name is a nod to the GSV *Just Read the Instructions*.

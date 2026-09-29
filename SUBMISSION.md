# MasalAI — Project Submission Document

## 1. Project Information & Links

- **Project Title**: MasalAI (Real Estate Lead Intelligence & CRM Platform)
- **Live URL**: [https://masal-ai-n668.vercel.app](https://masal-ai-n668.vercel.app)
- **GitHub Repository (Public)**: [https://github.com/hrishitapundir-commits/MasalAI](https://github.com/hrishitapundir-commits/MasalAI)
- **Demo Video Link (3 Minutes)**: [Paste your Loom / YouTube unlisted link here] *(Ensure permissions are set to "Anyone with the link can view")*

---

## 2. Executive Summary: What We Built

**MasalAI** is an AI-powered lead qualification, prioritization, and post-call conversational CRM designed specifically for real estate sales teams and voice agent pipelines.

### Key Capabilities:
1. **Standardized 6-Field Intake**: Captures Name, Location, Property Requirement, Budget, Timeline, and Customer Message with client-side validation and immediate local persistence.
2. **AI Sales Qualification (Gemini 2.5 Flash)**: Scores leads on a 0–100 scale using a transparent 4-part rubric (Budget Realism, Timeline Urgency, Requirement Specificity, Buying Signals).
3. **Prioritized Sales Dashboard**: Ranks leads with urgent prospects on top, complete with filter tabs (`ALL`, `HOT`, `WARM`, `COLD`), counts, follow-up date sorting, and instant 5-sample lead loader.
4. **Scannable Dossier**: Provides a 5-second intelligence view with score reasoning, extracted intent, requirements, objections, next-action guidance, and ready-to-send copyable outreach.
5. **Grounded Sales Copilot (Chat)**: A strictly grounded assistant answering *only* from the lead dossier (saying *"I don't know"* when information is missing) with quick-action prompt chips that rewrite suggested responses in real time (e.g., WhatsApp tone, assertive closing).
6. **Post-Call Intelligence & Adaptive Scoring (Phase 7 Innovation)**: Seamlessly ingests call notes or voice agent transcripts to dynamically re-qualify leads, visualize score deltas (e.g., `62 → 81`), explain what changed, extract suggested follow-up dates, and maintain an audit timeline.

---

## 3. Architecture & Model Integration

### Architecture Overview
- **Framework**: Next.js 16 (App Router) with TypeScript 5 and Tailwind CSS v4.
- **Persistence Layer**: Pluggable `LeadStorageAdapter` interface, implemented out-of-the-box with `LocalStorageLeadAdapter` for zero-configuration testing. Can be swapped for PostgreSQL/Supabase with zero UI refactoring.
- **Backend API**: Next.js Route Handlers (`/api/analyze-lead`, `/api/chat-lead`, `/api/update-call`) executing on the server to keep `GEMINI_API_KEY` secure.

### The Model & Prompt Strategy
- **Model**: Google Gemini 2.5 Flash (`gemini-2.5-flash`) via `@google/genai`.
- **Three-Part Prompt**: Role (Senior Sales Analyst), Strict JSON Schema Output, and 4-Part Scoring Rubric.
- **Guardrails**:
  - Delimits user messages and transcripts as untrusted data to prevent prompt injection.
  - Forbids inventing property prices or unavailable inventory.
  - Penalizes vagueness rather than assuming positive intent.
- **Validation & 1-Retry Fallback**: All model outputs are regex-extracted and validated against the TypeScript schema. Malformed responses trigger an automatic 1-retry fallback. Phase 8 adds safe error bailout for rate limits (HTTP 429) and invalid keys (HTTP 403).

---

## 4. Key Engineering Decisions

### Decision 1: "The Model Scores, My Code Buckets"
- **Rationale**: Many LLM applications ask the model to directly categorize a lead as *"HOT, WARM, or COLD"*. In practice, LLM classification boundaries drift across prompts, seasons, and model updates.
- **Our Approach**: The model outputs a continuous numeric score (`0–100`) and a factual reasoning sentence. Our deterministic business logic defines the classification thresholds:
  - **HOT**: Score $\ge 80$
  - **WARM**: Score $50–79$
  - **COLD**: Score $< 50$
- **Impact**: Guarantees predictable rankings across all agents, enables easy calibration as conversion benchmarks evolve, and makes scoring logic auditable in sales meetings.

### Decision 2: Pluggable Storage Adapter Pattern
- **Rationale**: Reviewers need to test the app instantly without setting up database connections or cloud credentials, but production CRM systems require relational persistence.
- **Our Approach**: Created the `LeadStorageAdapter` interface. The app ships with `LocalStorageLeadAdapter` containing 5 realistic pre-seeded leads. Swapping to Supabase or Prisma requires updating a single export in `src/lib/storage/leadStorage.ts`.

### Decision 3: Grounded-Only Chat Copilot
- **Rationale**: Real estate agents cannot afford hallucinations about customer budgets, pre-approvals, or property requirements.
- **Our Approach**: System prompt strictly limits answers to the lead record. If an inquiry references unrecorded data (e.g., buyer's pet preferences), the model outputs *"I don't know based on the provided lead context."*

### Decision 4: Post-Call Intelligence Loop
- **Rationale**: Initial lead scores go stale after the first phone conversation.
- **Our Approach**: Modeled after Masal's voice agents, reps or voice bots feed call transcripts into the system. The model updates objections, calculates score deltas (e.g., `+19 pts`), extracts follow-up dates, and logs an immutable timeline.

---

## 5. Known Limitations

1. **No Authentication / Multi-Tenancy**: Built for rapid prototype evaluation; lacks login/auth or role-based permissions.
2. **Browser-Bound Storage (`localStorage`)**: Leads are stored locally in the evaluator's browser and do not sync across different devices without a backend database.
3. **Heuristic vs. Calibrated Scoring**: The scoring rubric reflects industry best practices for luxury and residential real estate, but has not yet been calibrated against empirical historical deal conversion rates.
4. **Google Gemini Free-Tier Rate Limits**: The free Google AI Studio tier limits requests to 15 requests/minute. The app gracefully catches HTTP 429 and prompts the user to wait 30 seconds or configure their own API key.

---

## 6. AI Usage Disclosure

In compliance with project submission guidelines, the following AI tools and models were used during development and production runtime:

1. **Google Antigravity & Coding Assistant (Development)**:
   - Used for scaffolding Next.js 16 App Router boilerplate, writing TypeScript types, constructing Tailwind UI components, and generating sample test fixtures.
   - Assisted in writing robust schema-parsing regexes and edge-case handling for Gemini free-tier rate limits.
2. **Google Gemini 2.5 Flash (`gemini-2.5-flash`) (Runtime AI Engine)**:
   - **Lead Intake Analysis**: Evaluates buyer messages against market heuristics, calculates 0–100 qualification scores, identifies objections, and drafts outreach responses.
   - **Grounded Sales Copilot**: Grounded conversational assistant answering sales inquiries strictly within lead context.
   - **Post-Call Intelligence**: Processes raw call notes and transcripts to perform adaptive re-scoring, extract follow-up dates, and explain deal progress.

---

## 7. 3-Minute Demo Video Recording Script

| Time | Segment | Screen & Actions | Spoken Script |
| :--- | :--- | :--- | :--- |
| **0:00 - 0:35** | **Dashboard & Prioritization** | Open Dashboard. Click *"Load 5 Sample Leads"*. Toggle Hot/Warm/Cold tabs, show urgent badges, sort by follow-up date. | *"Welcome to MasalAI. In real estate sales, speed to lead and prioritization are everything. Our dashboard automatically ranks leads by urgency and qualification score. Reviewers can test immediately using the pre-seeded sample leads."* |
| **0:35 - 1:15** | **Lead Intake & AI Analysis** | Click *"+ Add a New Lead"*. Fill 6 fields (or use high-budget urgent prompt). Submit. Show instant transition to dossier. | *"Here we capture the 6 core fields. On submit, our server calls Gemini 2.5 Flash with a 4-part scoring rubric. In 5 seconds, agents see score reasoning, extracted intent, objections, next action, and a ready-to-send outreach message."* |
| **1:15 - 1:55** | **Grounded Chat & Live Rewrite** | Open Chat Copilot. Ask: *"What is the buyer's dog's name?"* (shows *"I don't know"*). Click *"Shorter WhatsApp version"*. | *"Our copilot is strictly grounded — it refuses to hallucinate facts not in the dossier. When I click 'Shorter WhatsApp version', it doesn't just chat — it actively rewrites the suggested response on the lead record in real time."* |
| **1:55 - 2:35** | **Post-Call Intelligence (Phase 7)** | Click *"Update after call"*. Insert positive transcript. Submit. Show score delta (`62 → 81`), timeline, and follow-up badge. | *"Initial scores go stale after the first call. With our post-call intelligence, agents or voice transcripts feed right back into the record, calculating score deltas like 62 to 81, logging what changed, and setting follow-up dates."* |
| **2:35 - 3:00** | **Engineering Decision & Wrap-Up** | Show score badge vs continuous score code. Highlight clean architecture. | *"A key architectural decision: 'the model scores, but our code buckets'. We let the model evaluate nuances on a continuous scale, but use deterministic code thresholds for Hot, Warm, and Cold for auditability and consistency. Thank you!"* |

---

## 8. Final Verification Checklist

- [x] **Repository is Public**: [https://github.com/hrishitapundir-commits/MasalAI](https://github.com/hrishitapundir-commits/MasalAI)
- [x] **Live URL Works Without Setup**: Evaluators can click *"Load 5 Sample Leads"* to test the full CRM immediately without configuring an API key.
- [x] **Zero Exposed Secrets**: `GEMINI_API_KEY` is strictly server-side; zero leaks in client bundles.
- [x] **Full CRUD Functionality**: Add, view, filter, chat, update post-call, and delete leads from both dashboard and detail view.
- [x] **Video Link Permissions**: Verify video link is open to anyone with the link before submitting.

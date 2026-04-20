# Phase 4: Draft Generation with Streaming - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-20
**Phase:** 04-draft-generation-with-streaming
**Areas discussed:** Streaming transport, GenerationForm placement, Progressive rendering UX, Dev page

---

## Streaming transport

| Option | Description | Selected |
|--------|-------------|----------|
| SSE endpoint | Dedicated generate-draft Edge Function streams SSE. React uses fetch + ReadableStream. tRPC for everything else. Spike function already exists. | ✓ |
| tRPC v11 streaming | Wire streaming through existing tRPC router using v11 httpBatchStreamLink. Unvalidated in Deno. | |

**User's choice:** SSE endpoint (recommended)
**Notes:** Chose simplicity — spike function already validates the non-tRPC standalone approach. tRPC streaming in Deno is unvalidated territory not worth the risk.

---

| Option | Description | Selected |
|--------|-------------|----------|
| NDJSON — one meal per line | Prompt Grok to emit one JSON object per line. Edge fn buffers tokens, emits SSE event per meal. Simple and reliable. | ✓ |
| Raw token stream | Stream raw tokens to client; client detects complete JSON objects. More complex. | |

**User's choice:** NDJSON — one meal per line (recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| One object per line, no wrapper | Simplest prompt: output one JSON object per line, no array, no wrapper. Edge fn detects \n and emits SSE event. | ✓ |
| Keep array, split server-side | Keep existing array schema; edge fn buffers full array then splits. Defeats streaming purpose. | |

**User's choice:** One object per line, no wrapper (recommended)

---

## GenerationForm placement

| Option | Description | Selected |
|--------|-------------|----------|
| /plan route inline | Form shows on /plan/:id in empty state. After submit, form gives way to streaming grid in place. | ✓ |
| CTA on /household | Generate CTA on household page, navigates to /plan with form pre-loaded. Two-step flow. | |
| New /generate route | Dedicated generation route, redirect to /plan/:newId after submit. Extra route adds complexity. | |

**User's choice:** /plan route inline (recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Button on /household | After saving household, "Generate Your Plan →" button appears. Navigates to /plan. | ✓ |
| Nav link | Top nav has Plan link. User navigates manually. | |

**User's choice:** Button on /household (recommended)

---

## Progressive rendering UX

| Option | Description | Selected |
|--------|-------------|----------|
| Skeleton grid → cards fill in | 7×3 skeleton grid immediately on submit. Each slot converts to real card as SSE event arrives. | ✓ |
| Cards append progressively | No skeleton. Cards appear one at a time, appending from top-left. | |
| Spinner until first meal | Spinner until first SSE event, then progressive card rendering. | |

**User's choice:** Skeleton grid → cards fill in (recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Title + short description | Phase 4 cards show title and description only. Rationale in DB but not displayed. | ✓ |
| Title + description + rationale | Rationale on every card. Dense. Better in detail view (Phase 5). | |

**User's choice:** Title + short description (recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Subtle "Plan ready" banner | After last SSE event, show brief success banner. Makes transition feel intentional. | ✓ |
| Nothing — grid becomes interactive | No signal. Cards visible; grid stops loading silently. | |

**User's choice:** Subtle "Plan ready" banner (recommended)

---

## Dev page

| Option | Description | Selected |
|--------|-------------|----------|
| Expand existing home page | Add LLM log section to home page (already the dev cockpit). No new route. | |
| New /dev route | Dedicated /dev page for all developer tools. Extensible for Phase 6. | ✓ |
| You decide | Leave to Claude. | |

**User's choice:** New /dev route

---

| Option | Description | Selected |
|--------|-------------|----------|
| Nav link (visible, not hidden) | Add "Dev" link to app nav. Visible to all in PoC. | ✓ |
| URL-only (no nav link) | No nav entry. Access /dev by typing URL. | |

**User's choice:** Nav link (visible, not hidden)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Skeleton with LLM section only | Build /dev as two-section layout now. "Spoonacular Usage" placeholder in Phase 4, filled in Phase 6. | ✓ |
| Plain page, refactor in Phase 6 | Just LLM log. Phase 6 restructures page. More churn later. | |

**User's choice:** Skeleton with LLM section only (recommended)

---

## Claude's Discretion

- Exact copy for "Generate Your Plan" button and "Your plan is ready" banner
- Skeleton shimmer animation style (CSS pulse vs wave)
- Day count selector widget type
- /dev nav label
- Error handling UX if SSE stream fails mid-generation

## Deferred Ideas

- Single-meal regeneration — Phase 5
- Inline edit / delete / detail view — Phase 5
- Spoonacular usage section on /dev — Phase 6
- Rationale display per meal card — Phase 5 detail view

# Roadmap: PlanPlate

## Overview

PlanPlate builds from zero frontend to a working AI meal planner in 7 phases. The journey starts by wiring the local dev environment end-to-end, gates entry behind auth, captures household preferences, delivers the core value (streaming draft generation), builds the management UI, enriches meals with real recipe data, and closes with finalization and favorites.

Each implementation phase should also include test coverage where it materially reduces regression risk: unit tests for domain logic, helpers, state transitions, and API contracts; end-to-end tests for critical user flows and cross-system integration.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Frontend Scaffold & Local Dev** - Vite + React 19 app running locally, tRPC client wired, `netlify dev` proxy confirmed
- [x] **Phase 2: Authentication** - Email/password sign-up, login, session persistence, password reset, and protected routes
- [x] **Phase 3: Household Setup** - Create and edit household with members, dietary preferences, appliances, and cooking skill
- [ ] **Phase 4: Draft Generation with Streaming** - GenerationForm triggers streaming Grok call; 21 meals render progressively in under 2 seconds; LLM logging + dev page
- [ ] **Phase 5: Meal Plan Grid & Management** - 7x3 MealPlanGrid with MealCard, inline edit, delete, detail view, and single-meal regeneration
- [ ] **Phase 6: Enrichment Flow** - Select draft meals, fetch Spoonacular data with cache-first lookup, view full recipe in MealFlyout; Spoonacular usage tracking on dev page
- [ ] **Phase 7: Finalization & Favorites** - Finalize plan with de-duplicated shopping list; mark and persist favorite meals

## Phase Details

### Phase 1: Frontend Scaffold & Local Dev
**Goal**: Developer can run the full app stack locally with a React frontend talking to Supabase via `netlify dev`
**Depends on**: Nothing (first phase)
**Requirements**: DEPL-01, DEPL-02
**Testing**: Add smoke-level E2E coverage for local app boot and tRPC `ping` through the Netlify-to-Supabase path; add unit tests for any shared frontend bootstrap or API client utilities created in this phase
**Success Criteria** (what must be TRUE):
  1. `netlify dev` starts without errors and serves the React app at localhost
  2. The app can call a tRPC `ping` query and receive a response from the local Supabase Edge Function
  3. All API keys are loaded from `supabase/functions/.env` without manual export steps
  4. The Netlify proxy routes `/functions/v1/*`, `/rest/v1/*`, and `/auth/v1/*` to local Supabase on ports 54331-54339
**Plans**: 3 plans
Plans:
- [x] `01-01-PLAN.md` — Bootstrap the React/Vite workspace, Netlify proxy, and editorial theme foundation
- [x] `01-02-PLAN.md` — Wire the router, placeholder routes, and visible home-page tRPC ping badge
- [x] `01-03-PLAN.md` — Add unit and end-to-end smoke coverage for local boot and ping-through-proxy
**UI hint**: yes

### Phase 2: Authentication
**Goal**: Users can securely create accounts, log in, and stay authenticated across sessions
**Depends on**: Phase 1
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04
**Testing**: Add unit tests for auth guards, session helpers, and auth-related form/state logic; add E2E coverage for sign-up, login, logout, protected-route redirect, and password-reset happy path
**Success Criteria** (what must be TRUE):
  1. User can sign up with email and password and is redirected to the app
  2. User can log in and the session persists when the browser tab is closed and reopened
  3. User can log out from any page and is redirected to the login screen
  4. User can request a password reset email and follow the link to set a new password
  5. Unauthenticated users who visit protected routes are redirected to login
**Plans**: 01-01, 01-02, 01-03
**UI hint**: yes

### Phase 3: Household Setup
**Goal**: Users can configure their household's preferences so the AI has all the context it needs to generate a personalized plan
**Depends on**: Phase 2
**Requirements**: HSHD-01, HSHD-02, HSHD-03, HSHD-04, HSHD-05
**Testing**: Add unit tests for household validation, member/preference transforms, and persistence helpers; add E2E coverage for create, edit, and revisit flows for household setup
**Success Criteria** (what must be TRUE):
  1. User can create a household with a name and cooking skill level (beginner / intermediate / advanced)
  2. User can add one or more household members with individual names
  3. User can set dietary preferences, allergies, and avoidances per member
  4. User can specify which appliances the household has (Instant Pot, air fryer, etc.)
  5. User can return to the household settings and edit any of the above details after initial creation
**Plans**: 4 plans
Plans:
- [x] `03-01-PLAN.md` — Wave 0 scaffold: schema migration (UNIQUE constraint), types/constants, validation helpers + unit tests, E2E stubs
- [x] `03-02-PLAN.md` — tRPC layer: auth headers on client, household.get + household.upsert procedures in Deno edge function
- [x] `03-03-PLAN.md` — UI: useHousehold hook + full household-page.tsx replacing placeholder
- [x] `03-04-PLAN.md` — E2E tests + human visual verification checkpoint
**UI hint**: yes

### Phase 4: Draft Generation with Streaming
**Goal**: Users can trigger a 21-meal draft plan that streams progressively to the screen, delivering the core < 2 second perceived response
**Depends on**: Phase 3
**Requirements**: GEN-01, GEN-02, GEN-03, GEN-04, GEN-06, DEVT-01, DEVT-03
**Testing**: Add unit tests for prompt-building, stream parsing, slot mapping, and LLM log persistence helpers; add E2E coverage for generation submission, progressive rendering, and streaming error handling
**Success Criteria** (what must be TRUE):
  1. User can open GenerationForm, select meal types (dinner only / lunch+dinner / all three) and day count, and submit
  2. The first meal titles appear on screen within 2 seconds of submitting (streaming, not batch)
  3. Meals populate progressively until all selected day-meal-type combinations are filled
  4. Generated meals respect the household's allergies, avoidances, cooking skill, and available appliances
  5. Each meal displays a title, short description, and LLM rationale
  6. Each LLM call is persisted to DB (prompt, response, tokens, timestamp); dev page shows last 10
**Plans**: 5 plans
Plans:
- [ ] `04-01-PLAN.md` — Wave 0: llm_logs migration + supabase db push [BLOCKING] + mealPlan.create tRPC mutation + devTools.llmLogs query + Wave 0 test stubs
- [ ] `04-02-PLAN.md` — Wave 1: generate-draft edge function rewrite — streaming NDJSON SSE + auth + real household + meal writes + llm_log persistence
- [ ] `04-03-PLAN.md` — Wave 2: React streaming consumer — types/parser lib + use-generation-stream hook + plan-page rewrite (GenerationForm + MealPlanGrid + banners)
- [ ] `04-04-PLAN.md` — Wave 3: Dev page (/dev route + LLMRequestsSection + SpoonacularPlaceholder) + AppFrame nav + household CTA button
- [ ] `04-05-PLAN.md` — Wave 4: E2E tests (generation flow, stream error) + full suite green + human visual verification checkpoint
**UI hint**: yes

### Phase 5: Meal Plan Grid & Management
**Goal**: Users can view their full draft plan in an organized grid and make basic edits without regenerating the entire plan
**Depends on**: Phase 4
**Requirements**: PLAN-01, PLAN-02, PLAN-03, PLAN-04, GEN-05
**Testing**: Add unit tests for meal-grid state updates, inline edit/delete/regenerate behaviors, and detail-view state logic; add E2E coverage for core grid management flows across a populated plan
**Success Criteria** (what must be TRUE):
  1. User sees a grid organized by day (columns) and meal type (rows) showing all generated meals
  2. User can click a meal title to edit it inline and the change is saved
  3. User can delete a meal from the plan and the slot becomes empty
  4. User can expand a meal to view its description and rationale without leaving the grid
  5. User can regenerate a single meal slot and a new AI-generated meal replaces only that slot
**Plans**: TBD
**UI hint**: yes

### Phase 6: Enrichment Flow
**Goal**: Users can upgrade selected draft meals with full Spoonacular recipe data and view complete recipe details in a flyout panel
**Depends on**: Phase 5
**Requirements**: ENRCH-01, ENRCH-02, ENRCH-03, ENRCH-04, ENRCH-05, DEVT-02, DEVT-04
**Testing**: Add unit tests for cache lookup/write paths, enrichment transforms, concurrency limits, and usage tracking helpers; add E2E coverage for select-and-enrich, cached re-open, and recipe flyout rendering flows
**Success Criteria** (what must be TRUE):
  1. User can select one or more draft meals in the grid and trigger enrichment
  2. Enrichment fetches real ingredients, nutrition, step-by-step instructions, and an image from Spoonacular
  3. Previously fetched recipes are served from the cache — no duplicate Spoonacular API calls for the same recipe
  4. Enriched meal cards update live in the grid (status chip changes, data available) without a full page reload
  5. User can open a flyout panel on any enriched meal and see the full recipe: ingredients, instructions, nutrition, and image
  6. Each Spoonacular call logs points consumed and running daily total; dev page shows points used vs 50pt limit
**Plans**: TBD
**UI hint**: yes

### Phase 7: Finalization & Favorites
**Goal**: Users can finalize their plan into a consolidated shopping list and save meals they love for future reference
**Depends on**: Phase 6
**Requirements**: FINAL-01, FINAL-02, FINAL-03, FAV-01, FAV-02
**Testing**: Add unit tests for shopping-list aggregation/de-duplication and favorites persistence logic; add E2E coverage for finalize-plan, shopping-list viewing/copy, and favorite/save/revisit flows
**Success Criteria** (what must be TRUE):
  1. User can click "Finalize Plan" and the plan transitions to a finalized state
  2. A consolidated, de-duplicated shopping list is generated from all enriched meal ingredients
  3. User can view the shopping list and copy it to clipboard
  4. User can mark any meal as a favorite from the grid or flyout
  5. Favorited meals appear in a persistent favorites library accessible across different meal plans
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Frontend Scaffold & Local Dev | 3/3 | Complete | 2026-04-19 |
| 2. Authentication | 3/3 | Complete | 2026-04-20 |
| 3. Household Setup | 4/4 | Complete | 2026-04-20 |
| 4. Draft Generation with Streaming | 0/5 | Not started | - |
| 5. Meal Plan Grid & Management | 0/TBD | Not started | - |
| 6. Enrichment Flow | 0/TBD | Not started | - |
| 7. Finalization & Favorites | 0/TBD | Not started | - |

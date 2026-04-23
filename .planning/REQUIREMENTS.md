# Requirements: PlanPlate

**Defined:** 2026-04-19
**Core Value:** Users see a complete draft meal plan in under 2 seconds (via streaming), then stay in control of exactly which meals get enriched with full recipes.

## v1 Requirements

### Authentication

- [ ] **AUTH-01**: User can sign up with email and password
- [ ] **AUTH-02**: User can log in and stay logged in across browser sessions
- [ ] **AUTH-03**: User can log out from any page
- [ ] **AUTH-04**: User can reset password via email link

### Household Setup

- [ ] **HSHD-01**: User can create a household with a name and cooking skill level
- [ ] **HSHD-02**: User can add household members with names
- [ ] **HSHD-03**: User can set dietary preferences, allergies, and avoidances per member
- [ ] **HSHD-04**: User can specify household appliances (Instant Pot, air fryer, etc.)
- [ ] **HSHD-05**: User can edit household and member details after creation

### Draft Generation

- [x] **GEN-01**: User can trigger a meal plan draft, selecting how many days and which meal types to include (e.g. dinner only, lunch + dinner, all three)
- [x] **GEN-02**: Draft plan streams to the client — meals appear progressively (not batch)
- [x] **GEN-03**: Generated meals respect all household allergies and avoidances
- [x] **GEN-04**: Generated meals match household cooking skill level and available appliances
- [ ] **GEN-05**: User can regenerate a single meal without regenerating the full plan
- [x] **GEN-06**: Each meal includes title, short description, and LLM rationale

### Meal Plan Management

- [ ] **PLAN-01**: User sees a 7×3 grid of meals organized by day and meal type (breakfast/lunch/dinner)
- [ ] **PLAN-02**: User can edit a meal's title inline
- [ ] **PLAN-03**: User can delete a meal from the plan
- [ ] **PLAN-04**: User can view meal details (description, rationale) from the grid

### Enrichment

- [ ] **ENRCH-01**: User can select one or more draft meals to enrich with real recipe data
- [ ] **ENRCH-02**: Enrichment fetches ingredients, nutrition, instructions, and image from Spoonacular
- [ ] **ENRCH-03**: Previously fetched recipes are served from cache (no duplicate API calls)
- [ ] **ENRCH-04**: User sees enriched meal data update live in the grid after enrichment completes
- [ ] **ENRCH-05**: User can view full recipe details (ingredients, instructions, nutrition, image) in a flyout panel

### Finalization

- [ ] **FINAL-01**: User can finalize a meal plan after reviewing enriched meals
- [ ] **FINAL-02**: Finalized plan generates a de-duplicated consolidated shopping list
- [ ] **FINAL-03**: User can view and copy the shopping list

### Favorites

- [ ] **FAV-01**: User can mark any meal as a favorite
- [ ] **FAV-02**: Favorited meals are saved to the user's favorites library across plans

### Dev Tools

- [x] **DEVT-01**: App persists the last 10 LLM prompt + response pairs to the DB (timestamp, model, tokens used, full prompt, full response)
- [ ] **DEVT-02**: App tracks Spoonacular API usage per calendar day — points consumed and requests made — stored in DB (limit: 50 points/day free plan)
- [x] **DEVT-03**: Developer page shows LLM request log: last 10 entries with prompt, response, token count, and timestamp
- [ ] **DEVT-04**: Developer page shows Spoonacular daily usage: points used vs 50pt limit, requests made, per-call point cost breakdown

### Local Dev Environment

- [ ] **DEPL-01**: App runs locally via `netlify dev` proxying to local Supabase (ports 54331–54339)
- [ ] **DEPL-02**: All API keys loaded from `supabase/functions/.env` for local dev

## v2 Requirements

### Production Deployment

- **PROD-01**: Frontend deploys to Netlify with auto-deploy from main branch
- **PROD-02**: Edge Functions deploy to Supabase hosted platform
- **PROD-03**: All API keys stored as Supabase Edge Function secrets

### Collaboration

- **COLLAB-01**: Household members can share access to a plan
- **COLLAB-02**: Multiple users can edit a plan simultaneously

### Nutrition Targeting

- **NUTR-01**: User can set macro/calorie targets per household member
- **NUTR-02**: Generated plan auto-balances against set macro targets

### Enhanced AI

- **AI-01**: Optional second LLM call to score and rebalance the generated plan
- **AI-02**: AI suggests substitutions for allergies in enriched recipes

### Notifications

- **NOTF-01**: User receives email when long-running enrichment batch completes

## Out of Scope

| Feature | Reason |
|---------|--------|
| Per-meal LLM agents | Cost, latency, consistency — single call is the architecture |
| AI image generation | Deferred to v3.0 (Grok Imagine / Flux) |
| OAuth / SSO login | Email/password sufficient for PoC |
| Mobile native app | Web-first, editorial design is mobile-responsive |
| Real-time collaborative editing | v2.0 — adds significant complexity |
| Macro/calorie balancing | v2.5 — requires additional nutrition data layer |
| Critic agent (balance scoring) | v1.5 — only if quality feedback requires it |
| Job queue / worker pattern | Only needed at >5k daily generations |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 2 | Pending |
| AUTH-02 | Phase 2 | Pending |
| AUTH-03 | Phase 2 | Pending |
| AUTH-04 | Phase 2 | Pending |
| HSHD-01 | Phase 3 | Pending |
| HSHD-02 | Phase 3 | Pending |
| HSHD-03 | Phase 3 | Pending |
| HSHD-04 | Phase 3 | Pending |
| HSHD-05 | Phase 3 | Pending |
| GEN-01 | Phase 4 | Complete |
| GEN-02 | Phase 4 | Complete |
| GEN-03 | Phase 4 | Complete |
| GEN-04 | Phase 4 | Complete |
| GEN-05 | Phase 5 | Pending |
| GEN-06 | Phase 4 | Complete |
| PLAN-01 | Phase 5 | Pending |
| PLAN-02 | Phase 5 | Pending |
| PLAN-03 | Phase 5 | Pending |
| PLAN-04 | Phase 5 | Pending |
| ENRCH-01 | Phase 6 | Pending |
| ENRCH-02 | Phase 6 | Pending |
| ENRCH-03 | Phase 6 | Pending |
| ENRCH-04 | Phase 6 | Pending |
| ENRCH-05 | Phase 6 | Pending |
| FINAL-01 | Phase 7 | Complete |
| FINAL-02 | Phase 7 | Complete |
| FINAL-03 | Phase 7 | Complete |
| FAV-01 | Phase 7 | Complete |
| FAV-02 | Phase 7 | Complete |
| DEVT-01 | Phase 4 | Complete |
| DEVT-02 | Phase 6 | Pending |
| DEVT-03 | Phase 4 | Complete |
| DEVT-04 | Phase 6 | Pending |
| DEPL-01 | Phase 1 | Pending |
| DEPL-02 | Phase 1 | Pending |

**Coverage:**
- v1 requirements: 35 total
- Mapped to phases: 35 (100%)
- Unmapped: 0

---
*Requirements defined: 2026-04-19*
*Last updated: 2026-04-21 after Phase 4 completion*

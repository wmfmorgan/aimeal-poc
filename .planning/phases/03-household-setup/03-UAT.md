---
status: complete
phase: 03-household-setup
source: [03-UI-SPEC.md, 03-VALIDATION.md, tests/e2e/household-setup.spec.ts]
started: 2026-04-20T15:13:33Z
updated: 2026-04-20T15:35:07Z
---

## Current Test

[testing complete]

## Tests

### 1. First-Time Household Setup Surface
expected: Sign in with a fresh account and land on `/household`. You should see the welcome nudge ("Set up your household to get personalised plans"), an empty household form, and no crash or loading dead-end.
result: pass

### 2. Save Validation on Empty Form
expected: On a fresh `/household` page, clicking `Save Household` with no household name, no cooking skill, and no members should keep you on the same page and show clear validation errors instead of saving.
result: pass

### 3. Add and Edit a Member Inline
expected: Clicking `+ Add Member` should add a member row inline. You should be able to enter a name, toggle allergens, set a diet type, and collapse the editor with `Done Editing` without any modal or page transition.
result: pass

### 4. Member Delete Confirmation
expected: Clicking `Remove` on a member should show an inline confirmation prompt. `Cancel` should dismiss it without deleting. Confirming removal should delete the member and show the empty-members state if none remain.
result: pass

### 5. Save Household Without Redirect
expected: Fill a valid household with at least one member and click `Save Household`. The page should stay on `/household`, show the success banner (`Household saved. Your meal plans will reflect these preferences.`), and keep the saved values visible in the form.
result: pass

### 6. Revisit Prefills Saved Data
expected: After saving, leave `/household` and come back. The previously saved household name, members, preferences, and appliances should be prefilled instead of resetting to blank.
result: pass

### 7. Welcome Nudge Hides After Save
expected: Once a household already exists, revisiting `/household` should no longer show the first-time welcome nudge. The page should open directly into the saved household editor state.
result: pass

## Summary

total: 7
passed: 7
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none yet]

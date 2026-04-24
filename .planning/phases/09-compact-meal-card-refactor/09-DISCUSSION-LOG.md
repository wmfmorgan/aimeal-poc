# Phase 9: Compact Meal Card Refactor - Discussion Log

**Date:** 2026-04-23
**Status:** Completed

## Areas Discussed

### Card payload by context

**Question:** For dense grid cards, what should be visible by default?
- Option presented: `Title + status + favorite state + primary actions only`
- Option presented: `Title + status + one-line summary + primary actions`
- Option presented: `Title + status only, with almost no actions visible`
- **Selected:** `Title + status + favorite state + primary actions only`

**Question:** For focused card contexts, how much more can the card show before it should defer to the flyout?
- Option presented: `Same compact payload as the grid, just roomier styling`
- Option presented: `Compact payload plus one short supporting line`
- Option presented: `Allow larger cards to show rationale/description blocks`
- **Selected:** `Same compact payload as the grid, just roomier styling`

**Question:** When the surrounding layout already communicates meal type, should the card still show breakfast/lunch/dinner?
- Option presented: `Hide it entirely in those contexts`
- Option presented: `Hide it in dense grid only, keep it in focused cards`
- Option presented: `Always show it somewhere on the card`
- **Selected:** `Hide it entirely in those contexts`

**Question:** If a focused card uses the same compact payload, where should richer context live?
- Option presented: `Only in the flyout`
- Option presented: `In the surrounding page layout, not inside the card`
- Option presented: `Case by case`
- **Selected:** `Only in the flyout`

### Card action model

**Question:** In the dense grid, what should the primary interaction be?
- Option presented: `Click anywhere on the card to open the flyout`
- Option presented: `Click most of the card, but reserve a visible sub-area for actions`
- Option presented: `Keep explicit action buttons as the main way in`
- **Selected:** `Click anywhere on the card to open the flyout`

**Question:** Which actions should remain directly visible on compact cards?
- Options discussed: direct delete, direct regenerate, favorite moved off card
- **Selected:** `Delete and regenerate stay on the card; favorite moves to the flyout`

**Question:** If regenerate stays off the card, where should it live?
- Clarification discussed in freeform
- **Selected:** `Regenerate should remain on the card`

**Question:** How should favorite state appear on the compact card?
- Clarification discussed in freeform
- **Selected:** `Favorite should not appear on the card; use a clickable star in the flyout`

**Follow-up Question:** How should delete and regenerate be presented on the compact card?
- Option presented: `Both as compact icons`
- Option presented: `Delete as icon, regenerate as a small text/button treatment`
- Option presented: `Both as small text/button treatments`
- **Selected:** `Both as compact icons, with a tooltip`

### Delete affordance

**Question:** Where should the delete icon live on the compact card?
- Option presented: `Top-right corner of the card chrome`
- Option presented: `In a small trailing actions cluster`
- Option presented: `Only on hover/focus overlay`
- **Selected:** `Top-right corner of the card chrome`

**Question:** Should delete stay visible all the time?
- Option presented: `Yes, always visible`
- Option presented: `Visible on hover/focus, but reserved space keeps layout stable`
- Option presented: `Visible only when the card is focused/active`
- **Selected:** `Yes, always visible`

**Question:** Should the current inline confirmation pattern stay?
- Option presented: `Yes, keep inline confirmation after clicking the delete icon`
- Option presented: `Move confirmation into the flyout`
- Option presented: `Use a toast/undo instead of inline confirmation`
- **Selected:** `Yes, keep inline confirmation after clicking the delete icon`

### Focused card use cases

**Question:** Should focused cards behave the same way as dense cards when clicked?
- Option presented: `Yes, click opens the flyout everywhere cards are used`
- Option presented: `Usually yes, but allow some focused contexts to be static`
- Option presented: `No, focused cards should behave differently`
- **Selected:** `Yes, click opens the flyout everywhere cards are used`

**Question:** Should compact focused cards also keep the same direct icon actions as dense cards?
- Option presented: `Yes, same delete/regenerate icon actions with tooltips`
- Option presented: `No, focused cards should defer all actions to the flyout`
- Option presented: `Keep only delete, move regenerate to the flyout`
- **Selected:** `Yes, same delete/regenerate icon actions with tooltips`

**Question:** How much visual difference should there be between dense and focused cards?
- Option presented: `Same information and behavior, only spacing/size can expand a bit`
- Option presented: `Same behavior, but focused cards can look more premium/distinct`
- Option presented: `Make them visually quite different as long as content stays compact`
- **Selected:** `Same information and behavior, only spacing/size can expand a bit`

## Deferred Ideas

None.

---

*Phase: 09-compact-meal-card-refactor*
*Discussion completed: 2026-04-23*

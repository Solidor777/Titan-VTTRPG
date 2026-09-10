# Deferred Work / Backlog

Work that has been intentionally parked. Each item should graduate into its own
spec (`docs/superpowers/specs/`) and plan (`docs/superpowers/plans/`) when picked up.
Completed items are deleted, not marked done.

## UX/UI redesign

### 26. Redesign surface passes (after the theming foundation ships)

- **What:** Per-surface refinement passes on top of the redesign foundation
  (`specs/2026-06-10-ux-redesign-foundation-design.md`): character sheet layout, item/effect
  sheets, chat cards in detail, dialogs, Effect Tray. Each pass is its own spec, prototyped
  in the visual companion first, executed one at a time. These passes are also the gap-finder
  for TODO #12's retheme-driven shared-component increments. (The Effect HUD pass is superseded:
  the Player HUD — spec `specs/2026-06-11-player-hud-design.md` — replaced that surface wholesale;
  the Effect **Tray** sidebar pass remains.)
- **Why deferred:** The foundation (token contract, ThemeManager, four built-in themes, theme
  editor, shared-primitive restyle, chat visibility treatment) shipped on `feature/theme-foundation`
  (2026-06-10); the passes apply the language it defines, surface by surface.


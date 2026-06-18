# Open Bugs

Deferred/known bugs. Todos (planned work) live in `docs/TODO.md`; this file is bugs only.

### 1. Chat resource-mod tag gradients reference an undefined named palette

- **What:** The named brand palette `--titan-blue`, `--titan-green`, `--titan-yellow`,
  `--titan-maroon`, `--titan-orange`, and `--titan-cyan` is defined nowhere in `src/`. The three
  resource-mod tag gradient mixins in `src/styles/Mixins/SystemMixins.scss` (`fast-healing-tag`
  green→yellow, `persistent-damage-tag` maroon→orange, `resolve-regain-tag` blue→cyan), consumed by
  `ChatMessageResourceModTag.svelte`, build `--titan-tag-background` from these undefined tokens, so
  the gradient resolves to an invalid value and the tag falls back to its base background.
- **Severity:** Cosmetic; the tags still render with a flat fallback background, just not the
  intended gradient.
- **Found:** 2026-06-18, during the player-HUD styling bug-fix brainstorm. The HUD's own
  `--titan-cyan` accent was fixed in that batch via a themed `accent-color` token (CLOSED_BUGS #27);
  these chat-tag references were left for a dedicated fix.
- **Fix direction:** Map each gradient endpoint to an existing themed semantic token (e.g. stamina /
  wounds / resolve) or add the named palette to the theme contract.

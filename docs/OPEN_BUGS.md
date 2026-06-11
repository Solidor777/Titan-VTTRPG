# Open Bugs

Deferred/known bugs. Todos (planned work) live in `docs/TODO.md`; this file is bugs only.

### 1. Effect HUD renders in the bottom right with its elements smooshed together

- **What:** After the theming-foundation restyle (`feature/theme-foundation`), the native Effect HUD
  (`src/ui/effect-hud/`, fixed-position container appended to `#interface`) renders in the bottom
  right with all of its elements compressed together. Likely fallout from the static-tier/structure
  token changes or the panel/border mixin rework the HUD shell styles depend on.
- **Found:** 2026-06-10 by the user during the second theming-foundation visual pass.
- **Next:** Fix on the theming branch before merge. Invoke `titan-codebase`, `foundry-svelte`,
  `svelte-5`, and the UI skill family (`ux-foundation`, `web-ux-design`, `ui-style-reference`)
  before touching the HUD components.

# TITAN UX/UI Redesign — Foundation (Theming System + Design Language)

**Date:** 2026-06-10
**Status:** Approved by user (brainstorm with visual companion; all palette/language choices validated on mockups)

## Goals

A clean, modern UI for all TITAN application surfaces that is easy to read and quickly scannable, with
selectable light and dark themes and user theme customization. Recognizability features are preserved:
distinct shapes/colors for buttons, tags, and inputs; stable color + icon identity for attributes,
resistances, resources, rarities, and effect types; inline roll information on roll buttons stays.

**Guiding principles (user mandate):**

- Palette and language decisions below are **guidelines, not hard rules** — exact values are tuned for
  contrast and readability during implementation.
- Readability and at-a-glance scanning outrank aesthetics: text contrast, size, weight, spacing, and
  panel count are all evaluated against "how fast can you find the value you need".
- **No white text on saturated fills.** Colored elements use soft tint fills with deep matching text
  (validated cause of eye strain in mockups).
- Color is never the sole information carrier (e.g. chat visibility also gets a text badge).

## Scope

- **In:** TITAN apps only — sheets, dialogs, the Effect Tray/HUD, and TITAN chat messages.
- **Out:** Foundry core UI (sidebar chrome, scene controls, core apps).

### Decomposition

This spec is the **foundation**: token restructure, theme system, four built-in themes, customization
(editor/export/import/reset), the design language applied to shared primitives, and the chat visibility
treatment. Because all surfaces consume the shared mixins/tokens, the foundation reskins every TITAN
surface consistently.

**Follow-up surface passes** (each its own spec, browser-prototyped first, one at a time): character
sheet layout, item/effect sheets, chat cards in detail, dialogs, Effect Tray/HUD. Logged in
`docs/TODO.md` when this spec's plan completes.

## Decisions (validated in brainstorm)

| Topic | Decision |
|---|---|
| Theme control | Per-user client setting + GM-set world defaults (one dark, one light) |
| Foundry core sync | Client default is **Auto (match Foundry)** — resolves to the world-default dark/light theme from Foundry core's color scheme; picking a specific theme overrides |
| Identity colors | Fixed hue families across themes (Body red-ish, Mind green-ish, Soul teal-ish, etc.); each theme tunes lightness/saturation |
| Customization depth | **All colors + the two font families** are user-editable. Spacing, radius, sizing are NOT exposed |
| Dark theme 1 | **Catppuccin Macchiato** (official palette, MIT, attribution retained) |
| Dark theme 2 | **Heritage Dark** — current TITAN identity (blue-grey panels, peach buttons, lavender inputs, pastel identity chips) refined on a deeper, consistent neutral ramp |
| Light theme 1 | **Heritage Light** — same TITAN pastel identity on white panels over a soft gray ground |
| Light theme 2 | **Clean Neutral Light** — white + cool gray, single indigo action tint, identity colors as gentle tints with deep matching text |
| Design language | **Soft & airy**: large radii, borderless depth via background steps, generous padding, 13-14px base text, sentence-case headings. Density may tighten toward the "balanced" variant (subtle 1px-bordered panels, row dividers, small uppercase section labels) where real content demands it |
| Typography | **Keep Lato (UI) + Open Sans (rich text)** — won the comparison against Inter/Figtree/Plex pairings. Fonts remain per-theme customizable |
| Chat visibility | **Body tint + deeper header band of the same hue + text badge** for secret (whisper) and GM-only (blind) messages. Badge: centered, large enough to read comfortably, with clear spacing from the speaker name |
| Architecture | **Theme-as-data + runtime ThemeManager** (approach A below) |

## Architecture

### Token restructure (two tiers)

`src/styles/Variables.scss` changes role from "the one theme" to "token contract + static tier".

- **Tier 1 — theme palette (themed, ~55-65 tokens + 2 fonts).** Every color, semantically named:
  - Surfaces: app background, panel levels 1-3, window header/title bar, window content background.
  - Text: primary, muted, on-accent; content links; editor menu.
  - Borders, scrollbar (thumb/gutter), highlight.
  - Buttons: default/hover/disabled (+ action vs. spell variants), icon buttons.
  - Inputs: background/border/text + hover/disabled. Labels. Tags. Calculated (static) values.
  - Identity sets: attributes ×3, resistances ×3, resources ×3, rarities ×3, effect types ×6,
    dice results ×4, check succeeded/failed, mod lesser/greater. Meters.
  - Chat: public/secret/GM-only — each as a body-tint + header-band + badge fill/text group.
  - Fonts: UI family, rich-text family.
- **Tier 2 — structure (static, never themed):** spacing scale, radius scale, border widths/styles,
  font sizes/weights/line heights, meter heights, input/button metrics, sidebar metrics, list resets.

**Pairing rule (schema-enforced):** every colored fill token has a sibling text token
(`…-bg` / `…-fg`). Mixins always consume the pair; themes cannot produce unreadable combinations.

### Theme system

- Built-in themes are data modules: `{ id, name, dark: boolean, tokens: { [tokenName]: value } }`.
- **ThemeManager** (new, `src/styles`-adjacent JS module) resolves the active theme:
  user client setting → if `auto`: Foundry core color scheme selects between the GM's world-default
  dark and light themes (defaults: Macchiato / Heritage Light).
- Applies the resolved tokens by writing one generated `<style>` element of CSS custom properties
  scoped to TITAN roots (app root class for sheets/dialogs/HUD; message wrapper class for chat
  messages). Re-resolves on setting change — instant, in-place, no reload, no FOUC.
- SCSS mixins keep consuming `var(--titan-…)` unchanged in mechanism; only names migrate to the
  semantic contract.

**Settings:**

- `world`: default dark theme id, default light theme id (GM).
- `client`: selected theme id (`auto` default), custom themes (named array of theme objects).

### Customization

- **Theme editor** — TITAN ApplicationV2 + Svelte app via `game.settings.registerMenu`. Flow:
  pick base theme → duplicate → edit colors grouped by semantic category (fill/text pairs presented
  together) and fonts (bundled-font dropdown + free entry) → live preview specimen (attribute chips,
  roll buttons with inline info, tags, input, meters, the three chat cards).
- **Export:** theme JSON `{ formatVersion, id, name, dark, tokens }` via file download.
- **Import:** file pick + validation — unknown tokens ignored; missing tokens filled from the declared
  base theme (fallback: default dark/light); malformed files rejected with a clear error; never a
  half-applied theme.
- **Reset:** built-ins are immutable; reset deletes/reverts custom themes and restores settings.

## Starting palette values (guidelines — tune for contrast in implementation)

- **Macchiato:** base `#24273a`, crust `#181926`, surface `#363a4f`, text `#cad3f5`; identity hues map
  to official Macchiato accents (Body→red `#ed8796`, Mind→green `#a6da95`, Soul→teal `#8bd5ca`,
  buttons→peach `#f5a97f`, spell→mauve `#c6a0f6`, tags→blue `#8aadf4`).
- **Heritage Dark:** base `#262836`, crust `#1b1c26`, surfaces `#373949`/`#424557`, text `#d8dbe8`;
  current identity pastels retained (`#f29d8c`/`#95f28c`/`#b5f2e8`, peach `#f2b58c`, lavender
  `#c5bcf8`, tag `#a6ccf2`) with dark text on fills.
- **Heritage Light:** ground `#f4f4f6`, white panels, text `#262626`; same pastels with deep matching
  text (e.g. body chip `#f29d8c`/`#3d1f18`).
- **Clean Neutral Light:** base `#ffffff`, surface `#f5f6f8`, text `#1f2430`; identity tints
  (`#fde2e2`/`#991b1b` etc.), indigo action tint `#e2e4fb`/`#3730a3`.
- **Chat (dark-theme guideline values):** public body `#2e3044`; secret body `#2c2a4e`, band `#232148`;
  GM-only body `#3a2440`, band `#2f1c35`; badges as lighter fills of the band hue with pale text.
- Resource/dice meters may stay saturated (thin bars, not text carriers).

## Error handling

- Import validation as above (the only real user-input boundary).
- Theme resolution falls back to the default dark theme if a stored id no longer exists
  (e.g. deleted custom theme).

## Testing

- **Unit:** theme resolution matrix (auto/manual × core scheme × world defaults × missing id
  fallback); import validation (unknown/missing/malformed); built-in completeness — every contract
  token present, every `…-bg` has its `…-fg`.
- **E2E:** switching theme live-updates an open sheet and a rendered chat message; custom theme
  export→import round-trip; secret/GM-only messages render band + badge; reset restores defaults.

## Documentation (required final step of the implementation plan)

- Update `titan-codebase` skill references (architecture, conventions) for the token contract and
  ThemeManager.
- Log follow-up surface passes in `docs/TODO.md`; clear completed items.

## Plan-time amendments (2026-06-10, user-approved)

- The legacy `darkModeSheets` / `darkModeChatMessages` / `darkModeJournals` settings, their accessors,
  the two journal render hooks, and every `titan-dark-mode` class push are removed — the class has been
  CSS-inert since the v14 migration, so all three settings are visual no-ops today.
- New client setting `themeCoreMessages` (default ON): applies the theme's chat surface (public +
  visibility tints, no badge) to non-TITAN chat messages via a `titan-core-themed` class.
- The theme system lives in `src/theme/` (data, manager, pure helpers, editor app).
- Meter shadows stay in the static tier (alpha overlays, not theme colors). Theme token values are
  6-digit hex (8-digit accepted on import). Built-in theme names are raw display strings; editor token
  labels are prettified token names, group headings localized.

## Attribution

Catppuccin palette values © Catppuccin Org, MIT — attribution retained in source where the palette
is embedded.

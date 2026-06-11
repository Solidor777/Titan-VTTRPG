# UX/UI Redesign Foundation — Theming System + Design Language Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `mainline-plan-execution` (Fable-class standing rule in
> `~/.claude/CLAUDE.md` — supersedes subagent-driven-development for plan execution) to implement this plan
> task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace TITAN's single hard-coded dark palette with a theme system — semantic two-tier tokens, four
built-in themes, per-user selection with GM world defaults and Foundry-core Auto, a theme editor with
export/import/reset, the soft & airy design language on shared primitives, and the chat visibility treatment.

**Architecture:** Theme-as-data + runtime ThemeManager (spec approach A). `src/styles/Variables.scss` keeps only
the static structure tier; all colors + the two font families move into theme data modules under `src/theme/`.
A ThemeManager resolves the active theme (client setting → Auto via Foundry core's `theme-dark`/`theme-light`
body class → GM world defaults) and injects one `<style id="titan-theme-style">` of `--titan-*` custom
properties on `:root`. Only TITAN styles consume `--titan-*`, so core UI is untouched. Spec:
`docs/superpowers/specs/2026-06-10-ux-redesign-foundation-design.md` (+ plan-time amendments recorded there).

**Tech Stack:** Foundry v14 (ApplicationV2, client settings, `registerMenu`), Svelte 5 runes, SCSS mixins,
Vitest (happy-dom), Playwright shared-world e2e.

**Plan-time decisions (user-approved 2026-06-10):**
1. The three legacy dark-mode settings (`darkModeSheets`, `darkModeChatMessages`, `darkModeJournals`), their
   accessors, the two journal hooks, and every `titan-dark-mode` class push are REMOVED (the class has been
   CSS-inert since the v14 migration).
2. New client setting `themeCoreMessages` (default ON) applies the theme's chat surface to non-TITAN messages
   via a `titan-core-themed` class (replaces the old `darkModeChatMessages: 'all'` behavior).
3. Theme system lives in `src/theme/`.
4. Meter shadows (`--titan-meter-shadow-1/2`) stay in the static tier (alpha overlays, not theme colors).
5. Theme token values are 6-digit hex (8-digit accepted on import); theme `name` is a raw display string;
   editor token labels are prettified token names (not localized) — group headings are localized.

**Foundry v14 facts verified against live source:**
- `game.settings.get('core', 'uiConfig').colorScheme` = `{ applications: ""|"dark"|"light", interface: ... }`;
  `Game#configureUI` resolves `""` via `matchMedia` and sets `theme-dark`/`theme-light` on `document.body`
  (`client/game.mjs:1824-1854`). Auto-follow = read the body class + a MutationObserver on it.
- `foundry.utils.saveDataToFile(data, type, filename)` and `foundry.utils.readTextFromFile(file)` exist
  (`client/utils/helpers.mjs:117,137`).
- `game.settings.registerMenu` accepts an ApplicationV2 subclass as `type` (`client/helpers/client-settings.mjs:191`).

---

## File structure

| File | Responsibility |
|---|---|
| `src/theme/ThemeTokenContract.js` (new) | The token contract: color/font token lists, editor groups, bg→fg pairs, `TitanTheme` typedef. |
| `src/theme/themes/HeritageDark.js` / `HeritageLight.js` / `Macchiato.js` / `CleanNeutralLight.js` (new) | The four built-in theme data modules. |
| `src/theme/BuildThemeStylesheetText.js` (new) | Pure: theme → `:root { --titan-*: …; }` CSS text. |
| `src/theme/ResolveActiveThemeId.js` (new) | Pure: settings snapshot → active theme id. |
| `src/theme/ValidateThemeData.js` (new) | Pure: imported JSON → normalized theme or error. |
| `src/theme/ThemeManager.js` (new) | Singleton: theme lookup, stylesheet injection, auto-follow observer, custom-theme CRUD, import/export. |
| `src/theme/editor/ThemeEditorApplication.js` (new) | ApplicationV2 host for the editor (TitanDialog mount pattern). |
| `src/theme/editor/ThemeEditorShell.svelte` (new) | Editor UI: picker, name/dark, grouped color+font editors, actions. |
| `src/theme/editor/ThemePreviewPane.svelte` (new) | Live specimen preview driven by the draft tokens. |
| `src/theme/editor/PrettifyTokenName.js` (new) | Pure: `'app-background'` → `'App Background'`. |
| `src/styles/Variables.scss` (modify) | Static tier only; soft & airy structure values. |
| `src/styles/Global.scss` (modify) | New chat visibility + badge + core-themed rules. |
| `src/styles/Mixins/{Button,Attribute,Resistance,Rarity}Mixins.scss` (modify) | Flat buttons; identity fg pairing. |
| `src/system/SystemSettings.js` (modify) | +6 theme settings & menu; −3 legacy dark settings. |
| `src/helpers/Settings/ThemeCoreMessages.js` (new); `DarkMode*.js` ×3 (delete) | Setting accessors. |
| `src/document/types/chat-message/ChatMessage.js` (modify) | Visibility classes + badge; core-themed class; drop dark-mode. |
| `src/document/sheet/TitanDocumentSheet.js`, `src/helpers/dialogs/Dialog.js` (modify) | Drop `titan-dark-mode` push. |
| `src/hooks/OnRenderJournalSheet.js`, `OnRenderJournalTextPageSheet.js` (delete); `src/index.js`, `src/hooks/OnceInit.js` (modify) | Hook removal; ThemeManager wiring. |
| `lang/en.json` (modify) | Setting/editor/badge strings; remove dark-mode strings. |
| `tests/unit/ThemeContract.test.js`, `ThemeHelpers.test.js` (new) | Contract completeness/pairing; pure helpers. |
| `tests/e2e/theme.spec.js` (new); `tests/e2e/effect-chat-card.spec.js` (modify) | Live switch/auto/round-trip/badges; rewrite dark-mode probe. |

Execution rule: every `.svelte` file is written under the `titan-svelte-dev` domain rules (mainline execution
applies them directly). All code follows `.claude/CLAUDE.md` style (120-col, typed comments, multiline objects).

---

### Task 0: Branch

- [ ] **Step 1:** `git checkout -b feature/theme-foundation` (from `main`; do NOT touch `packs/**`).

---

### Task 1: Token contract + Heritage Dark theme + completeness tests

**Files:**
- Create: `src/theme/ThemeTokenContract.js`
- Create: `src/theme/themes/HeritageDark.js`
- Test: `tests/unit/ThemeContract.test.js`

- [ ] **Step 1: Write the failing test**

```js
import { describe, expect, it } from 'vitest';
import {
   THEME_COLOR_TOKENS,
   THEME_FONT_TOKENS,
   THEME_TOKEN_GROUPS,
   THEME_TOKEN_PAIRS,
   THEME_TOKENS,
} from '~/theme/ThemeTokenContract.js';
import HERITAGE_DARK from '~/theme/themes/HeritageDark.js';

/** @type {RegExp} Matches a 6-digit hex color value. */
const HEX_COLOR = /^#[0-9a-f]{6}$/;

/** @type {object[]} Every built-in theme under test (Task 2 appends the other three). */
const BUILT_IN_THEMES = [HERITAGE_DARK];

describe('ThemeTokenContract', () => {
   it('contract token list is the union of color and font tokens with no duplicates', () => {
      expect(THEME_TOKENS).toEqual([...THEME_COLOR_TOKENS, ...THEME_FONT_TOKENS]);
      expect(new Set(THEME_TOKENS).size).toBe(THEME_TOKENS.length);
   });

   it('groups partition the contract exactly', () => {
      const grouped = Object.values(THEME_TOKEN_GROUPS).flat();
      expect([...grouped].sort()).toEqual([...THEME_TOKENS].sort());
   });

   it('every pair references contract tokens', () => {
      for (const [background, foreground] of THEME_TOKEN_PAIRS) {
         expect(THEME_COLOR_TOKENS, `pair bg ${background}`).toContain(background);
         expect(THEME_COLOR_TOKENS, `pair fg ${foreground}`).toContain(foreground);
      }
   });
});

describe.each(BUILT_IN_THEMES)('built-in theme $id', (theme) => {
   it('declares id, name, dark, and frozen tokens', () => {
      expect(typeof theme.id).toBe('string');
      expect(typeof theme.name).toBe('string');
      expect(typeof theme.dark).toBe('boolean');
      expect(Object.isFrozen(theme.tokens)).toBe(true);
   });

   it('defines exactly the contract tokens', () => {
      expect(Object.keys(theme.tokens).sort()).toEqual([...THEME_TOKENS].sort());
   });

   it('every color token is 6-digit hex; every font token is a non-empty string', () => {
      for (const token of THEME_COLOR_TOKENS) {
         expect(theme.tokens[token], token).toMatch(HEX_COLOR);
      }
      for (const token of THEME_FONT_TOKENS) {
         expect(typeof theme.tokens[token], token).toBe('string');
         expect(theme.tokens[token].length, token).toBeGreaterThan(0);
      }
   });

   it('every fill token has its paired text token (no white-on-saturated rule)', () => {
      for (const [background, foreground] of THEME_TOKEN_PAIRS) {
         expect(theme.tokens[background], background).toBeDefined();
         expect(theme.tokens[foreground], foreground).toBeDefined();
      }
   });
});
```

- [ ] **Step 2:** Run `npm test -- tests/unit/ThemeContract.test.js` → FAIL (modules missing).

- [ ] **Step 3: Write `src/theme/ThemeTokenContract.js`**

```js
/**
 * @typedef {object} TitanTheme
 * @property {string} id - Unique theme identifier (kebab-case for built-ins, generated for customs).
 * @property {string} name - Raw display name.
 * @property {boolean} dark - Whether this is a dark theme (drives Auto resolution and default grouping).
 * @property {Object<string, string>} tokens - Token name (without the `--titan-` prefix) → value.
 * @property {number} [formatVersion] - Export format version (stamped on export, checked on import).
 * @property {string} [base] - Built-in theme id missing tokens are filled from on import.
 */

/** @type {string[]} The six effect types that carry primary/secondary/font-color token triplets. */
const EFFECT_TYPES = ['custom', 'expired', 'initiative', 'permanent', 'turn-end', 'turn-start'];

/**
 * Editor grouping of every themed token. Group key → token names (without the `--titan-` prefix).
 * The groups partition the contract exactly; the editor renders one section per group.
 * @type {Object<string, string[]>}
 */
export const THEME_TOKEN_GROUPS = Object.freeze({
   application: [
      'app-background', 'app-font-color', 'border-color', 'window-content-background',
      'content-link-font-color', 'editor-menu-color', 'scrollbar-color', 'scrollbar-gutter-color',
      'highlighted-background', 'highlighted-font-color',
   ],
   panels: [
      'panel-1-background', 'panel-1-color', 'panel-2-background', 'panel-2-color',
      'panel-3-background', 'panel-3-color',
   ],
   buttons: [
      'button-background', 'button-font-color', 'button-border-color',
      'button-hover-background', 'button-hover-border-color', 'button-hover-font-color',
      'button-disabled-background', 'button-disabled-border-color', 'button-disabled-font-color',
   ],
   inputs: [
      'input-background', 'input-font-color', 'input-border-color',
      'input-hover-background', 'input-hover-border-color', 'input-hover-font-color',
      'input-disabled-background', 'input-disabled-border-color', 'input-disabled-font-color',
   ],
   labels: ['label-background', 'label-font-color', 'label-border-color'],
   tags: ['tag-background', 'tag-font-color', 'tag-border-color'],
   calculatedValues: ['calculated-value-background', 'calculated-value-font-color', 'calculated-value-border-color'],
   attributes: [
      'body-background', 'body-font-color', 'mind-background', 'mind-font-color',
      'soul-background', 'soul-font-color',
   ],
   resistances: [
      'reflexes-background', 'reflexes-font-color', 'resilience-background', 'resilience-font-color',
      'willpower-background', 'willpower-font-color',
   ],
   resources: [
      'stamina-background', 'stamina-font-color', 'resolve-background', 'resolve-font-color',
      'wounds-background', 'wounds-font-color',
   ],
   rarity: [
      'uncommon-background', 'uncommon-font-color', 'rare-background', 'rare-font-color',
      'unique-background', 'unique-font-color',
   ],
   diceResults: [
      'critical-success-background', 'critical-success-font-color', 'success-background', 'success-font-color',
      'failure-background', 'failure-font-color', 'critical-failure-background', 'critical-failure-font-color',
   ],
   checkResults: ['succeeded-font-color', 'failed-font-color'],
   mods: ['lesser-background', 'lesser-color', 'greater-background', 'greater-color'],
   meters: ['meter-background'],
   effects: EFFECT_TYPES.flatMap(
      (type) => [`${type}-effect-primary`, `${type}-effect-secondary`, `${type}-effect-font-color`],
   ),
   chat: [
      'chat-public-background', 'chat-public-header-background',
      'chat-secret-background', 'chat-secret-header-background',
      'chat-secret-badge-background', 'chat-secret-badge-font-color',
      'chat-gm-background', 'chat-gm-header-background',
      'chat-gm-badge-background', 'chat-gm-badge-font-color',
   ],
   fonts: ['font-family-normal', 'font-family-rich-text'],
});

/** @type {string[]} The two themed font-family tokens. */
export const THEME_FONT_TOKENS = Object.freeze([...THEME_TOKEN_GROUPS.fonts]);

/** @type {string[]} Every themed color token. */
export const THEME_COLOR_TOKENS = Object.freeze(
   Object.entries(THEME_TOKEN_GROUPS)
      .filter(([group]) => group !== 'fonts')
      .flatMap(([, tokens]) => tokens),
);

/** @type {string[]} The complete themed token contract (colors then fonts). */
export const THEME_TOKENS = Object.freeze([...THEME_COLOR_TOKENS, ...THEME_FONT_TOKENS]);

/**
 * Fill → text token pairs. Every colored fill that can carry text declares its paired text color so a
 * theme can never produce an unreadable combination.
 * @type {string[][]}
 */
export const THEME_TOKEN_PAIRS = Object.freeze([
   ['app-background', 'app-font-color'],
   ['highlighted-background', 'highlighted-font-color'],
   ['panel-1-background', 'panel-1-color'],
   ['panel-2-background', 'panel-2-color'],
   ['panel-3-background', 'panel-3-color'],
   ['button-background', 'button-font-color'],
   ['button-hover-background', 'button-hover-font-color'],
   ['button-disabled-background', 'button-disabled-font-color'],
   ['input-background', 'input-font-color'],
   ['input-hover-background', 'input-hover-font-color'],
   ['input-disabled-background', 'input-disabled-font-color'],
   ['label-background', 'label-font-color'],
   ['tag-background', 'tag-font-color'],
   ['calculated-value-background', 'calculated-value-font-color'],
   ['body-background', 'body-font-color'],
   ['mind-background', 'mind-font-color'],
   ['soul-background', 'soul-font-color'],
   ['reflexes-background', 'reflexes-font-color'],
   ['resilience-background', 'resilience-font-color'],
   ['willpower-background', 'willpower-font-color'],
   ['stamina-background', 'stamina-font-color'],
   ['resolve-background', 'resolve-font-color'],
   ['wounds-background', 'wounds-font-color'],
   ['uncommon-background', 'uncommon-font-color'],
   ['rare-background', 'rare-font-color'],
   ['unique-background', 'unique-font-color'],
   ['critical-success-background', 'critical-success-font-color'],
   ['success-background', 'success-font-color'],
   ['failure-background', 'failure-font-color'],
   ['critical-failure-background', 'critical-failure-font-color'],
   ['lesser-background', 'lesser-color'],
   ['greater-background', 'greater-color'],
   ...EFFECT_TYPES.map((type) => [`${type}-effect-primary`, `${type}-effect-font-color`]),
   ['chat-secret-badge-background', 'chat-secret-badge-font-color'],
   ['chat-gm-badge-background', 'chat-gm-badge-font-color'],
]);
```

- [ ] **Step 4: Write `src/theme/themes/HeritageDark.js`**

All values are spec guidelines — tune individual values during visual verification (Task 6 Step 5) if a real
surface shows a contrast problem, keeping the hue family.

```js
/** @type {import('~/theme/ThemeTokenContract.js').TitanTheme} The built-in Heritage Dark theme. */
const HERITAGE_DARK = Object.freeze({
   id: 'heritage-dark',
   name: 'Heritage Dark',
   dark: true,
   tokens: Object.freeze({
      'app-background': '#262836',
      'app-font-color': '#d8dbe8',
      'border-color': '#4d5063',
      'window-content-background': '#262836',
      'content-link-font-color': '#191813',
      'editor-menu-color': '#191813',
      'scrollbar-color': '#f2b58c',
      'scrollbar-gutter-color': '#1b1c26',
      'highlighted-background': '#ffe9ae',
      'highlighted-font-color': '#3d3304',
      'panel-1-background': '#373949',
      'panel-1-color': '#d8dbe8',
      'panel-2-background': '#424557',
      'panel-2-color': '#d8dbe8',
      'panel-3-background': '#2e303c',
      'panel-3-color': '#d8dbe8',
      'button-background': '#f2b58c',
      'button-font-color': '#3d2a18',
      'button-border-color': '#1b1c26',
      'button-hover-background': '#f8d2bb',
      'button-hover-border-color': '#3d2a18',
      'button-hover-font-color': '#3d2a18',
      'button-disabled-background': '#6b6e80',
      'button-disabled-border-color': '#4d5063',
      'button-disabled-font-color': '#262836',
      'input-background': '#c5bcf8',
      'input-font-color': '#23184d',
      'input-border-color': '#1b1c26',
      'input-hover-background': '#ddd6fb',
      'input-hover-border-color': '#23184d',
      'input-hover-font-color': '#23184d',
      'input-disabled-background': '#6b6e80',
      'input-disabled-border-color': '#4d5063',
      'input-disabled-font-color': '#262836',
      'label-background': '#a6ccf2',
      'label-font-color': '#152a3d',
      'label-border-color': '#1b1c26',
      'tag-background': '#a6ccf2',
      'tag-font-color': '#152a3d',
      'tag-border-color': '#1b1c26',
      'calculated-value-background': '#1f2130',
      'calculated-value-font-color': '#9da3ba',
      'calculated-value-border-color': '#4d5063',
      'body-background': '#f29d8c',
      'body-font-color': '#3d1f18',
      'mind-background': '#95f28c',
      'mind-font-color': '#1c3d18',
      'soul-background': '#b5f2e8',
      'soul-font-color': '#143d36',
      'reflexes-background': '#eff49a',
      'reflexes-font-color': '#3a3d14',
      'resilience-background': '#f2c88c',
      'resilience-font-color': '#3d2a14',
      'willpower-background': '#f28cbf',
      'willpower-font-color': '#3d1429',
      'stamina-background': '#37da88',
      'stamina-font-color': '#0c2e1c',
      'resolve-background': '#3fb6dd',
      'resolve-font-color': '#0a2730',
      'wounds-background': '#c55858',
      'wounds-font-color': '#f7e3e3',
      'uncommon-background': '#d0ffbb',
      'uncommon-font-color': '#1f3d14',
      'rare-background': '#ffdeac',
      'rare-font-color': '#3d2e14',
      'unique-background': '#ffcfee',
      'unique-font-color': '#3d1430',
      'critical-success-background': '#87cefa',
      'critical-success-font-color': '#0d2b45',
      'success-background': '#90ee90',
      'success-font-color': '#14391c',
      'failure-background': '#ffd700',
      'failure-font-color': '#3d3304',
      'critical-failure-background': '#ffa07a',
      'critical-failure-font-color': '#401d0d',
      'succeeded-font-color': '#8fd0ff',
      'failed-font-color': '#ff9d9d',
      'lesser-background': '#ffd1d1',
      'lesser-color': '#8b0000',
      'greater-background': '#c5ffeb',
      'greater-color': '#023020',
      'meter-background': '#1b1c26',
      'custom-effect-primary': '#9580ff',
      'custom-effect-secondary': '#ffff80',
      'custom-effect-font-color': '#1b1c26',
      'expired-effect-primary': '#ffff80',
      'expired-effect-secondary': '#ff9580',
      'expired-effect-font-color': '#1b1c26',
      'initiative-effect-primary': '#ff9580',
      'initiative-effect-secondary': '#9580ff',
      'initiative-effect-font-color': '#1b1c26',
      'permanent-effect-primary': '#80ffea',
      'permanent-effect-secondary': '#8aff80',
      'permanent-effect-font-color': '#1b1c26',
      'turn-end-effect-primary': '#ff80bf',
      'turn-end-effect-secondary': '#9580ff',
      'turn-end-effect-font-color': '#1b1c26',
      'turn-start-effect-primary': '#9580ff',
      'turn-start-effect-secondary': '#80ffea',
      'turn-start-effect-font-color': '#1b1c26',
      'chat-public-background': '#2e3044',
      'chat-public-header-background': '#262836',
      'chat-secret-background': '#2c2a4e',
      'chat-secret-header-background': '#232148',
      'chat-secret-badge-background': '#3b3878',
      'chat-secret-badge-font-color': '#cecdf8',
      'chat-gm-background': '#3a2440',
      'chat-gm-header-background': '#2f1c35',
      'chat-gm-badge-background': '#5c3866',
      'chat-gm-badge-font-color': '#eed3f5',
      'font-family-normal': "'Lato'",
      'font-family-rich-text': "'Open Sans'",
   }),
});

export default HERITAGE_DARK;
```

NOTE: `font-family-normal` values intentionally fail the hex regex — the test iterates `THEME_COLOR_TOKENS`
for hex and `THEME_FONT_TOKENS` for strings, so fonts are exempt by construction.

- [ ] **Step 5:** Run `npm test -- tests/unit/ThemeContract.test.js` → PASS.
- [ ] **Step 6:** Commit: `feat: theme token contract + Heritage Dark theme data`.

---

### Task 2: The other three built-in themes

**Files:**
- Create: `src/theme/themes/Macchiato.js`, `src/theme/themes/HeritageLight.js`, `src/theme/themes/CleanNeutralLight.js`
- Modify: `tests/unit/ThemeContract.test.js` (add the three imports to `BUILT_IN_THEMES`)

- [ ] **Step 1:** Extend the test's `BUILT_IN_THEMES` array:

```js
import CLEAN_NEUTRAL_LIGHT from '~/theme/themes/CleanNeutralLight.js';
import HERITAGE_LIGHT from '~/theme/themes/HeritageLight.js';
import MACCHIATO from '~/theme/themes/Macchiato.js';

const BUILT_IN_THEMES = [HERITAGE_DARK, MACCHIATO, HERITAGE_LIGHT, CLEAN_NEUTRAL_LIGHT];
```

Also add a uniqueness test:

```js
it('built-in ids and modes are correct', () => {
   expect(BUILT_IN_THEMES.map((t) => t.id)).toEqual(
      ['heritage-dark', 'macchiato', 'heritage-light', 'clean-neutral-light'],
   );
   expect(BUILT_IN_THEMES.map((t) => t.dark)).toEqual([true, true, false, false]);
});
```

- [ ] **Step 2:** Run the suite → FAIL (modules missing).
- [ ] **Step 3:** Write the three modules, same shape as `HeritageDark.js`. Token values (every token not listed
  below follows the same key order as Heritage Dark — write ALL 112 tokens in each file):

**`Macchiato.js`** (`id: 'macchiato'`, `name: 'Catppuccin Macchiato'`, `dark: true`) — official Catppuccin
Macchiato palette (MIT © Catppuccin Org — add this attribution line in the file's JSDoc):
app `#24273a`/`#cad3f5`, border `#5b6078`, window-content `#24273a`, content-link/editor-menu `#191813`,
scrollbar `#f5a97f`/`#181926`, highlighted `#eed49f`/`#3d2e0a`; panels 1 `#363a4f`, 2 `#494d64`, 3 `#1e2030`
(all text `#cad3f5`); button `#f5a97f`/`#3a2412`/`#181926`, hover `#f8c4a0`/`#3a2412`/`#3a2412`, disabled
`#5b6078`/`#494d64`/`#24273a`; input `#b7bdf8`/`#1e2030`/`#181926`, hover `#cdd1fa`/`#1e2030`/`#1e2030`,
disabled `#5b6078`/`#494d64`/`#24273a`; label+tag `#8aadf4`/`#11244d`/`#181926`; calculated
`#1e2030`/`#a5adcb`/`#5b6078`; body `#ed8796`/`#401219`, mind `#a6da95`/`#15330e`, soul `#8bd5ca`/`#0e332d`;
reflexes `#eed49f`/`#3d2e0a`, resilience `#f5a97f`/`#3d2008`, willpower `#f5bde6`/`#3d0e2e`; stamina
`#a6da95`/`#15330e`, resolve `#91d7e3`/`#0d3038`, wounds `#ed8796`/`#401219`; uncommon `#a6da95`/`#15330e`,
rare `#eed49f`/`#3d2e0a`, unique `#f5bde6`/`#3d0e2e`; dice crit-success `#7dc4e4`/`#0a2733`, success
`#a6da95`/`#15330e`, failure `#eed49f`/`#3d2e0a`, crit-failure `#ee99a0`/`#40141a`; succeeded `#8aadf4`,
failed `#ed8796`; lesser `#f0c6c6`/`#6e1f29`, greater `#b7e0a9`/`#1d3a12`; meter `#181926`; effects (fg all
`#181926`): custom `#c6a0f6`/`#eed49f`, expired `#eed49f`/`#ee99a0`, initiative `#ee99a0`/`#c6a0f6`,
permanent `#8bd5ca`/`#a6da95`, turn-end `#f5bde6`/`#c6a0f6`, turn-start `#c6a0f6`/`#8bd5ca`; chat public
`#2a2d42`/`#1e2030`, secret `#2d3050`/`#23264a` badge `#3d4178`/`#cdd1fa`, gm `#38283f`/`#2c1f33` badge
`#553c61`/`#e8d4f2`; fonts as Heritage Dark.

**`HeritageLight.js`** (`id: 'heritage-light'`, `name: 'Heritage Light'`, `dark: false`):
app `#f4f4f6`/`#262626`, border `#c9c9d4`, window-content `#f4f4f6`, content-link/editor-menu `#191813`,
scrollbar `#f2b58c`/`#e2e2e8`, highlighted `#ffe9ae`/`#3d3304`; panels 1 `#ffffff`, 2 `#f2f2f6`, 3 `#e9e9ef`
(all text `#262626`); button `#f2b58c`/`#3d2a18`/`#cf9a70`, hover `#f8d2bb`/`#3d2a18`/`#3d2a18`, disabled
`#d4d4dc`/`#b9b9c4`/`#7c7c8a`; input `#ffffff`/`#262626`/`#c9c9d4`, hover `#f7f2ff`/`#262626`/`#a39ad6`,
disabled `#e4e4ea`/`#d0d0da`/`#8a8a98`; label+tag `#a6ccf2`/`#152a3d`/`#7fa8d4`; calculated
`#e4e4ea`/`#5f5f6e`/`#c9c9d4`; attributes/resistances/rarity/resources/dice/effects: identical bg+fg values
to Heritage Dark (the pastels carry to light mode with the same dark text — this is the Heritage pairing's
point); succeeded `#1a4fa3`, failed `#a31a2b`; lesser `#ffd1d1`/`#8b0000`, greater `#c5ffeb`/`#023020`;
meter `#e2e2e8`; chat public `#ffffff`/`#f0f0f4`, secret `#efedfc`/`#e0ddf7` badge `#cbc6f2`/`#2e2475`,
gm `#f7ebfa`/`#ecdaf2` badge `#ddc0e8`/`#5d2a70`; fonts as Heritage Dark.

**`CleanNeutralLight.js`** (`id: 'clean-neutral-light'`, `name: 'Clean Neutral'`, `dark: false`):
app `#ffffff`/`#1f2430`, border `#d4d8dd`, window-content `#ffffff`, content-link/editor-menu `#191813`,
scrollbar `#818cf8`/`#e9ebee`, highlighted `#fdeec9`/`#6d4708`; panels 1 `#f5f6f8`, 2 `#eef0f3`, 3 `#ffffff`
(all text `#1f2430`); button `#e2e4fb`/`#3730a3`/`#c7cbf5`, hover `#d3d6f9`/`#3730a3`/`#3730a3`, disabled
`#e9ebee`/`#d4d8dd`/`#8d95a3`; input `#ffffff`/`#1f2430`/`#d4d8dd`, hover `#f8f9fb`/`#1f2430`/`#a5aefb`,
disabled `#e9ebee`/`#d4d8dd`/`#8d95a3`; label+tag `#dbeafe`/`#1e40af`/`#b3d3f8`; calculated
`#e9ebee`/`#5d6675`/`#d4d8dd`; body `#fde2e2`/`#991b1b`, mind `#dcf2e3`/`#166534`, soul `#d4ecea`/`#115e59`;
reflexes `#f8efc6`/`#6d5806`, resilience `#fbe5d0`/`#8a4c0a`, willpower `#fbdcec`/`#9d1a5e`; stamina
`#22c55e`/`#0b2e18`, resolve `#38bdf8`/`#082c3d`, wounds `#ef4444`/`#ffe2e2`; uncommon `#dcfce7`/`#166534`,
rare `#fdeec9`/`#92580a`, unique `#fce7f3`/`#9d174d`; dice crit-success `#bfdbfe`/`#1e3a8a`, success
`#bbf7d0`/`#14532d`, failure `#fde68a`/`#713f12`, crit-failure `#fecaca`/`#7f1d1d`; succeeded `#1e40af`,
failed `#991b1b`; lesser `#fde2e2`/`#991b1b`, greater `#dcf2e3`/`#166534`; meter `#e9ebee`; effects (fg all
`#29303f`): custom `#ddd9fb`/`#fdf3c4`, expired `#fdf3c4`/`#fcd9c8`, initiative `#fcd9c8`/`#ddd9fb`,
permanent `#c9f3ec`/`#d3f5cf`, turn-end `#fcd3e8`/`#ddd9fb`, turn-start `#ddd9fb`/`#c9f3ec`; chat public
`#ffffff`/`#f0f2f5`, secret `#eef0fd`/`#dfe3fa` badge `#c9cef7`/`#2c2f8f`, gm `#f9edfb`/`#f0dcf4` badge
`#e2c4ea`/`#6d2483`; fonts as Heritage Dark.

- [ ] **Step 4:** Run the suite → PASS (all 4 themes × completeness/hex/pairing).
- [ ] **Step 5:** Commit: `feat: Macchiato, Heritage Light, Clean Neutral built-in themes`.

---

### Task 3: Pure theme helpers + tests

**Files:**
- Create: `src/theme/BuildThemeStylesheetText.js`, `src/theme/ResolveActiveThemeId.js`, `src/theme/ValidateThemeData.js`
- Test: `tests/unit/ThemeHelpers.test.js`

- [ ] **Step 1: Write the failing tests**

```js
import { describe, expect, it } from 'vitest';
import buildThemeStylesheetText from '~/theme/BuildThemeStylesheetText.js';
import resolveActiveThemeId from '~/theme/ResolveActiveThemeId.js';
import validateThemeData from '~/theme/ValidateThemeData.js';
import HERITAGE_DARK from '~/theme/themes/HeritageDark.js';
import { THEME_TOKENS } from '~/theme/ThemeTokenContract.js';

describe('buildThemeStylesheetText', () => {
   it('emits one :root rule with a --titan- declaration per token', () => {
      const css = buildThemeStylesheetText(HERITAGE_DARK);
      expect(css.startsWith(':root {')).toBe(true);
      expect(css.trim().endsWith('}')).toBe(true);
      expect(css).toContain('--titan-app-background: #262836;');
      expect(css).toContain("--titan-font-family-normal: 'Lato';");
      expect(css.match(/--titan-/g)).toHaveLength(THEME_TOKENS.length);
   });
});

describe('resolveActiveThemeId', () => {
   /** @type {object} Baseline resolution inputs shared by the cases below. */
   const base = {
      selectedThemeId: 'auto',
      prefersDark: true,
      defaultDarkThemeId: 'heritage-dark',
      defaultLightThemeId: 'heritage-light',
      themeExists: (id) => ['heritage-dark', 'heritage-light', 'macchiato', 'custom-1'].includes(id),
   };

   it('explicit selection wins when the theme exists', () => {
      expect(resolveActiveThemeId({ ...base, selectedThemeId: 'macchiato' })).toBe('macchiato');
      expect(resolveActiveThemeId({ ...base, selectedThemeId: 'custom-1', prefersDark: false })).toBe('custom-1');
   });

   it('auto resolves the world default matching the preferred scheme', () => {
      expect(resolveActiveThemeId(base)).toBe('heritage-dark');
      expect(resolveActiveThemeId({ ...base, prefersDark: false })).toBe('heritage-light');
   });

   it('a missing selected theme falls through to auto resolution', () => {
      expect(resolveActiveThemeId({ ...base, selectedThemeId: 'deleted-custom' })).toBe('heritage-dark');
   });

   it('a missing world default falls back to the built-in heritage themes', () => {
      const noDefaults = { ...base, defaultDarkThemeId: 'gone', defaultLightThemeId: 'gone' };
      expect(resolveActiveThemeId(noDefaults)).toBe('heritage-dark');
      expect(resolveActiveThemeId({ ...noDefaults, prefersDark: false })).toBe('heritage-light');
   });
});

describe('validateThemeData', () => {
   /** @type {object} A valid minimal import payload derived from Heritage Dark. */
   const valid = {
      formatVersion: 1,
      name: 'My Theme',
      dark: true,
      base: 'heritage-dark',
      tokens: { ...HERITAGE_DARK.tokens, 'app-background': '#101018' },
   };

   it('accepts a valid payload and normalizes it onto the contract', () => {
      const result = validateThemeData(valid);
      expect(result.ok).toBe(true);
      expect(result.theme.tokens['app-background']).toBe('#101018');
      expect(Object.keys(result.theme.tokens).sort()).toEqual([...THEME_TOKENS].sort());
      expect(result.theme.id).toMatch(/^custom-/);
   });

   it('fills missing tokens from the declared base and drops unknown tokens', () => {
      const sparse = { ...valid, tokens: { 'app-background': '#101018', bogus: '#ffffff' } };
      const result = validateThemeData(sparse);
      expect(result.ok).toBe(true);
      expect(result.theme.tokens['button-background']).toBe(HERITAGE_DARK.tokens['button-background']);
      expect('bogus' in result.theme.tokens).toBe(false);
   });

   it('rejects malformed payloads with a reason', () => {
      expect(validateThemeData(null).ok).toBe(false);
      expect(validateThemeData({ ...valid, formatVersion: 99 }).ok).toBe(false);
      expect(validateThemeData({ ...valid, name: '' }).ok).toBe(false);
      expect(validateThemeData({ ...valid, tokens: 'nope' }).ok).toBe(false);
      const badColor = { ...valid, tokens: { ...valid.tokens, 'app-background': 'red' } };
      expect(validateThemeData(badColor).ok).toBe(false);
      for (const result of [validateThemeData(null), validateThemeData({ ...valid, formatVersion: 99 })]) {
         expect(typeof result.error).toBe('string');
         expect(result.error.length).toBeGreaterThan(0);
      }
   });

   it('accepts 8-digit hex on import', () => {
      const alpha = { ...valid, tokens: { ...valid.tokens, 'app-background': '#10101880' } };
      expect(validateThemeData(alpha).ok).toBe(true);
   });
});
```

- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implement the three modules.**

`src/theme/BuildThemeStylesheetText.js`:

```js
/**
 * Builds the CSS text for a theme: one `:root` rule declaring every themed token as a `--titan-*`
 * custom property. Only TITAN styles consume the `--titan-` namespace, so scoping to `:root` cannot
 * affect Foundry core UI while still reaching chat notifications, popouts, and tooltips.
 * @param {import('~/theme/ThemeTokenContract.js').TitanTheme} theme - The theme to serialize.
 * @returns {string} The stylesheet text.
 */
export default function buildThemeStylesheetText(theme) {
   // One indented declaration line per token.
   const lines = Object.entries(theme.tokens).map(([token, value]) => `   --titan-${token}: ${value};`);

   return `:root {\n${lines.join('\n')}\n}`;
}
```

`src/theme/ResolveActiveThemeId.js`:

```js
/**
 * Resolves the active theme id from the current settings snapshot. Pure: all inputs are injected.
 * @param {object} options - The resolution inputs.
 * @param {string} options.selectedThemeId - The user's client theme selection ('auto' or a theme id).
 * @param {boolean} options.prefersDark - Whether the resolved Foundry color scheme is dark.
 * @param {string} options.defaultDarkThemeId - The GM's world-default dark theme id.
 * @param {string} options.defaultLightThemeId - The GM's world-default light theme id.
 * @param {function(string): boolean} options.themeExists - Whether a theme id resolves to a known theme.
 * @returns {string} The id of the theme to apply.
 */
export default function resolveActiveThemeId(
   { selectedThemeId, prefersDark, defaultDarkThemeId, defaultLightThemeId, themeExists }) {
   // An explicit, existing selection always wins.
   if (selectedThemeId !== 'auto' && themeExists(selectedThemeId)) {
      return selectedThemeId;
   }

   // Auto (or a dangling selection): the world default matching the preferred scheme.
   const worldDefault = prefersDark ? defaultDarkThemeId : defaultLightThemeId;
   if (themeExists(worldDefault)) {
      return worldDefault;
   }

   // Last resort: the built-in heritage theme for the preferred scheme.
   return prefersDark ? 'heritage-dark' : 'heritage-light';
}
```

`src/theme/ValidateThemeData.js`:

```js
import { THEME_COLOR_TOKENS, THEME_TOKENS } from '~/theme/ThemeTokenContract.js';

/** @type {RegExp} Matches a 6- or 8-digit hex color value. */
const HEX_COLOR = /^#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

/** @type {number} The theme export format version this build reads and writes. */
export const THEME_FORMAT_VERSION = 1;

/**
 * Validates and normalizes an imported theme payload onto the token contract. Missing tokens are
 * filled from the declared base theme; unknown tokens are dropped; the result is never half-applied.
 * @param {object} data - The parsed import payload.
 * @param {object} [options] - Validation options.
 * @param {function(string): (object | undefined)} [options.getBaseTheme] - Resolves a base theme by id;
 *    defaults to the built-in heritage themes keyed by the payload's dark flag.
 * @returns {{ ok: boolean, theme?: object, error?: string }} The normalized theme or a failure reason.
 */
export default function validateThemeData(data, { getBaseTheme } = {}) {
   if (typeof data !== 'object' || data === null) {
      return { ok: false, error: 'Theme data is not an object.' };
   }
   if (data.formatVersion !== THEME_FORMAT_VERSION) {
      return { ok: false, error: `Unsupported theme format version: ${data.formatVersion}.` };
   }
   if (typeof data.name !== 'string' || data.name.trim().length === 0) {
      return { ok: false, error: 'Theme name must be a non-empty string.' };
   }
   if (typeof data.dark !== 'boolean') {
      return { ok: false, error: 'Theme dark flag must be a boolean.' };
   }
   if (typeof data.tokens !== 'object' || data.tokens === null) {
      return { ok: false, error: 'Theme tokens must be an object.' };
   }

   // Resolve the fill-from base theme. The default resolver imports lazily to avoid a cycle.
   const resolveBase = getBaseTheme ?? defaultBaseResolver;
   const base = resolveBase(data.base) ?? resolveBase(data.dark ? 'heritage-dark' : 'heritage-light');

   // Build the normalized token map: provided value if valid for its kind, else the base value.
   const tokens = {};
   for (const token of THEME_TOKENS) {
      const provided = data.tokens[token];
      const isColor = THEME_COLOR_TOKENS.includes(token);
      const validProvided = isColor
         ? (typeof provided === 'string' && HEX_COLOR.test(provided))
         : (typeof provided === 'string' && provided.length > 0);
      if (isColor && token in data.tokens && !validProvided) {
         return { ok: false, error: `Invalid color value for token '${token}': ${provided}.` };
      }
      tokens[token] = validProvided ? provided : base.tokens[token];
   }

   return {
      ok: true,
      theme: {
         id: `custom-${foundry.utils.randomID(8)}`,
         name: data.name.trim(),
         dark: data.dark,
         tokens,
      },
   };
}

/**
 * Default base-theme resolver over the built-in heritage themes.
 * @param {string} id - The base theme id declared by the payload.
 * @returns {object | undefined} The matching built-in theme.
 */
function defaultBaseResolver(id) {
   // Imported statically here to keep the validator synchronous; the built-ins have no dependencies.
   return BUILT_IN_BASES[id];
}

import HERITAGE_DARK from '~/theme/themes/HeritageDark.js';
import HERITAGE_LIGHT from '~/theme/themes/HeritageLight.js';
import MACCHIATO from '~/theme/themes/Macchiato.js';
import CLEAN_NEUTRAL_LIGHT from '~/theme/themes/CleanNeutralLight.js';

/** @type {Object<string, object>} Built-in themes addressable as import bases. */
const BUILT_IN_BASES = Object.freeze({
   'heritage-dark': HERITAGE_DARK,
   'heritage-light': HERITAGE_LIGHT,
   'macchiato': MACCHIATO,
   'clean-neutral-light': CLEAN_NEUTRAL_LIGHT,
});
```

Hoist the four theme imports to the top of the file when writing it (shown trailing here for readability
only). `foundry.utils.randomID` is unavailable under Vitest — `tests/setup.js` already installs
`globalThis.foundry`; extend its `utils` stub with
`randomID: (length = 16) => Math.random().toString(36).slice(2, 2 + length)` in this task.

- [ ] **Step 4:** Run → PASS. Run the full unit suite (`npm test`) → no regressions.
- [ ] **Step 5:** Commit: `feat: theme stylesheet/resolution/validation helpers`.

---

### Task 4: Settings, ThemeManager, wiring, Variables.scss themed-tier removal

**Files:**
- Create: `src/theme/ThemeManager.js`, `src/helpers/Settings/ThemeCoreMessages.js`
- Modify: `src/system/SystemSettings.js`, `src/hooks/OnceInit.js`, `src/styles/Variables.scss`, `lang/en.json`

- [ ] **Step 1: Write `src/theme/ThemeManager.js`**

```js
import buildThemeStylesheetText from '~/theme/BuildThemeStylesheetText.js';
import resolveActiveThemeId from '~/theme/ResolveActiveThemeId.js';
import validateThemeData, { THEME_FORMAT_VERSION } from '~/theme/ValidateThemeData.js';
import getSetting from '~/helpers/utility-functions/GetSetting.js';
import CLEAN_NEUTRAL_LIGHT from '~/theme/themes/CleanNeutralLight.js';
import HERITAGE_DARK from '~/theme/themes/HeritageDark.js';
import HERITAGE_LIGHT from '~/theme/themes/HeritageLight.js';
import MACCHIATO from '~/theme/themes/Macchiato.js';

/** @type {object[]} The built-in themes in picker order. */
export const BUILT_IN_THEMES = Object.freeze([HERITAGE_DARK, MACCHIATO, HERITAGE_LIGHT, CLEAN_NEUTRAL_LIGHT]);

/** @type {string} The DOM id of the injected theme stylesheet. */
const STYLE_ELEMENT_ID = 'titan-theme-style';

/**
 * @class ThemeManager
 * Resolves the active TITAN theme and injects its tokens as a :root stylesheet. Owns custom-theme
 * CRUD against the customThemes client setting, plus import/export. Created once during the init
 * hook and exposed as game.titan.themeManager.
 */
export default class ThemeManager {
   /** @type {MutationObserver | undefined} Observer re-applying the theme when Foundry's body scheme class flips. */
   #schemeObserver = void 0;

   /**
    * Applies the current theme and starts following Foundry's color-scheme body class for Auto mode.
    */
   initialize() {
      this.apply();

      // Foundry's configureUI() swaps theme-dark/theme-light on document.body; re-resolve on changes.
      this.#schemeObserver = new MutationObserver(() => this.apply());
      this.#schemeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
   }

   /**
    * Returns every available theme (built-ins first, then customs).
    * @returns {object[]} All themes.
    */
   getAllThemes() {
      return [...BUILT_IN_THEMES, ...Object.values(getSetting('customThemes') ?? {})];
   }

   /**
    * Looks up a theme by id.
    * @param {string} id - The theme id.
    * @returns {object | undefined} The theme, if known.
    */
   getTheme(id) {
      return this.getAllThemes().find((theme) => theme.id === id);
   }

   /**
    * Whether Foundry's resolved color scheme is dark. Falls back to the browser preference before
    * configureUI has classed the body.
    * @returns {boolean} True when the dark scheme is active.
    */
   prefersDark() {
      if (document.body.classList.contains('theme-dark')) {
         return true;
      }
      if (document.body.classList.contains('theme-light')) {
         return false;
      }

      return matchMedia('(prefers-color-scheme: dark)').matches;
   }

   /**
    * Resolves the active theme from settings and the current color scheme.
    * @returns {object} The active theme.
    */
   getActiveTheme() {
      // The resolved theme id from the pure resolution helper.
      const id = resolveActiveThemeId({
         selectedThemeId: getSetting('theme'),
         prefersDark: this.prefersDark(),
         defaultDarkThemeId: getSetting('defaultDarkTheme'),
         defaultLightThemeId: getSetting('defaultLightTheme'),
         themeExists: (themeId) => this.getTheme(themeId) !== undefined,
      });

      return this.getTheme(id);
   }

   /**
    * Builds and injects (or updates) the theme stylesheet for the active theme.
    */
   apply() {
      // The injected style element, created on first application.
      let style = document.getElementById(STYLE_ELEMENT_ID);
      if (!style) {
         style = document.createElement('style');
         style.id = STYLE_ELEMENT_ID;
         document.head.append(style);
      }
      style.textContent = buildThemeStylesheetText(this.getActiveTheme());
   }

   /**
    * Persists a custom theme (insert or update), refreshes the picker choices, and re-applies.
    * @param {object} theme - The custom theme to save.
    * @returns {Promise<void>} Resolves once the setting is stored.
    */
   async saveCustomTheme(theme) {
      // The stored custom themes map, updated immutably.
      const customThemes = { ...(getSetting('customThemes') ?? {}) };
      customThemes[theme.id] = theme;
      await game.settings.set('titan', 'customThemes', customThemes);
      this.refreshThemeChoices();
      this.apply();
   }

   /**
    * Deletes a custom theme. The resolution helper falls back gracefully if it was active.
    * @param {string} id - The custom theme id to delete.
    * @returns {Promise<void>} Resolves once the setting is stored.
    */
   async deleteCustomTheme(id) {
      const customThemes = { ...(getSetting('customThemes') ?? {}) };
      delete customThemes[id];
      await game.settings.set('titan', 'customThemes', customThemes);
      this.refreshThemeChoices();
      this.apply();
   }

   /**
    * Removes all custom themes and restores the theme selection to Auto.
    * @returns {Promise<void>} Resolves once both settings are stored.
    */
   async resetThemes() {
      await game.settings.set('titan', 'customThemes', {});
      await game.settings.set('titan', 'theme', 'auto');
      this.refreshThemeChoices();
      this.apply();
   }

   /**
    * Serializes a theme to its export JSON text.
    * @param {object} theme - The theme to export.
    * @returns {string} Pretty-printed JSON.
    */
   exportThemeText(theme) {
      return JSON.stringify(
         {
            formatVersion: THEME_FORMAT_VERSION,
            name: theme.name,
            dark: theme.dark,
            base: BUILT_IN_THEMES.some((builtIn) => builtIn.id === theme.id) ? theme.id : 'heritage-dark',
            tokens: theme.tokens,
         },
         null,
         2,
      );
   }

   /**
    * Validates import text and stores the resulting custom theme.
    * @param {string} text - The raw JSON text.
    * @returns {Promise<{ ok: boolean, theme?: object, error?: string }>} The validation result.
    */
   async importThemeText(text) {
      // The parsed payload; JSON syntax errors report as validation failures.
      let data;
      try {
         data = JSON.parse(text);
      }
      catch (error) {
         return { ok: false, error: `Invalid JSON: ${error.message}` };
      }

      const result = validateThemeData(data);
      if (result.ok) {
         await this.saveCustomTheme(result.theme);
      }

      return result;
   }

   /**
    * Rebuilds the registered theme setting's choices after custom themes change, then re-renders the
    * settings app if it is open so the picker reflects the new list.
    */
   refreshThemeChoices() {
      // The registered setting config whose choices are rebuilt in place.
      const config = game.settings.settings.get('titan.theme');
      if (config) {
         config.choices = buildThemeChoices(this.getAllThemes());
      }
   }
}

/**
 * Builds the choices map for the theme picker setting.
 * @param {object[]} themes - Every available theme.
 * @returns {Object<string, string>} Setting choices (id → display label).
 */
export function buildThemeChoices(themes) {
   // Auto first, then each theme by display name.
   const choices = { auto: 'SETTINGS.theme.auto' };
   for (const theme of themes) {
      choices[theme.id] = theme.name;
   }

   return choices;
}
```

- [ ] **Step 2: Write `src/helpers/Settings/ThemeCoreMessages.js`**

```js
import getSetting from '~/helpers/utility-functions/GetSetting.js';

/**
 * Returns whether non-TITAN chat messages should receive the TITAN chat theme.
 * @returns {boolean} Whether core-message theming is enabled.
 */
export default function themeCoreMessages() {
   return getSetting('themeCoreMessages');
}
```

- [ ] **Step 3: Modify `src/system/SystemSettings.js`**

DELETE the three registrations `darkModeSheets` (lines 74-83), `darkModeChatMessages` (85-99),
`darkModeJournals` (101-110). INSERT in their place (ThemeEditorApplication is imported lazily-free at top;
the import is static — no dynamic imports):

```js
import ThemeManager, { BUILT_IN_THEMES, buildThemeChoices } from '~/theme/ThemeManager.js';
import ThemeEditorApplication from '~/theme/editor/ThemeEditorApplication.js';
```

```js
   // Custom Themes (per-user storage; managed by the Theme Editor, not the settings list).
   game.settings.register('titan', 'customThemes', {
      config: false,
      default: {},
      scope: 'client',
      type: Object,
   });

   // Theme.
   game.settings.register('titan', 'theme', {
      choices: buildThemeChoices([
         ...BUILT_IN_THEMES,
         ...Object.values(game.settings.storage.get('client')?.getItem?.('titan.customThemes') ?? {}),
      ]),
      config: true,
      default: 'auto',
      hint: 'SETTINGS.theme.hint',
      name: 'SETTINGS.theme.text',
      scope: 'client',
      type: String,
      onChange: () => game.titan?.themeManager?.apply(),
   });

   // Default Dark Theme (world).
   game.settings.register('titan', 'defaultDarkTheme', {
      choices: Object.fromEntries(BUILT_IN_THEMES.filter((t) => t.dark).map((t) => [t.id, t.name])),
      config: true,
      default: 'heritage-dark',
      hint: 'SETTINGS.defaultDarkTheme.hint',
      name: 'SETTINGS.defaultDarkTheme.text',
      restricted: true,
      scope: 'world',
      type: String,
      onChange: () => game.titan?.themeManager?.apply(),
   });

   // Default Light Theme (world).
   game.settings.register('titan', 'defaultLightTheme', {
      choices: Object.fromEntries(BUILT_IN_THEMES.filter((t) => !t.dark).map((t) => [t.id, t.name])),
      config: true,
      default: 'heritage-light',
      hint: 'SETTINGS.defaultLightTheme.hint',
      name: 'SETTINGS.defaultLightTheme.text',
      restricted: true,
      scope: 'world',
      type: String,
      onChange: () => game.titan?.themeManager?.apply(),
   });

   // Theme Core Chat Messages.
   game.settings.register('titan', 'themeCoreMessages', {
      config: true,
      default: true,
      hint: 'SETTINGS.themeCoreMessages.hint',
      name: 'SETTINGS.themeCoreMessages.text',
      scope: 'client',
      type: Boolean,
      onChange: () => ui.chat?.render(),
   });

   // Theme Editor menu entry.
   game.settings.registerMenu('titan', 'themeEditor', {
      hint: 'SETTINGS.themeEditor.hint',
      icon: 'fas fa-palette',
      label: 'SETTINGS.themeEditor.label',
      name: 'SETTINGS.themeEditor.text',
      restricted: false,
      type: ThemeEditorApplication,
   });
```

NOTE on the `theme` choices at registration time: `game.settings.get` cannot be called before
`customThemes` is registered, and storage may not be primed; register `customThemes` FIRST, then build the
`theme` choices with `game.settings.get('titan', 'customThemes')` (registration order makes this legal —
replace the `storage.get` expression above with the plain `game.settings.get('titan', 'customThemes')` call;
keep whichever form works against the live runtime, verified in Step 7).

`ThemeEditorApplication` does not exist until Task 8 — for THIS task create the placeholder-free minimal
file (Task 8 fills in the real editor; the class is functional, just empty):
write `src/theme/editor/ThemeEditorApplication.js` with the full ApplicationV2 host from Task 8 Step 1 NOW
and leave `ThemeEditorShell.svelte` for Task 8 — to keep this task buildable, Task 8's Step 1 file imports
the shell, so instead: register the menu in TASK 8, not here. REMOVE the `registerMenu` block and the
`ThemeEditorApplication` import from this task; they move to Task 8 Step 4.

- [ ] **Step 4: Modify `src/hooks/OnceInit.js`**

Add the import and, immediately after `registerSystemSettings()` is called, create and expose the manager:

```js
import ThemeManager from '~/theme/ThemeManager.js';
```

```js
   // Create the theme manager and apply the active theme before any TITAN surface renders.
   game.titan.themeManager = new ThemeManager();
   game.titan.themeManager.initialize();
```

- [ ] **Step 5: Rewrite `src/styles/Variables.scss` to the static tier only**

Replace the file's entire contents (themed tokens now come from the injected stylesheet; structure values
already updated to the soft & airy language here so Task 6 only touches mixins):

```scss
:root {
   // Font sizes
   --titan-font-size-normal: 16px;
   --titan-font-size-small: 14px;
   --titan-font-size-large: 20px;
   --titan-font-size-extra-large: 24px;

   // Border
   --titan-border-radius: 8px;
   --titan-border-style: solid;
   --titan-border-width: 1px;

   // Spacing
   --titan-spacing-standard: 5px;
   --titan-spacing-large: 10px;

   // Input
   --titan-input-border-radius: 6px;
   --titan-input-border-style: solid;
   --titan-input-border-width: 1px;
   --titan-input-font-family: var(--titan-font-family-normal);
   --titan-input-font-size: 16px;
   --titan-input-font-weight: bold;
   --titan-input-height: 26px;
   --titan-input-padding: 0 5px;
   --titan-input-text-alignment: left;
   --titan-input-width: 100%;
   --titan-input-digit-width: 10px;

   // Button
   --titan-button-border-style: solid;
   --titan-button-border-radius: 10px;
   --titan-button-border-width: 1px;
   --titan-button-box-sizing: border-box;
   --titan-button-font-family: var(--titan-font-family-normal);
   --titan-button-font-size: 16px;
   --titan-button-font-weight: bold;
   --titan-button-height: 100%;
   --titan-button-line-height: 20px;
   --titan-button-margin: 0;
   --titan-button-padding: 5px 10px;
   --titan-button-width: 100%;

   // Icon Button
   --titan-icon-button-border-radius: 16px;
   --titan-icon-button-padding: 2px;
   --titan-icon-button-radius: 32px;

   // Expand Button
   --titan-expand-button-font-size: 8px;
   --titan-expand-button-line-height: 8px;

   // Label
   --titan-label-border-radius: 6px;
   --titan-label-border-style: solid;
   --titan-label-border-width: 1px;
   --titan-label-font-weight: bold;
   --titan-label-font-size: 16px;
   --titan-label-padding: 5px;
   --titan-label-width: 100%;
   --titan-label-height: 100%;

   // Tag
   --titan-tag-border-radius: 6px;
   --titan-tag-border-style: solid;
   --titan-tag-border-width: 1px;
   --titan-tag-font-size: 14px;
   --titan-tag-font-weight: bold;
   --titan-tag-padding: 4px 7px;

   // Meter shadows (alpha overlays shared by every theme).
   --titan-meter-shadow-1: #ffffff4d;
   --titan-meter-shadow-2: #0006;

   // Gradient
   --titan-gradient-degree: 135deg;

   // Line height
   --titan-line-height-normal: 16px;
   --titan-line-height-small: 14px;

   // Sidebar
   --titan-sidebar-width: 208px;
   --titan-sidebar-padding: 5px;
   --titan-sidebar-spacing: 5px;

   // Lists
   --titan-list-style: none;
   --titan-list-padding: 0px;
}
```

Note `--titan-input-font-family` / `--titan-button-font-family` now alias the themed
`--titan-font-family-normal` instead of hard-coding `'Lato'`, so custom fonts reach inputs/buttons.

- [ ] **Step 6: `lang/en.json`** — in the `SETTINGS` object, DELETE the `darkModeSheets`,
  `darkModeChatMessages` (incl. its `all`/`systemOnly`/`disabled` children), and `darkModeJournals` entries;
  ADD:

```json
"theme": {
   "text": "Theme",
   "hint": "The color theme for TITAN sheets, dialogs, and chat messages. Auto follows Foundry's color scheme using the world default themes.",
   "auto": "Auto (match Foundry)"
},
"defaultDarkTheme": {
   "text": "Default Dark Theme",
   "hint": "The TITAN theme used by players on Auto when Foundry's color scheme is dark."
},
"defaultLightTheme": {
   "text": "Default Light Theme",
   "hint": "The TITAN theme used by players on Auto when Foundry's color scheme is light."
},
"themeCoreMessages": {
   "text": "Theme Non-TITAN Chat Messages",
   "hint": "Apply the TITAN chat theme to chat messages from Foundry core and other modules."
},
"themeEditor": {
   "text": "Theme Editor",
   "label": "Open Theme Editor",
   "hint": "Customize, export, and import TITAN themes."
}
```

- [ ] **Step 7:** `npm run build` → clean. Launch check (user has the world at :30000): sheets/dialogs/chat
  render identically-styled to before via the injected Heritage Dark (diffs expected ONLY from the static-tier
  radius/border/spacing changes). Switching `theme` to `macchiato` in Module Settings recolors live windows
  without reload.
- [ ] **Step 8:** `npm test` → green. Commit: `feat: theme settings + ThemeManager injection; Variables.scss static tier`.

---

### Task 5: Legacy dark-mode removal

**Files:**
- Delete: `src/helpers/Settings/DarkModeSheets.js`, `DarkModeChatMessages.js`, `DarkModeJournals.js`,
  `src/hooks/OnRenderJournalSheet.js`, `src/hooks/OnRenderJournalTextPageSheet.js`
- Modify: `src/index.js`, `src/document/sheet/TitanDocumentSheet.js`, `src/helpers/dialogs/Dialog.js`,
  `src/document/types/chat-message/ChatMessage.js`, `tests/e2e/effect-chat-card.spec.js`,
  `tests/e2e/integration-manifest.spec.js` (if it lists a dark-mode settings key)

- [ ] **Step 1:** `src/index.js` — remove the two journal-hook imports and their two `Hooks.on` lines.
- [ ] **Step 2:** `TitanDocumentSheet.js` — remove the `darkModeSheets` import and the
  `if (darkModeSheets()) { classes.push('titan-dark-mode'); }` block (constructor comment updates from
  "default and dark-mode classes" to "default classes").
- [ ] **Step 3:** `Dialog.js` — remove its `titan-dark-mode` push (and the import if present).
- [ ] **Step 4:** `ChatMessage.js` — replace the dark-mode logic with core-message theming:

```js
import themeCoreMessages from '~/helpers/Settings/ThemeCoreMessages.js';
```

```js
      // Non-TITAN messages render unchanged unless the user opted to theme core messages, in which
      // case the card joins the TITAN chat surface (background + visibility tint, no badge).
      if (!(this.system instanceof TitanChatMessageDataModel)) {
         if (themeCoreMessages()) {
            html.classList.add('titan-core-themed');
         }
         return html;
      }

      // Apply TITAN styling classes.
      html.classList.add('titan');
      if (this.isOwner) {
         html.classList.add('owner');
      }
```

(The old `darkModeChatMessages` import and both `titan-dark-mode` branches are deleted. The visibility
classes/badge land in Task 7.)
- [ ] **Step 5:** Delete the five files listed above.
  `grep -rn "darkMode\|titan-dark-mode" src/` → zero hits.
- [ ] **Step 6:** Rewrite the `effect-chat-card.spec.js` dark-mode test (lines 165-209) as the core-theming
  probe — same structure, probing `themeCoreMessages` `true`/`false` and asserting `titan-core-themed`
  presence/absence and that the `titan` class never appears on a plain message. Test title:
  `'core-message theming classes non-TITAN messages when enabled'`.
- [ ] **Step 7:** `grep -n "darkMode" tests/` — update any remaining references (the
  `integration-manifest.spec.js` representative settings-keys list, if present, swaps a dark key for
  `'titan.theme'`).
- [ ] **Step 8:** `npm run build` + `npm test` → green. Commit: `refactor: remove CSS-inert legacy dark-mode settings and class plumbing`.

---

### Task 6: Design language on shared primitives (mixins + effect-tag consumers)

**Files:**
- Modify: `src/styles/Mixins/ButtonMixins.scss`, `AttributeMixins.scss`, `ResistanceMixins.scss`,
  `RarityMixins.scss`; every component style block consuming `*-effect-primary`.

- [ ] **Step 1: Flat buttons** — in `ButtonMixins.scss` `@mixin button`, replace
  `background: radial-gradient(var(--titan-button-background));` with
  `background: var(--titan-button-background);` and the hover block's
  `background: radial-gradient(ellipse at center, var(--titan-button-hover-background), var(--titan-button-background));`
  with `background: var(--titan-button-hover-background);` plus
  `--titan-button-font-color: var(--titan-button-hover-font-color);` so the hover text pairing applies.
- [ ] **Step 2: Identity pairing in mixins** — for each of `AttributeMixins` / `ResistanceMixins` /
  `RarityMixins`, every per-identity block gains its paired text override. Pattern (apply to all three
  identities in all mixins of each file, with that file's identity names):

```scss
@mixin attribute-colors {
   &.body {
      background: var(--titan-body-background);
      color: var(--titan-body-font-color);
   }
   // ... mind, soul identically with their tokens
}

@mixin attribute-button {
   &.body {
      --titan-button-background: var(--titan-body-background);
      --titan-button-font-color: var(--titan-body-font-color);
      --titan-button-hover-font-color: var(--titan-body-font-color);

      &:disabled {
         --titan-button-disabled-background: var(--titan-body-background);
         --titan-button-disabled-font-color: var(--titan-body-font-color);
      }
   }
   // ... mind, soul
}

@mixin attribute-input {
   &.body {
      --titan-input-background: var(--titan-body-background);
      --titan-input-font-color: var(--titan-body-font-color);

      &:disabled {
         --titan-input-disabled-background: var(--titan-body-background);
         --titan-input-disabled-font-color: var(--titan-body-font-color);
      }
   }
   // ... mind, soul
}
```

- [ ] **Step 3: Effect-tag text pairing** — `grep -rln "effect-primary" src/` and in each match add the
  paired font color beside every per-type gradient. Pattern (example for `custom`; repeat for all six types
  in each file):

```scss
&.custom {
   background: linear-gradient(var(--titan-gradient-degree), var(--titan-custom-effect-primary), var(--titan-custom-effect-secondary));
   color: var(--titan-custom-effect-font-color);
}
```

- [ ] **Step 4: Resource text pairing** — `grep -rln "stamina-background\|resolve-background\|wounds-background" src/`;
  wherever a matched style paints TEXT over the resource color (not a meter fill), add the paired
  `color: var(--titan-<resource>-font-color);`. Meter fill usages stay color-only.
- [ ] **Step 5:** `npm run build`; visual pass with the user over a character sheet, item sheet, dialog,
  chat log in all four themes (switch live via the setting). Tune individual theme token values for any
  contrast misses (stay in hue family; update the theme data modules + this is the expected
  "guidelines, not hard rules" adjustment point).
- [ ] **Step 6:** `npm test` and targeted e2e smoke: `npm run test:e2e -- render-smoke.spec.js` → green.
- [ ] **Step 7:** Commit: `feat: soft & airy primitives — flat buttons, identity text pairing, structure tokens`.

---

### Task 7: Chat visibility — tint + header band + badge

**Files:**
- Modify: `src/styles/Global.scss`, `src/document/types/chat-message/ChatMessage.js`, `lang/en.json`

- [ ] **Step 1: Global.scss** — replace the existing `&.chat-message { ... }` block inside `.titan` with the
  new surface, and add the core-themed + badge rules at top level:

```scss
   &.chat-message {
      background: var(--titan-chat-public-background);

      .message-header {
         background: var(--titan-chat-public-header-background);
         border-radius: var(--titan-border-radius) var(--titan-border-radius) 0 0;
         padding: var(--titan-spacing-standard);
      }

      &.titan-secret {
         background: var(--titan-chat-secret-background);

         .message-header {
            background: var(--titan-chat-secret-header-background);
         }

         .titan-visibility-badge {
            background: var(--titan-chat-secret-badge-background);
            color: var(--titan-chat-secret-badge-font-color);
         }
      }

      &.titan-gm-only {
         background: var(--titan-chat-gm-background);

         .message-header {
            background: var(--titan-chat-gm-header-background);
         }

         .titan-visibility-badge {
            background: var(--titan-chat-gm-badge-background);
            color: var(--titan-chat-gm-badge-font-color);
         }
      }
   }
```

And as a sibling of the `.titan` rule:

```scss
// Non-TITAN chat messages opted into the TITAN chat surface (no badge; core metadata keeps its layout).
.titan-core-themed.chat-message {
   background: var(--titan-chat-public-background);
   color: var(--titan-app-font-color);

   &.whisper {
      background: var(--titan-chat-secret-background);
   }

   &.blind {
      background: var(--titan-chat-gm-background);
   }
}

// The visibility badge: centered between the speaker and the metadata, sized to stay readable.
.titan-visibility-badge {
   align-self: center;
   border-radius: var(--titan-tag-border-radius);
   font-family: var(--titan-font-family-normal), sans-serif;
   font-size: 13px;
   font-weight: bold;
   letter-spacing: 0.06em;
   line-height: 1;
   margin-inline: auto var(--titan-spacing-large);
   padding: 4px 9px;
   text-transform: uppercase;
   white-space: nowrap;
}
```

- [ ] **Step 2: ChatMessage.js** — after the `owner` class block (TITAN messages) AND inside the
  core-themed branch, apply visibility classes; insert the badge for TITAN messages only:

```js
      // Visibility classes: blind messages are GM-only; any other whisper is a secret.
      applyVisibilityClass(html, this);
```

(in the non-TITAN branch, directly after `html.classList.add('titan-core-themed');`)

```js
      // Apply TITAN styling classes.
      html.classList.add('titan');
      if (this.isOwner) {
         html.classList.add('owner');
      }
      applyVisibilityClass(html, this);
      insertVisibilityBadge(html, this);
```

Module-level helpers at the bottom of the file:

```js
/**
 * Adds the visibility tint class for non-public messages.
 * @param {HTMLElement} html - The rendered chat-message element.
 * @param {TitanChatMessage} message - The message being rendered.
 */
function applyVisibilityClass(html, message) {
   if (message.blind) {
      html.classList.add('titan-gm-only');
   }
   else if (message.whisper.length > 0) {
      html.classList.add('titan-secret');
   }
}

/**
 * Inserts the centered visibility badge into the card header for non-public messages.
 * @param {HTMLElement} html - The rendered chat-message element.
 * @param {TitanChatMessage} message - The message being rendered.
 */
function insertVisibilityBadge(html, message) {
   // Public messages carry no badge.
   if (!message.blind && message.whisper.length === 0) {
      return;
   }

   // The badge element, labeled by visibility and slotted before the header metadata.
   const badge = document.createElement('span');
   badge.classList.add('titan-visibility-badge');
   badge.textContent = localize(message.blind ? 'gmOnlyMessage' : 'secretMessage');
   const header = html.querySelector('.message-header');
   const metadata = header?.querySelector('.message-metadata');
   if (metadata) {
      metadata.before(badge);
   }
   else {
      header?.append(badge);
   }
}
```

Add `import localize from '~/helpers/utility-functions/Localize.js';` at the top.

- [ ] **Step 3: `lang/en.json`** — add to the `LOCAL` object:

```json
"secretMessage": { "text": "Secret" },
"gmOnlyMessage": { "text": "GM Only" }
```

- [ ] **Step 4:** Build; manual check: public roll, `/w <self>` on a TITAN check (set core rollMode to
  blindroll and roll for GM-only) — tint + band + centered, readable, spaced badge in current theme.
- [ ] **Step 5:** Commit: `feat: chat visibility surface — tint, header band, centered badge`.

---

### Task 8: Theme editor application

**Files:**
- Create: `src/theme/editor/ThemeEditorApplication.js`, `src/theme/editor/ThemeEditorShell.svelte`,
  `src/theme/editor/PrettifyTokenName.js`
- Modify: `src/system/SystemSettings.js` (the `registerMenu` block from Task 4 Step 3 lands here),
  `lang/en.json`

- [ ] **Step 1: `PrettifyTokenName.js`**

```js
/**
 * Converts a theme token name to a human-readable label (e.g. 'app-background' → 'App Background').
 * Deliberately not localized: token names are the stable technical vocabulary of the theme format.
 * @param {string} token - The token name without the `--titan-` prefix.
 * @returns {string} The prettified label.
 */
export default function prettifyTokenName(token) {
   return token
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
}
```

- [ ] **Step 2: `ThemeEditorApplication.js`** — same mount lifecycle as `TitanDialog`
  (`src/helpers/dialogs/Dialog.js`), standalone:

```js
import { mount, unmount } from 'svelte';
import ThemeEditorShell from '~/theme/editor/ThemeEditorShell.svelte';

const { ApplicationV2 } = foundry.applications.api;

/**
 * @class ThemeEditorApplication
 * @extends {ApplicationV2}
 * The TITAN theme editor: pick a theme, duplicate built-ins, edit custom colors and fonts with a live
 * preview, and export / import / reset themes. Opened from the system settings menu.
 */
export default class ThemeEditorApplication extends ApplicationV2 {
   /** @type {object | undefined} The mounted Svelte component handle. */
   #mountHandle = void 0;

   /**
    * Default ApplicationV2 options. An explicit position height prevents the v14 auto-height
    * collapse to the tab strip.
    * @override
    */
   static DEFAULT_OPTIONS = {
      classes: ['titan', 'titan-theme-editor'],
      id: 'titan-theme-editor',
      position: { width: 960, height: 700 },
      window: { resizable: true, minimizable: true, title: 'LOCAL.themeEditor.text' },
   };

   /**
    * Prepare render data. The shell reads everything from the ThemeManager; nothing is needed here.
    * @override
    * @param {object} context - Render context (unused).
    * @param {object} options - Render options (unused).
    * @returns {Promise<object>} An empty context object.
    * @protected
    */
   async _renderHTML(context, options) {
      return {};
   }

   /**
    * Mount the editor Svelte tree on first render.
    * @override
    * @param {object} result - Value returned from `_renderHTML` (unused).
    * @param {HTMLElement} content - The content element to mount into.
    * @param {{ isFirstRender: boolean }} options - Render options.
    * @protected
    */
   _replaceHTML(result, content, options) {
      if (options.isFirstRender) {
         this.#mountHandle = mount(ThemeEditorShell, {
            target: content,
            context: new Map([['application', this]]),
         });
      }
   }

   /**
    * Tear down the Svelte tree when the window closes.
    * @override
    * @param {object} options - Settings forwarded from the Application close lifecycle.
    * @protected
    */
   _onClose(options) {
      super._onClose(options);
      if (this.#mountHandle) {
         unmount(this.#mountHandle, { outro: true });
         this.#mountHandle = void 0;
      }
   }
}
```

- [ ] **Step 3: `ThemeEditorShell.svelte`** — the complete editor UI (write under titan-svelte-dev rules):

```svelte
<script>
   import { BUILT_IN_THEMES } from '~/theme/ThemeManager.js';
   import { THEME_TOKEN_GROUPS, THEME_COLOR_TOKENS } from '~/theme/ThemeTokenContract.js';
   import ConfirmationDialog from '~/helpers/dialogs/ConfirmationDialog.js';
   import localize from '~/helpers/utility-functions/Localize.js';
   import prettifyTokenName from '~/theme/editor/PrettifyTokenName.js';
   import ThemePreviewPane from '~/theme/editor/ThemePreviewPane.svelte';

   /** @type {ThemeManager} The singleton theme manager. */
   const themeManager = game.titan.themeManager;

   /** @type {string} The id of the theme currently shown in the editor. */
   let selectedId = $state(themeManager.getActiveTheme().id);

   /** @type {object} A deep editable copy of the selected theme. */
   let draft = $state(structuredClone(themeManager.getTheme(selectedId)));

   /** @type {boolean} Whether the selected theme is a built-in (read-only). */
   const isBuiltIn = $derived(BUILT_IN_THEMES.some((theme) => theme.id === selectedId));

   /** @type {object[]} Every selectable theme, re-read after each mutation via the bump counter. */
   let listBump = $state(0);
   const allThemes = $derived.by(() => {
      void listBump;
      return themeManager.getAllThemes();
   });

   /** @type {string[]} The bundled font families offered by the font pickers. */
   const BUNDLED_FONTS = ["'Lato'", "'Open Sans'", "'Signika'"];

   /**
    * Switches the editor to another theme, discarding the current draft.
    * @param {string} id - The theme id to select.
    */
   function select(id) {
      selectedId = id;
      draft = structuredClone(themeManager.getTheme(id));
   }

   /**
    * Duplicates the selected theme into a new editable custom theme.
    * @returns {Promise<void>} Resolves once the duplicate is stored and selected.
    */
   async function duplicate() {
      // The duplicated theme with a fresh id and a derived name.
      const copy = structuredClone(draft);
      copy.id = `custom-${foundry.utils.randomID(8)}`;
      copy.name = `${draft.name} (Copy)`;
      await themeManager.saveCustomTheme(copy);
      listBump += 1;
      select(copy.id);
   }

   /**
    * Persists the current custom draft.
    * @returns {Promise<void>} Resolves once the theme is stored.
    */
   async function save() {
      await themeManager.saveCustomTheme($state.snapshot(draft));
      listBump += 1;
   }

   /**
    * Deletes the selected custom theme after confirmation.
    */
   function requestDelete() {
      new ConfirmationDialog(
         localize('deleteTheme'),
         [draft.name],
         localize('deleteTheme.confirmation'),
         localize('deleteTheme'),
         async () => {
            await themeManager.deleteCustomTheme(selectedId);
            listBump += 1;
            select('heritage-dark');
         },
      ).render(true);
   }

   /**
    * Resets all custom themes and the theme selection after confirmation.
    */
   function requestReset() {
      new ConfirmationDialog(
         localize('resetThemes'),
         [],
         localize('resetThemes.confirmation'),
         localize('resetThemes'),
         async () => {
            await themeManager.resetThemes();
            listBump += 1;
            select('heritage-dark');
         },
      ).render(true);
   }

   /**
    * Downloads the draft as a theme JSON file.
    */
   function exportTheme() {
      foundry.utils.saveDataToFile(
         themeManager.exportThemeText($state.snapshot(draft)),
         'application/json',
         `titan-theme-${draft.name.slugify()}.json`,
      );
   }

   /** @type {HTMLInputElement | undefined} The hidden file input backing the import button. */
   let importInput = $state();

   /**
    * Imports the picked theme file, surfacing validation errors as UI notifications.
    * @returns {Promise<void>} Resolves once the import completes or fails.
    */
   async function importTheme() {
      // The file chosen in the hidden input.
      const file = importInput?.files?.[0];
      if (!file) {
         return;
      }
      const text = await foundry.utils.readTextFromFile(file);
      const result = await themeManager.importThemeText(text);
      if (result.ok) {
         listBump += 1;
         select(result.theme.id);
      }
      else {
         ui.notifications.error(`TITAN | ${result.error}`);
      }
      importInput.value = '';
   }
</script>

<div class="theme-editor">
   <header class="toolbar">
      <select
         value={selectedId}
         onchange={(event) => select(event.target.value)}
      >
         {#each allThemes as theme (theme.id)}
            <option value={theme.id}>{theme.name}</option>
         {/each}
      </select>
      <button onclick={duplicate}>{localize('duplicateTheme')}</button>
      <button
         disabled={isBuiltIn}
         onclick={save}
      >
         {localize('saveTheme')}
      </button>
      <button onclick={exportTheme}>{localize('exportTheme')}</button>
      <button onclick={() => importInput?.click()}>{localize('importTheme')}</button>
      <button
         disabled={isBuiltIn}
         onclick={requestDelete}
      >
         {localize('deleteTheme')}
      </button>
      <button onclick={requestReset}>{localize('resetThemes')}</button>
      <input
         bind:this={importInput}
         accept="application/json"
         class="import-input"
         onchange={importTheme}
         type="file"
      />
   </header>

   <div class="identity">
      <label>
         {localize('themeName')}
         <input
            disabled={isBuiltIn}
            type="text"
            bind:value={draft.name}
         />
      </label>
      <label>
         {localize('darkTheme')}
         <input
            disabled={isBuiltIn}
            type="checkbox"
            bind:checked={draft.dark}
         />
      </label>
   </div>

   <div class="body">
      <div class="groups">
         {#each Object.entries(THEME_TOKEN_GROUPS) as [group, tokens] (group)}
            <section>
               <h3>{localize(`themeGroup.${group}`)}</h3>
               {#each tokens as token (token)}
                  <div class="token-row">
                     <span>{prettifyTokenName(token)}</span>
                     {#if THEME_COLOR_TOKENS.includes(token)}
                        <input
                           disabled={isBuiltIn}
                           type="color"
                           bind:value={draft.tokens[token]}
                        />
                     {:else}
                        <select
                           disabled={isBuiltIn}
                           bind:value={draft.tokens[token]}
                        >
                           {#each BUNDLED_FONTS as font (font)}
                              <option value={font}>{font.replaceAll("'", '')}</option>
                           {/each}
                        </select>
                        <input
                           disabled={isBuiltIn}
                           type="text"
                           bind:value={draft.tokens[token]}
                        />
                     {/if}
                  </div>
               {/each}
            </section>
         {/each}
      </div>
      <ThemePreviewPane tokens={draft.tokens} />
   </div>
</div>

<style lang="scss">
   .theme-editor {
      @include flex-column;

      height: 100%;
      padding: var(--titan-spacing-large);

      .toolbar {
         @include flex-row;

         gap: var(--titan-spacing-standard);

         button {
            @include button;

            width: auto;
         }

         .import-input {
            display: none;
         }
      }

      .identity {
         @include flex-row;

         gap: var(--titan-spacing-large);
         margin: var(--titan-spacing-large) 0;
      }

      .body {
         @include flex-row;

         align-items: stretch;
         flex: 1;
         gap: var(--titan-spacing-large);
         min-height: 0;

         .groups {
            flex: 1;
            overflow-y: auto;

            .token-row {
               @include flex-row;

               align-items: center;
               gap: var(--titan-spacing-standard);
               justify-content: space-between;
               padding: 2px 0;
            }
         }
      }
   }
</style>
```

(Adjust mixin names to the real ones in `FlexMixins.scss` when writing; selects/inputs may use the shared
`Select`/`TextInput` primitives instead of raw elements if their props fit — prefer the shared primitives
where they accept plain value bindings.)

- [ ] **Step 4:** Move the `registerMenu` block (Task 4 Step 3) into `SystemSettings.js` now, with the
  static import of `ThemeEditorApplication`.
- [ ] **Step 5: `lang/en.json` LOCAL additions:**

```json
"themeEditor": { "text": "TITAN Theme Editor" },
"duplicateTheme": { "text": "Duplicate" },
"saveTheme": { "text": "Save" },
"exportTheme": { "text": "Export" },
"importTheme": { "text": "Import" },
"deleteTheme": { "text": "Delete", "confirmation": { "text": "Delete this custom theme? This cannot be undone." } },
"resetThemes": { "text": "Reset Themes", "confirmation": { "text": "Delete ALL custom themes and restore default theme settings?" } },
"themeName": { "text": "Name" },
"darkTheme": { "text": "Dark Theme" },
"themeGroup": {
   "application": { "text": "Application" },
   "panels": { "text": "Panels" },
   "buttons": { "text": "Buttons" },
   "inputs": { "text": "Inputs" },
   "labels": { "text": "Labels" },
   "tags": { "text": "Tags" },
   "calculatedValues": { "text": "Calculated Values" },
   "attributes": { "text": "Attributes" },
   "resistances": { "text": "Resistances" },
   "resources": { "text": "Resources" },
   "rarity": { "text": "Rarity" },
   "diceResults": { "text": "Dice Results" },
   "checkResults": { "text": "Check Results" },
   "mods": { "text": "Modifiers" },
   "meters": { "text": "Meters" },
   "effects": { "text": "Effects" },
   "chat": { "text": "Chat Messages" },
   "fonts": { "text": "Fonts" }
}
```

(`localize()` appends `.text`, so nested confirmation strings are read as
`localize('deleteTheme.confirmation')` → `LOCAL.deleteTheme.confirmation.text`.)
- [ ] **Step 6:** Build; open Settings → TITAN → Theme Editor: picker lists 4 built-ins; Duplicate creates an
  editable copy; color edits + Save persist and re-skin live; Delete and Reset confirm first.
- [ ] **Step 7:** Commit: `feat: theme editor application (duplicate, edit, export, import, reset)`.

---

### Task 9: Live preview pane

**Files:**
- Create: `src/theme/editor/ThemePreviewPane.svelte`

- [ ] **Step 1:** Write the specimen pane. It renders representative primitives under a style attribute that
  re-declares every token locally, so the preview always shows the DRAFT, not the applied theme:

```svelte
<script>
   import localize from '~/helpers/utility-functions/Localize.js';

   /** @type {{ tokens: Object<string, string> }} The draft theme tokens to preview. */
   const { tokens } = $props();

   /** @type {string} The inline style declaring every draft token as a scoped custom property. */
   const styleVars = $derived(
      Object.entries(tokens).map(([token, value]) => `--titan-${token}: ${value}`).join('; '),
   );
</script>

<div
   class="preview"
   style={styleVars}
>
   <div class="app-surface">
      <div class="chips">
         <span class="chip body">{localize('body')} 4</span>
         <span class="chip mind">{localize('mind')} 3</span>
         <span class="chip soul">{localize('soul')} 2</span>
      </div>
      <div class="panel">
         <button class="sample-button">⚅ 6d6</button>
         <span class="sample-tag">{localize('rare')}</span>
         <input
            class="sample-input"
            type="text"
            value="Sample"
         />
      </div>
      <div class="chat-card public">{localize('chatPreviewPublic')}</div>
      <div class="chat-card secret">{localize('chatPreviewSecret')}</div>
      <div class="chat-card gm">{localize('chatPreviewGmOnly')}</div>
   </div>
</div>

<style lang="scss">
   .preview {
      flex: 0 0 280px;
      overflow-y: auto;

      .app-surface {
         background: var(--titan-app-background);
         border-radius: var(--titan-border-radius);
         color: var(--titan-app-font-color);
         font-family: var(--titan-font-family-normal), sans-serif;
         padding: var(--titan-spacing-large);

         .chips {
            @include flex-row;

            gap: var(--titan-spacing-standard);

            .chip {
               @include label;
               @include attribute-colors;
            }
         }

         .panel {
            @include panel-1;
            @include flex-row;

            align-items: center;
            border-radius: var(--titan-border-radius);
            gap: var(--titan-spacing-standard);
            margin: var(--titan-spacing-large) 0;
            padding: var(--titan-spacing-large);

            .sample-button {
               @include button;

               width: auto;
            }

            .sample-tag {
               @include tag;
            }

            .sample-input {
               @include input;
            }
         }

         .chat-card {
            border-radius: var(--titan-border-radius);
            margin-top: var(--titan-spacing-standard);
            padding: var(--titan-spacing-standard);

            &.public { background: var(--titan-chat-public-background); }
            &.secret { background: var(--titan-chat-secret-background); }
            &.gm { background: var(--titan-chat-gm-background); }
         }
      }
   }
</style>
```

(Verify the exact mixin names — `label`, `input` — against `LabelMixins.scss`/`InputMixins.scss` when
writing; substitute the real mixin identifiers.) Add `LOCAL` keys `chatPreviewPublic` ("Public message"),
`chatPreviewSecret` ("Secret message"), `chatPreviewGmOnly` ("GM-only message") — `body`/`mind`/`soul`/`rare`
already exist.
- [ ] **Step 2:** Build; verify edits to any color in the editor update the preview immediately (no Save).
- [ ] **Step 3:** Commit: `feat: theme editor live preview pane`.

---

### Task 10: E2E theme suite

**Files:**
- Create: `tests/e2e/theme.spec.js`

- [ ] **Step 1:** Write the suite on the shared-world harness (one boot per file; helpers from
  `tests/e2e/world.js` / `fixtures.js`):

```js
import { expect, test } from '@playwright/test';
import { login } from './fixtures.js';
import { attachPageErrors, clearChat, closeAllApps } from './world.js';

/**
 * Theme-system walk: live switching, Auto resolution against the core color scheme, custom-theme
 * import round-trip, and the chat visibility surface. All theme state is restored after each probe.
 */

/** @type {import('@playwright/test').Page} The file-shared, logged-in page. */
let page;
/** @type {string[]} Uncaught page errors collected during the current test. */
let errors;

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page);
   await clearChat(page);
});

test.afterEach(async () => {
   // Restore theme state before closing apps so later files start from defaults.
   await page.evaluate(async () => {
      await game.settings.set('titan', 'theme', 'auto');
      await game.settings.set('titan', 'customThemes', {});
   });
   await closeAllApps(page);
   errors.length = 0;
});

test.afterAll(async () => {
   await page?.close();
});

test.describe('v14 theme system', () => {
   test('switching the theme updates tokens live without reload', async () => {
      // Read the injected app-background under an explicit heritage-dark selection.
      await page.evaluate(() => game.settings.set('titan', 'theme', 'heritage-dark'));
      await expect
         .poll(() => page.evaluate(
            () => getComputedStyle(document.documentElement).getPropertyValue('--titan-app-background').trim(),
         ), { message: 'heritage-dark applies' })
         .toBe('#262836');

      // Switch to Macchiato and confirm the token swaps in place.
      await page.evaluate(() => game.settings.set('titan', 'theme', 'macchiato'));
      await expect
         .poll(() => page.evaluate(
            () => getComputedStyle(document.documentElement).getPropertyValue('--titan-app-background').trim(),
         ), { message: 'macchiato applies' })
         .toBe('#24273a');
      expect(errors, `uncaught errors during theme switch:\n${errors.join('\n')}`).toEqual([]);
   });

   test('auto follows the Foundry core color scheme', async () => {
      // Force the core scheme light, then dark, asserting the world-default theme tracks it.
      const observed = await page.evaluate(async () => {
         await game.settings.set('titan', 'theme', 'auto');

         /** @type {object} The original core UI config, restored after the probe. */
         const original = game.settings.get('core', 'uiConfig');

         /**
          * Sets the core applications color scheme and reads back the applied app background.
          * @param {string} scheme - The colorScheme.applications value to probe under.
          * @returns {Promise<string>} The applied --titan-app-background value.
          */
         async function probe(scheme) {
            await game.settings.set('core', 'uiConfig', {
               ...original,
               colorScheme: { ...original.colorScheme, applications: scheme },
            });
            await titanWait(
               () => getComputedStyle(document.documentElement)
                  .getPropertyValue('--titan-app-background').trim() !== '',
               { message: 'theme applied' },
            );
            return getComputedStyle(document.documentElement).getPropertyValue('--titan-app-background').trim();
         }

         const light = await probe('light');
         const dark = await probe('dark');
         await game.settings.set('core', 'uiConfig', original);
         return { light, dark };
      });

      // World defaults: heritage-light (#f4f4f6) and heritage-dark (#262836).
      expect(observed.light, 'auto resolves the light world default').toBe('#f4f4f6');
      expect(observed.dark, 'auto resolves the dark world default').toBe('#262836');
      expect(errors, `uncaught errors during auto probe:\n${errors.join('\n')}`).toEqual([]);
   });

   test('custom theme export text round-trips through import and applies', async () => {
      const result = await page.evaluate(async () => {
         // Export Macchiato, retint its app background, and import it as a custom theme.
         const themeManager = game.titan.themeManager;
         const exported = JSON.parse(themeManager.exportThemeText(themeManager.getTheme('macchiato')));
         exported.name = 'E2E Custom';
         exported.tokens['app-background'] = '#123456';
         const imported = await themeManager.importThemeText(JSON.stringify(exported));
         if (!imported.ok) {
            return { error: imported.error };
         }
         await game.settings.set('titan', 'theme', imported.theme.id);
         await titanWait(
            () => getComputedStyle(document.documentElement)
               .getPropertyValue('--titan-app-background').trim() === '#123456',
            { message: 'custom theme applied' },
         );
         return {
            applied: getComputedStyle(document.documentElement)
               .getPropertyValue('--titan-app-background').trim(),
            listed: themeManager.getAllThemes().some((theme) => theme.name === 'E2E Custom'),
         };
      });

      expect(result.error, 'import must validate').toBeUndefined();
      expect(result.applied, 'imported theme applies').toBe('#123456');
      expect(result.listed, 'imported theme is listed').toBe(true);
      expect(errors, `uncaught errors during round-trip:\n${errors.join('\n')}`).toEqual([]);
   });

   test('blind TITAN check carries the GM-only tint and a readable badge', async () => {
      // Roll a blind attribute check on a purpose-built actor and inspect the rendered card.
      const observed = await page.evaluate(async () => {
         /** @type {string} The original roll mode, restored after the probe. */
         const originalRollMode = game.settings.get('core', 'rollMode');
         await game.settings.set('core', 'rollMode', 'blindroll');

         // The purpose-built roller (recreated fresh to keep the fixture deterministic).
         const stale = game.actors.getName('E2E Theme Roller');
         if (stale) {
            await stale.delete();
         }
         const actor = await Actor.create({ name: 'E2E Theme Roller', type: 'player' });
         const before = game.messages.size;
         await actor.system.rollAttributeCheck({ attribute: 'body' });
         await titanWait(() => game.messages.size > before, { message: 'blind check posted' });

         // The newest message and its rendered chat-log element.
         const message = game.messages.contents[game.messages.size - 1];
         await titanWait(
            () => !!globalThis.document.querySelector(`.message[data-message-id="${message.id}"]`),
            { message: 'blind card rendered' },
         );
         const li = globalThis.document.querySelector(`.message[data-message-id="${message.id}"]`);
         const badge = li?.querySelector('.titan-visibility-badge');
         const badgeStyle = badge ? getComputedStyle(badge) : undefined;

         await game.settings.set('core', 'rollMode', originalRollMode);
         await actor.delete();
         return {
            blind: message.blind,
            hasGmClass: !!li?.classList.contains('titan-gm-only'),
            badgeText: badge?.textContent,
            badgeFontSize: badgeStyle ? Number.parseFloat(badgeStyle.fontSize) : 0,
         };
      });

      expect(observed.blind, 'roll posted as blind').toBe(true);
      expect(observed.hasGmClass, 'card carries titan-gm-only').toBe(true);
      expect(observed.badgeText, 'badge text').toBe('GM Only');
      expect(observed.badgeFontSize, 'badge text is readable (>= 12px)').toBeGreaterThanOrEqual(12);
      expect(errors, `uncaught errors during blind-check probe:\n${errors.join('\n')}`).toEqual([]);
   });
});
```

- [ ] **Step 2:** `npm run build` (e2e drives `dist/`), then from a FOREGROUND shell:
  `npm run test:e2e -- theme.spec.js effect-chat-card.spec.js` → green.
- [ ] **Step 3:** Commit: `test: e2e theme suite — live switch, auto, round-trip, visibility badge`.

---

### Task 11: Full verification + documentation

- [ ] **Step 1:** `npm test` (full unit) and, foreground, the FULL `npm run test:e2e` → green (expect minor
  fixture churn in specs asserting old colors/classes; fix on contact).
- [ ] **Step 2:** `npx eslint src tests` → 0 problems.
- [ ] **Step 3: Docs (required):**
  - `docs/TODO.md`: TODO #26 stays (surface passes now unblocked); update its "Why deferred" line to note the
    foundation has shipped.
  - Spec: confirm the plan-time amendments section (added when this plan was written) is accurate post-ship.
  - `titan-codebase` skill: `references/architecture.md` — add `src/theme/` to the directory map and module
    boundaries (ThemeManager created in OnceInit, `game.titan.themeManager`); `references/conventions.md` —
    replace the dark-mode/`titan-dark-mode` mentions with the theming model (two-tier tokens, `:root`
    injection, pairing rule, `titan-core-themed`, visibility classes/badge); fix the now-stale
    `TitanDialog` classes note (`titan-dark-mode` no longer pushed).
  - `docs/POST_WORK_FINDINGS.md`: note any contrast tunings made during Task 6 Step 5.
- [ ] **Step 4:** Commit: `docs: theming foundation — skill map, TODO, findings`.
- [ ] **Step 5:** Hand off per `mainline-plan-execution`: ONE dispatched fresh-context review of the full
  branch, then merge `feature/theme-foundation` → `main` (no force, no rebase), push, confirm branch deletion
  with the user.

---

## Self-review notes

- **Spec coverage:** tokens/two-tier (T1/T4), pairing rule (T1/T6), four themes (T1/T2), resolution + Auto +
  world defaults (T3/T4), no-reload switching (T4), editor/export/import/reset (T8/T9), chat treatment +
  badge (T7), legacy removal + core-message option (T5, amendments), unit matrix (T1-T3), e2e matrix (T10),
  docs (T11). Soft & airy primitives (T4 static values + T6 mixins).
- **Known judgment points for the executor:** exact mixin names in the two editor Svelte files (verified on
  contact), `theme` setting choices construction order (T4 Step 3 note), shared primitives vs raw elements in
  the editor UI, contrast tuning of guideline values (explicitly sanctioned by the spec).

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
      'highlighted-background', 'highlighted-font-color', 'heading-font-color', 'accent-color',
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
   calculatedValues: [
      'calculated-value-background', 'calculated-value-font-color', 'calculated-value-border-color',
   ],
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
      'chat-public-badge-background', 'chat-public-badge-font-color',
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
   ['chat-public-badge-background', 'chat-public-badge-font-color'],
   ['chat-secret-badge-background', 'chat-secret-badge-font-color'],
   ['chat-gm-badge-background', 'chat-gm-badge-font-color'],
]);

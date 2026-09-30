import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import buildEffectTagTooltip from '~/helpers/utility-functions/BuildEffectTagTooltip.js';

/** @type {string} The repository root. */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/**
 * The report duration types, derived from the `effect.<type>.desc` lead keys in the English localization, so a new
 * duration type is covered without editing this test.
 * @type {string[]}
 */
const DURATION_TYPES = Object.keys(JSON.parse(readFileSync(path.join(ROOT, 'lang/en.json'), 'utf-8')).LOCAL)
   .map((key) => /^effect\.(\w+)\.desc\.text$/.exec(key)?.[1])
   .filter(Boolean);

/**
 * Names a duration type's tag component.
 * @param {string} type - The duration type (`turnStart`).
 * @returns {string} The component name (`TurnStartEffectTag`).
 */
function wrapperName(type) {
   return `${type[0].toUpperCase()}${type.slice(1)}EffectTag`;
}

/**
 * Reads a source file of the repository.
 * @param {string} relativePath - The path from the repository root.
 * @returns {string} The file's text.
 */
function readSource(relativePath) {
   return readFileSync(path.join(ROOT, relativePath), 'utf-8');
}

beforeEach(() => {
   // Brackets mark each localization, so a second localization of already-localized text shows as nested brackets.
   globalThis.game = {
      i18n: {
         localize: (key) => `[${key}]`,
      },
   };
});

afterEach(() => {
   delete globalThis.game;
});

describe('buildEffectTagTooltip', () => {
   it('leads with the duration text, then the entry\'s stored description', () => {
      expect(buildEffectTagTooltip({
         description: '<p>Stored text</p>',
         img: 'blade.webp',
         label: 'Poisoned Blade',
      }, 'effect.turnStart.desc')).toEqual({
         localize: false,
         text: '[LOCAL.effect.turnStart.desc.text]<p>Stored text</p>',
      });
   });

   it('gives a condition entry no lead and localizes its description key on this client', () => {
      expect(buildEffectTagTooltip({
         descriptionKey: 'blinded.desc',
         img: 'blinded.svg',
         label: 'Blinded',
      })).toEqual({
         localize: false,
         text: '[LOCAL.blinded.desc.text]',
      });
   });

   it('prefers the key over stored text', () => {
      expect(buildEffectTagTooltip({
         description: '<p>Stored text</p>',
         descriptionKey: 'blinded.desc',
         img: 'blinded.svg',
         label: 'Blinded',
      }).text).toBe('[LOCAL.blinded.desc.text]');
   });

   it('shows the stored description of an older report\'s condition entry, which has no key', () => {
      expect(buildEffectTagTooltip({
         description: '<p>Stored text</p>',
         img: 'blinded.svg',
         label: 'Blinded',
      }).text).toBe('<p>Stored text</p>');
   });

   it('shows only the lead text for an entry without a description or with an empty paragraph', () => {
      expect(buildEffectTagTooltip({
         img: 'blade.webp',
         label: 'Poisoned Blade',
      }, 'effect.permanent.desc').text).toBe('[LOCAL.effect.permanent.desc.text]');
      expect(buildEffectTagTooltip({
         description: '<p></p>',
         img: 'blade.webp',
         label: 'Poisoned Blade',
      }, 'effect.expired.desc').text).toBe('[LOCAL.effect.expired.desc.text]');
   });
});

describe('report effect tags', () => {
   it('derives the six report duration types from the lead keys', () => {
      expect([...DURATION_TYPES].sort()).toEqual([
         'custom',
         'expired',
         'initiative',
         'permanent',
         'turnEnd',
         'turnStart',
      ]);
   });

   it.each(DURATION_TYPES)('the %s tag passes its own lead key', (type) => {
      expect(readSource(`src/helpers/svelte-components/tag/effects/${wrapperName(type)}.svelte`))
         .toContain(`leadKey="effect.${type}.desc"`);
   });

   it('renders each report duration list through that duration\'s own tag', () => {
      /** @type {Record<string, string|undefined>} The tag component each report list renders, by file and list. */
      const rendered = {};
      for (const file of [
         'ChatMessageEffectsTags.svelte',
         'ChatMessageExpiredEffectsTags.svelte',
      ]) {
         /** @type {string} The report tag component's source. */
         const source = readSource(`src/document/types/chat-message/components/tags/${file}`);
         for (const [, type, body] of source.matchAll(
            /\{#each document\.data\.system\.effects\.(\w+) as effect\}([\s\S]*?)\{\/each\}/g,
         )) {
            rendered[`${file}:${type}`] = /<(\w+EffectTag)\b/.exec(body)?.[1];
         }
      }
      expect(rendered).toEqual({
         ...Object.fromEntries(DURATION_TYPES.map((type) => [
            `ChatMessageEffectsTags.svelte:${type}`,
            wrapperName(type),
         ])),
         'ChatMessageExpiredEffectsTags.svelte:expired': 'ExpiredEffectTag',
      });
   });
});

<script>
   import IconTag from '~/helpers/svelte-components/tag/IconTag.svelte';
   import { SUPPRESSED_ICON } from '~/system/Icons.js';

   /**
    * @typedef {object} SuppressedEffectTagProps
    * @property {string[]} [sources] - The names of the immunities suppressing the effect, in source order.
    * @property {string} [testId] - Optional test identifier bound to `data-testid` on the tag.
    */

   /** @type {SuppressedEffectTagProps} */
   const { sources = [], testId = void 0 } = $props();

   /** @type {string} The tag's label naming every suppressing immunity ("Suppressed: Ward, Charm"). */
   const label = $derived(game.i18n.format('LOCAL.suppressedBy.text', { sources: sources.join(', ') }));
</script>

<!--Names the immunities suppressing an effect; callers mount it only while that list is non-empty.-->
<IconTag
   icon={SUPPRESSED_ICON}
   {label}
   {testId}
   tooltip={'suppressedBy.desc'}
/>

<script>
   import SpellAspectTags from '~/helpers/svelte-components/tag/SpellAspectTags.svelte';
   import selectDisplayedSpellAspects from '~/document/types/item/types/spell/SelectDisplayedSpellAspects.js';

   /**
    * @typedef {object} SpellChatAspectsProps
    * @property {object} [item] - The Spell's chat-message system snapshot.
    */

   /** @type {SpellChatAspectsProps} */
   const { item = void 0 } = $props();

   // item is a static chat-message system snapshot — it never changes after mount.
   // svelte-ignore state_referenced_locally
   /** @type {object[]} The standard Spell Aspects that make up the spell's total cost. */
   const displayedStandardAspects = selectDisplayedSpellAspects(item.aspect, item.customAspect)
      .filter((entry) => !entry.isCustom)
      .map((entry) => entry.aspect);
</script>

<SpellAspectTags
   standardAspects={displayedStandardAspects}
   customAspects={item.customAspect}
/>

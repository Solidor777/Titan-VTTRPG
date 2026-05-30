<script>
   import SpellAspectTags from '~/helpers/svelte-components/tag/SpellAspectTags.svelte';

   /**
    * @typedef {object} SpellChatAspectsProps
    * @property {object} [item] - The titan flags data for the item.
    */

   /** @type {SpellChatAspectsProps} */
   const { item = void 0 } = $props();

   /** @type {object[]} List of enabled Spell Aspects. */
   const enabledAspects = item.system.aspect.filter((aspect) => aspect.enabled);
</script>

<SpellAspectTags
   standardAspects={enabledAspects}
   customAspects={item.customAspect}
/>

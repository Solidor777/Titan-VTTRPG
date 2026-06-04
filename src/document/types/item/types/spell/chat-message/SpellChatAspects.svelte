<script>
   import SpellAspectTags from '~/helpers/svelte-components/tag/SpellAspectTags.svelte';

   /**
    * @typedef {object} SpellChatAspectsProps
    * @property {object} [item] - The titan flags data for the item.
    */

   /** @type {SpellChatAspectsProps} */
   const { item = void 0 } = $props();

   // item is a static chat-message system snapshot — it never changes after mount.
   // svelte-ignore state_referenced_locally
   /** @type {object[]} List of enabled Spell Aspects. */
   const enabledAspects = item.aspect.filter((aspect) => aspect.enabled);
</script>

<SpellAspectTags
   standardAspects={enabledAspects}
   customAspects={item.customAspect}
/>

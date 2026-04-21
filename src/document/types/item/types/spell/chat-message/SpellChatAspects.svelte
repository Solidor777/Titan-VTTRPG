<script>
   import SpellAspectTags from '~/helpers/svelte-components/tag/SpellAspectTags.svelte';

   /** @type {object} The titan flags data for the item. */
   export let item = void 0;

   /** @type {SpellAspect[]} List of enabled Spell Aspects. */
   const enabledAspects = item.system.aspect.filter((aspect) => aspect.enabled);
</script>

<SpellAspectTags
   standardAspects={enabledAspects}
   customAspects={item.customAspect}
/>

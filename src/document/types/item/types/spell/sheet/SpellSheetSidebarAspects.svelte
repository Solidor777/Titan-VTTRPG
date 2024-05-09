<script>
   import { getContext } from 'svelte';
   import { slide } from 'svelte/transition';
   import SpellSheetSidebarCustomAspect
      from '~/document/types/item/types/spell/sheet/SpellSheetSidebarCustomAspect.svelte';
   import SpellSheetSidebarStandardAspect
      from '~/document/types/item/types/spell/sheet/SpellSheetSidebarStandardAspect.svelte';

   // Application statee reference
   const document = getContext('document');

   $: enabledAspects = $document.system.aspect.filter(
      (aspect) => aspect.enabled === true,
   );
</script>

<ol>
   <!--Each Aspect-->
   {#each enabledAspects as aspect, idx (aspect.label)}
      <li transition:slide|local>
         <SpellSheetSidebarStandardAspect {aspect}/>
      </li>
   {/each}

   {#each $document.system.customAspect as aspect, idx (aspect.uuid)}
      <li transition:slide|local>
         <SpellSheetSidebarCustomAspect {idx}/>
      </li>
   {/each}
</ol>

<style lang="scss">
   ol {
      @include flex-column;
      @include flex-group-top;
      @include list;
      @include border-bottom-sides;
      @include panel-3;
      width: calc(100% - var(--padding-large));
      padding: 0 var(--padding-standard);

      li {
         @include flex-column;
         @include flex-group-top;

         width: 100%;
         margin: var(--padding-standard) 0;

         &:not(:first-child) {
            @include border-top;
            padding-top: var(--padding-standard);
         }
      }
   }
</style>

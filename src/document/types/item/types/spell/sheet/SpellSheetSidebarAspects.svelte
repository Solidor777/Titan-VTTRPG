<script>
   import { getContext } from 'svelte';
   import { slide } from 'svelte/transition';
   import SpellSheetSidebarCustomAspect
      from '~/document/types/item/types/spell/sheet/SpellSheetSidebarCustomAspect.svelte';
   import SpellSheetSidebarStandardAspect
      from '~/document/types/item/types/spell/sheet/SpellSheetSidebarStandardAspect.svelte';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {object[]} The enabled standard aspects. */
   const enabledAspects = $derived(
      document.data.system.aspect.filter(
         (aspect) => aspect.enabled === true,
      )
   );
</script>

<ol>
   <!--Each Aspect-->
   {#each enabledAspects as aspect, idx (aspect.label)}
      <li transition:slide|local>
         <SpellSheetSidebarStandardAspect {aspect}/>
      </li>
   {/each}

   {#each document.data.system.customAspect as aspect, idx (aspect.uuid)}
      <li transition:slide|local>
         <SpellSheetSidebarCustomAspect {idx}/>
      </li>
   {/each}
</ol>

<style lang="scss">
   // The surrounding SidebarCheck details panel supplies the surface; the list draws no frame.
   ol {
      @include flex-column;
      @include flex-group-top;
      @include list;

      width: 100%;
      padding: 0;

      li {
         @include flex-column;
         @include flex-group-top;

         width: 100%;
         margin: var(--titan-spacing-standard) 0;

         &:not(:first-child) {
            @include border-top;
            @include padding-top-standard;
         }
      }
   }
</style>

<script>
   import { getContext } from 'svelte';
   import { slide } from 'svelte/transition';
   import SpellSheetSidebarCustomAspect from './SpellSheetSidebarCustomAspect.svelte';
   import SpellSheetSidebarStandardAspect from './SpellSheetSidebarStandardAspect.svelte';

   // Application statee reference
   const document = getContext('DocumentStore');

   $: enabledAspects = $document.system.aspect.filter(
      (aspect) => aspect.enabled === true
   );
</script>

<ol>
   <!--Each Aspect-->
   {#each enabledAspects as aspect, idx (aspect.label)}
      <li transition:slide|local>
         <SpellSheetSidebarStandardAspect {aspect} />
      </li>
   {/each}

   {#each $document.system.customAspect as aspect, idx (aspect.uuid)}
      <li transition:slide|local>
         <SpellSheetSidebarCustomAspect {idx} />
      </li>
   {/each}
</ol>

<style lang="scss">
   @import '../../../../Styles/Mixins.scss';

   ol {
      @include flex-column;
      @include flex-group-top;
      @include list;
      @include border-bottom-sides;
      @include panel-3;
      width: calc(100% - 0.5rem);
      padding: 0 0.25rem;

      li {
         @include flex-column;
         @include flex-group-top;

         width: 100%;
         margin: 0.25rem 0;

         &:not(:first-child) {
            @include border-top;
            padding-top: 0.25rem;
         }
      }
   }
</style>

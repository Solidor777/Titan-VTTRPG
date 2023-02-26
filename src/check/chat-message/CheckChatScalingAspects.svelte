<script>
   import { getContext } from 'svelte';
   import CheckChatScalingAspect from './CheckChatScalingAspect.svelte';

   // Document reference
   const document = getContext('DocumentStore');
</script>

<div class="aspects">
   <!--Each aspect-->
   {#each $document.flags.titan.results.scalingAspect as aspect, idx}
      <!--Aspect-->
      <div class="aspect">
         <CheckChatScalingAspect {idx} />
      </div>
   {/each}
</div>

<style lang="scss">
   @import '../../styles/mixins.scss';
   .aspects {
      @include flex-column;
      @include flex-group-top;
      @include border;
      @include label;
      padding: 0.5rem;
      width: 100%;

      .aspect {
         @include flex-row;
         @include flex-group-center;
         @include font-size-normal;
         width: 100%;

         &:not(:first-child) {
            @include border-top;
            margin-top: 0.25rem;
            padding-top: 0.25rem;
         }
      }
   }
</style>

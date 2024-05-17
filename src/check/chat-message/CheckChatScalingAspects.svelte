<script>
   import {getContext} from 'svelte';
   import CheckChatScalingAspect from '~/check/chat-message/CheckChatScalingAspect.svelte';

   // Document reference
   const document = getContext('document');
</script>

<div class="aspects">
   <!--Each aspect-->
   {#each $document.flags.titan.results.scalingAspect as aspect, idx}
      <!--Aspect-->
      <div class="aspect">
         <CheckChatScalingAspect {idx}/>
      </div>
   {/each}
</div>

<style lang="scss">
   .aspects {
      @include flex-column;
      @include flex-group-top;
      width: 100%;

      .aspect {
         @include flex-row;
         @include flex-group-center;
         @include font-size-normal;

         width: 100%;

         &:not(:first-child) {
            margin-top: var(--padding-large);
         }
      }
   }
</style>

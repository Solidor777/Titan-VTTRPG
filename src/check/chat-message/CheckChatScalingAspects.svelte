<script>
   import CheckChatScalingAspect from "./CheckChatScalingAspect.svelte";

   export let scalingAspects = void 0;
</script>

<div class="aspects">
   <!--Each aspect-->
   {#each scalingAspects as aspect}
      <!--Aspect-->
      <div class="aspect">
         <CheckChatScalingAspect bind:aspect />
      </div>
   {/each}
</div>

<style lang="scss">
   @import "../../styles/mixins.scss";
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

<script>
   import CheckScalingAspect from "./CheckScalingAspect.svelte";

   export let scalingAspects = void 0;
</script>

<div class="aspects">
   <!--Each aspect-->
   {#each scalingAspects as aspect}
      <!--Aspect-->
      <div class="aspect">
         <CheckScalingAspect bind:aspect />
      </div>
   {/each}
</div>

<style lang="scss">
   @import "../../styles/mixins.scss";
   .aspect {
      @include flex-column;
      @include flex-group-top;
      @include border;
      padding: 0.5rem;
      width: 100%;
      background: var(--label-background-color);

      .aspect {
         @include flex-row;
         @include flex-group-center;
         font-size: 1rem;
         width: 100%;

         &:not(:first-child) {
            @include border-top;
            margin-top: 0.25rem;
            padding-top: 0.25rem;
         }
      }
   }
</style>

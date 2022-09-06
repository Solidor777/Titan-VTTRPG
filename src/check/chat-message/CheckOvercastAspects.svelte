<script>
   import CheckOvercastAspect from "./CheckOvercastAspect.svelte";

   export let overcastAspects = void 0;
</script>

<div class="aspects">
   <!--Each aspect-->
   {#each overcastAspects as aspect}
      <!--Aspect-->
      <div class="aspect">
         <CheckOvercastAspect bind:aspect />
      </div>
   {/each}
</div>

<style lang="scss">
   @import "../../styles/mixins.scss";
   .aspects {
      @include flex-column;
      @include flex-group-top;
      @include border;
      padding: 0.5rem;
      width: 100%;
      background-color: var(--label-background-color);

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

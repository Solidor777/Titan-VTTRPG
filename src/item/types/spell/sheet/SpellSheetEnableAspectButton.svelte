<script>
   import { getContext } from "svelte";
   import { localize } from "~/helpers/Utility.js";
   import EfxButton from "~/helpers/svelte-components/button/EfxButton.svelte";

   // Value to toggle
   export let enabled = void 0;

   // Label to display
   export let label = void 0;

   // Cost of the aspect
   export let cost = void 0;

   // Setup
   const document = getContext("DocumentStore");
</script>

<EfxButton
   on:click={async () => {
      enabled = !enabled;
      const system = $document.system;
      await $document.update({
         system: system,
      });
   }}
>
   <div class="button-content">
      <!--Label-->
      <div class="aspect-label">
         {label}
         <!--Icon-->
         <div class="icon">
            <i class={enabled ? "fas fa-square-check" : "fas fa-square"} />
         </div>
      </div>

      <!--Cost-->
      <div class="cost">
         <!--Label-->
         <div class="cost-label">
            {localize("cost")}:
         </div>

         <!--Value-->
         <div class="value">
            {cost}
         </div>
      </div>
   </div>

   <div class="spacer" />
</EfxButton>

<style lang="scss">
   @import "../../../../Styles/Mixins.scss";

   .button-content {
      @include flex-row;
      @include flex-space-between;
      width: 100%;
      margin: 0;
      z-index: inherit;

      .aspect-label {
         @include flex-row;
         @include flex-group-left;
         margin-left: 0.5rem;
         z-index: inherit;

         .icon {
            @include flex-row;
            @include flex-group-right;
            margin-left: 0.5rem;
            z-index: inherit;
         }
      }

      .cost {
         @include flex-row;
         @include flex-group-right;
         font-weight: bold;
         margin-right: 0.5rem;
         z-index: inherit;

         .value {
            @include border;
            @include flex-row;
            @include flex-group-center;
            height: 1.5rem;
            width: 1.5rem;
            background: var(--static-value-background);
            margin-left: 0.25rem;
            z-index: inherit;
         }
      }
   }
</style>

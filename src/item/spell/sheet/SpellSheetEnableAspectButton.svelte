<script>
   import { getContext } from "svelte";
   import { ripple } from "@typhonjs-fvtt/svelte-standard/action";
   import EfxButton from "~/helpers/svelte-components/EfxButton.svelte";

   // Value to toggle
   export let enabled = void 0;

   // Label to display
   export let label = void 0;

   // Setup
   const document = getContext("DocumentSheetObject");
</script>

<EfxButton
   efx={ripple}
   on:click={async () => {
      enabled = !enabled;
      const system = $document.system;
      await $document.update({
         system: system,
      });
   }}
>
   <div class="button-content">
      <div />
      <div>
         {label}
      </div>
      <div class="icon">
         <i class={enabled ? "fas fa-square-check" : "fas fa-square"} />
      </div>
   </div>

   <div class="spacer" />
</EfxButton>

<style lang="scss">
   @import "../../../Styles/Mixins.scss";

   .button-content {
      @include grid(3);
      width: 100%;
      margin: 0;

      .icon {
         @include flex-row;
         @include flex-group-right;
         margin-right: 0.5rem;
      }
   }
</style>

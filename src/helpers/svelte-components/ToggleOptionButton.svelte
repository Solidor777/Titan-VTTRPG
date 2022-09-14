<script>
   import EfxButton from "~/helpers/svelte-components/EfxButton.svelte";
   export let enabled = void 0;
   export let label = void 0;
</script>

<div class="toggle enabled-{enabled === true}">
   <EfxButton
      on:click={() => {
         enabled = !enabled;
      }}
   >
      <div class="label">
         {label}
      </div>
   </EfxButton>
</div>

<style lang="scss">
   @import "../../Styles/Mixins.scss";

   .toggle {
      --button-font-size: 0.9rem;
      --button-padding: 0 0.25rem;
      --button-border-radius: 10px;
      margin: 0.25rem;

      &.enabled-true {
         --button-background-color: var(--active-background-color);
      }

      .label {
         @include flex-row;
         @include flex-group-center;
      }
   }
</style>

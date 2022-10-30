<script>
   import EfxButton from "~/helpers/svelte-components/button/EfxButton.svelte";
   export let enabled = void 0;
   export let label = void 0;
   export let disabled = false;
</script>

<div class="toggle enabled-{enabled === true}">
   <EfxButton on:click {disabled}>
      <div class="label">
         {label}
      </div>
   </EfxButton>
</div>

<style lang="scss">
   @import "../../../Styles/Mixins.scss";

   .toggle {
      --button-font-size: var(--font-size-small);
      --button-padding: 0.25rem;
      --button-line-height: normal;
      --button-border-radius: 10px;

      &.enabled-true {
         --button-background: var(--active-background);
      }

      .label {
         @include flex-row;
         @include flex-group-center;
      }
   }
</style>

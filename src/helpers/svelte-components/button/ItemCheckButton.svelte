<script>
   import EfxButton from "~/helpers/svelte-components/button/EfxButton.svelte";

   // Check reference
   export let check = void 0;

   export let disabled = void 0;
</script>

<div class="item-check-button {check.attribute}">
   <EfxButton on:click {disabled}>
      <div class="button-inner">
         <i class="fa fa-dice" />
         <div>
            {check.label}
         </div>
      </div>
   </EfxButton>
</div>

<style lang="scss">
   @import "../../../Styles/Mixins.scss";

   .item-check-button {
      @include flex-row;

      &.body {
         --button-background: var(--body-color);
      }

      &.mind {
         --button-background: var(--mind-color);
      }

      &.soul {
         --button-background: var(--soul-color);
      }

      .button-inner {
         @include flex-row;
         @include flex-group-center;
         @include font-size-normal;
         height: 100%;
         line-height: normal;
         padding: 0.25rem;

         i {
            margin-right: 0.25rem;
         }
      }
   }
</style>

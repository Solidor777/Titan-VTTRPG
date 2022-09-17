<script>
   import { localize } from "~/helpers/Utility.js";
   import { ripple } from "@typhonjs-fvtt/svelte-standard/action";
   import EfxButton from "~/helpers/svelte-components/EfxButton.svelte";

   // Collapsed object
   export let item = void 0;
</script>

<div class="item-equip-button">
   <EfxButton
      efx={ripple}
      on:click={async () => {
         const updateData = {
            system: {
               multiAttack: !item.system.multiAttack,
            },
         };

         item.update(updateData);

         return;
      }}
   >
      <div class="button-inner">
         <i class={item.system.multiAttack ? "fas fa-swords" : "fas fa-sword"} />
         <div class="label">
            {localize("multi")}
         </div>
         <i class={item.system.multiAttack ? "fas fa-square-check" : "fas fa-square"} />
      </div>
   </EfxButton>
</div>

<style lang="scss">
   @import "../../../../../../Styles/Mixins.scss";

   .item-equip-button {
      .button-inner {
         @include flex-row;
         @include flex-group-center;
         height: 100%;

         :not(:first-child) {
            margin-left: 0.25rem;
         }
      }
   }
</style>

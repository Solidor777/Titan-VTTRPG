<script>
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
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
      <i class={item.system.multiAttack ? "fas fa-swords" : "fas fa-sword"} />
      {localize("LOCAL.multi.label")}:
      <div class="spacer" />
      <i class={item.system.multiAttack ? "fas fa-square-check" : "fas fa-square"} />
   </EfxButton>
</div>

<style lang="scss">
   @import "../../../Styles/Mixins.scss";

   .item-equip-button {
      .spacer {
         width: 0.25rem;
      }
   }
</style>

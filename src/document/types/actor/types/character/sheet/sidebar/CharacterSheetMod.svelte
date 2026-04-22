<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import { getContext } from 'svelte';
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';
   import DocumentIntegerInput from '~/document/svelte-components/input/DocumentIntegerInput.svelte';
   import { getIcon } from '~/system/Icons.js';
   import ModifiableStatValueLabel from '~/helpers/svelte-components/label/ModifiableStatValueLabel.svelte';

   /** @type {string} The Mod that this component represents. */
   export let mod = void 0;

   /** @type {string} The Icon that represents this stat. */
   const icon = getIcon(mod);

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');
</script>

<div class="container">
   <!--Label-->
   <div
      class="label"
      use:tooltipAction={`${mod}.desc`}
   >
      <!--Icon-->
      <i class={icon}/>

      <!--Label Text-->
      {localize(mod)}
   </div>

   <!--Stats-->
   <div class="stats">

      <!--Plus Sign-->
      <div class="label">+</div>

      <!--Static Mod-->
      <div class="input">
         <DocumentIntegerInput
            bind:value={$document.system.mod[mod].mod.static}
         />
      </div>

      <!--Equal Sign-->
      <div class="label">=</div>

      <!--Total Value-->
      <div class="value">
         <ModifiableStatValueLabel
            baseTooltip={localize(`${mod}.baseValue`)}
            baseValue={0}
            effectMod={$document.system.mod[mod].mod.effect}
            equipmentMod={$document.system.mod[mod].mod.equipment}
            staticMod={$document.system.mod[mod].mod.static}
            value={$document.system.mod[mod].value}
         />
      </div>
   </div>
</div>

<style lang="scss">
   .container {
      @include flex-row;
      @include flex-space-between;

      width: 100%;
      height: 100%;

      i {
         width: 20px;
      }

      .label {
         @include flex-row;
         @include flex-group-center;

         height: 100%;

         .fas {
            @include margin-right-standard;
         }
      }

      .stats {
         @include flex-row;
         @include flex-group-center;

         height: 100%;

         :not(:first-child) {
            @include margin-left-standard;
         }

         .input {
            @include flex-row;
            @include flex-group-center;

            width: 28px;
         }

         .value {
            @include flex-row;
            @include flex-group-center;

            height: 100%;
            min-width: 28px;
         }
      }
   }
</style>

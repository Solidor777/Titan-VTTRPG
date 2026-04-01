<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import { getContext } from 'svelte';
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';
   import DocumentIntegerInput from '~/document/svelte-components/input/DocumentIntegerInput.svelte';
   import { getIcon } from '~/system/Icons.js';
   import ModifiableStatValueLabel from '~/helpers/svelte-components/label/ModifiableStatValueLabel.svelte';

   /** @type {string} The Speed that this component represents. */
   export let speed;

   /** @type {string} The Icon that represents this stat. */
   const icon = getIcon(speed);

   /** @type {object} Reference to the Document store. */
   const document = getContext('document');
</script>

<div class="container">
   <!--Label-->
   <div class="label" use:tooltipAction={`${speed}.desc`}>
      <!--Icon-->
      {localize(speed)}
   </div>

   <!--Stats-->
   <div class="stats">
      <!--Base Value-->
      <div class="input">
         <DocumentIntegerInput
            bind:value={$document.system.speed[speed].baseValue}
         />
      </div>

      <!--Plus Sign-->
      <div class="symbol">+</div>

      <!--Static Mod-->
      <div class="input">
         <DocumentIntegerInput
            bind:value={$document.system.speed[speed].mod.static}
         />
      </div>

      <!--Equal Sign-->
      <div class="symbol">=</div>

      <!--Total Value-->
      <div class="value">
         <ModifiableStatValueLabel
            baseTooltip={localize(`${speed}.desc`)}
            baseValue={$document.system.speed[speed].baseValue}
            effectMod={$document.system.speed[speed].mod.effect}
            equipmentMod={$document.system.speed[speed].mod.equipment}
            staticMod={$document.system.speed[speed].mod.static}
            value={$document.system.speed[speed].value}
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

      .label {
         @include flex-row;
         @include flex-group-center;

         margin-left: var(--titan-spacing-standard);
         height: 100%;
      }

      .value {
         @include flex-row;
         @include flex-group-center;

         min-width: 28px;
      }

      .stats {
         @include flex-row;
         @include flex-group-center;

         height: 100%;

         .symbol {
            @include flex-row;
            @include flex-group-center;

            height: 100%;
         }

         :not(:first-child) {
            margin-left: var(--titan-spacing-standard);
         }

         .input {
            width: 28px;
         }
      }
   }
</style>

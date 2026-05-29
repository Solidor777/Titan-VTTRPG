<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import { getContext } from 'svelte';
   import DocumentIntegerInput from '~/document/svelte-components/input/DocumentIntegerInput.svelte';
   import ModifiableStatValueLabel from '~/helpers/svelte-components/label/ModifiableStatValueLabel.svelte';
   import { getIcon } from '~/system/Icons.js';
   import DocumentOwnerButton from '~/document/svelte-components/DocumentOwnerButton.svelte';
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';

   /** @type {string} The Rating that this component represents. */
   export let rating = void 0;

   /** @type {Function} Callback for when the rating button is clicked. */
   export let onClick = void 0;

   /** @type {string} The Icon that represents this stat. */
   const icon = getIcon(rating);

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');
</script>

<div class="container">

   {#if typeof onClick == "function"}
      <!--Display a button if onClick is a function.-->
      <div class="button">
         <DocumentOwnerButton onclick={onClick} tooltip={`${rating}.desc`}>
            <!--Icon-->
            <i class={icon}/>

            <!--Label-->
            <div class="label">
               {localize(rating)}
            </div>
         </DocumentOwnerButton>
      </div>

   {:else}
      <!--Otherwise, display a label.-->
      <div class="label" use:tooltipAction={`${rating}.desc`}>
         <!--Icon-->
         <i class={icon}/>

         {localize(rating)}
      </div>
   {/if}

   <!--Stats-->
   <div class="stats">

      <!--Plus Sign-->
      <div class="label symbol">+</div>

      <!--Static Mod-->
      <div class="input">
         <DocumentIntegerInput
            bind:value={$document.system.rating[rating].mod.static}
         />
      </div>

      <!--Equal Sign-->
      <div class="label">=</div>

      <!--Total Value-->
      <div class="value">
         <ModifiableStatValueLabel
            abilityMod={$document.system.rating[rating].mod.ability}
            baseTooltip={localize(`${rating}.baseValue`)}
            baseValue={$document.system.rating[rating].baseValue}
            effectMod={$document.system.rating[rating].mod.effect}
            equipmentMod={$document.system.rating[rating].mod.equipment}
            staticMod={$document.system.rating[rating].mod.static}
            value={$document.system.rating[rating].value}
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

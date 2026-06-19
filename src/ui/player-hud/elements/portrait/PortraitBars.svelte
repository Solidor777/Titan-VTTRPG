<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';
   import Meter from '~/helpers/svelte-components/Meter.svelte';
   import ModifiableStatValueLabel from '~/helpers/svelte-components/label/ModifiableStatValueLabel.svelte';
   import DocumentIntegerInput from '~/document/svelte-components/input/DocumentIntegerInput.svelte';
   import { getIcon } from '~/system/Icons.js';

   /** @type {object} The primary actor bridge. */
   const document = getContext('document');

   /** @type {Array<string>} The displayed resources, in order. */
   const resources = ['stamina', 'resolve', 'wounds'];
</script>

<div class="bars">
   {#each resources as resource (resource)}
      <div
         class={`bar ${resource}`}
         data-testid={`player-hud-bar-${resource}`}
      >
         <i
            class={`label ${getIcon(resource)}`}
            use:tooltipAction={`${resource}.desc`}
         ></i>
         <Meter
            max={document.data.system.resource[resource].max}
            value={document.data.system.resource[resource].value}
         />
         <span class="value">
            <DocumentIntegerInput
               bind:value={document.data.system.resource[resource].value}
               maxDigits={2}
               testId={`player-hud-bar-${resource}-input`}
            />
            <ModifiableStatValueLabel
               abilityMod={document.data.system.resource[resource].mod.ability}
               baseTooltip={localize(`${resource}.maxValue`)}
               baseValue={document.data.system.resource[resource].maxBase}
               effectMod={document.data.system.resource[resource].mod.effect}
               equipmentMod={document.data.system.resource[resource].mod.equipment}
               staticMod={document.data.system.resource[resource].mod.static}
               testId={`player-hud-bar-${resource}-max`}
               value={document.data.system.resource[resource].max}
            />
         </span>
      </div>
   {/each}
</div>

<style lang="scss">
   .bars {
      @include flex-column;
      @include flex-group-top;

      width: 100%;
      gap: var(--titan-spacing-standard);

      .bar {
         @include flex-row;
         @include flex-group-center;
         @include font-size-small;

         width: 100%;

         &.stamina {
            --titan-meter-color: var(--titan-stamina-background);
         }

         &.resolve {
            --titan-meter-color: var(--titan-resolve-background);
         }

         &.wounds {
            --titan-meter-color: var(--titan-wounds-background);
         }

         .label {
            width: 20px;
            text-align: center;
         }

         .value {
            @include flex-row;
            @include flex-group-center;

            // Size the max value (a bordered label) to match the 2-digit current-value input beside it.
            --titan-label-width: calc(var(--titan-input-digit-width) * 2 + 12px);

            flex-shrink: 0;
            gap: 2px;
         }
      }
   }
</style>

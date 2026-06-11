<script>
   import { getContext } from 'svelte';
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';
   import Meter from '~/helpers/svelte-components/Meter.svelte';
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
            <span class="max">{document.data.system.resource[resource].max}</span>
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

            flex-shrink: 0;
            gap: 2px;

            .max {
               @include panel-3;

               min-width: 2em;
               padding: 1px 4px;
               text-align: center;
               border-radius: var(--titan-border-radius);
               white-space: nowrap;
            }
         }
      }
   }
</style>

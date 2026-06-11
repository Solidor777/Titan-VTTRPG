<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import Meter from '~/helpers/svelte-components/Meter.svelte';
   import DocumentIntegerInput from '~/document/svelte-components/input/DocumentIntegerInput.svelte';

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
         <span class="label">{localize(resource)}</span>
         <Meter
            max={document.data.system.resource[resource].max}
            value={document.data.system.resource[resource].value}
         />
         <span class="value">
            <DocumentIntegerInput
               bind:value={document.data.system.resource[resource].value}
               testId={`player-hud-bar-${resource}-input`}
            />
            <span class="max">/ {document.data.system.resource[resource].max}</span>
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
            width: 60px;
            text-align: left;
         }

         .value {
            @include flex-row;
            @include flex-group-center;

            width: 64px;

            .max {
               @include margin-left-standard;

               white-space: nowrap;
            }
         }
      }
   }
</style>

<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';
   import DocumentIntegerInput from '~/document/svelte-components/input/DocumentIntegerInput.svelte';
   import Meter from '~/helpers/svelte-components/Meter.svelte';
   import ModifiableStatValueLabel from '~/helpers/svelte-components/label/ModifiableStatValueLabel.svelte';
   import { getIcon } from '~/system/Icons.js';

   /**
    * @typedef {object} CharacterSheetResourceProps
    * @property {string} [resource] The Resource that this component represents.
    * @property {string} [icon] The Icon that represents this stat.
    */

   /** @type {CharacterSheetResourceProps} */
   const { resource = undefined, icon = getIcon(resource) } = $props();

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');
</script>

<div class="container">
   <!--Label Row-->
   <div class="row">

      <!--Icon-->
      <i class={`${icon} side`}></i>

      <!--Label-->
      <div class="middle labels" use:tooltipAction={`${resource}.desc`}>

         <!--Label-->
         <div class="label">
            {localize(resource)}
         </div>

         <!--Plus Sign-->
         <div class="plus">+</div>
      </div>

      <!--Static Mod-->
      <div class="side">
         <DocumentIntegerInput
            bind:value={document.data.system.resource[resource].mod.static}
         />
      </div>
   </div>

   <!--Meter bar row-->
   <div class="row">

      <!--Current Value Input-->
      <div class="side">
         <DocumentIntegerInput
            bind:value={document.data.system.resource[resource].value}
            max={document.data.system.resource[resource].max}
            min={0}
            testId={`sheet-resource-${resource}-input`}
         />
      </div>

      <!--Meter-->
      <div
         class="middle {resource} "
         use:tooltipAction={`${resource}.desc`}
      >
         <Meter
            max={document.data.system.resource[resource].max}
            value={document.data.system.resource[resource].value}
         />
      </div>

      <!--Max Value-->
      <div class="side">
         <ModifiableStatValueLabel
            baseTooltip={localize(`${resource}.maxValue`)}
            baseValue={document.data.system.resource[resource].maxBase}
            mod={document.data.system.resource[resource].mod}
            testId={`sheet-resource-${resource}-max`}
            value={document.data.system.resource[resource].max}
         />
      </div>
   </div>
</div>

<style lang="scss">
   .container {
      @include flex-column;
      @include flex-group-top;

      width: 100%;
      height: 100%;

      // Both rows share the same three tracks, so the value, the bar and the mod/max column line up. The side tracks
      // hold a three-digit value (the digits, the input padding and the border: the NumberInput width formula); the
      // middle track may shrink to zero, so a long label is cut instead of pushing the right-hand input out.
      .row {
         align-items: center;
         display: grid;
         grid-template-columns:
            calc(var(--titan-input-digit-width) * 3 + 12px)
            minmax(0, 1fr)
            calc(var(--titan-input-digit-width) * 3 + 12px);
         width: 100%;
         height: 100%;

         &:not(:first-child) {
            @include margin-top-standard;
         }

         .side {
            @include flex-group-center;
            @include flex-row;
         }

         .middle {
            @include flex-row;
            @include flex-space-between;

            height: 100%;
            min-width: 0;

            // The label sits in the centre cell and the plus sign against the right edge of the track.
            &.labels {
               display: grid;
               grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);

               .label {
                  grid-column: 2;
                  overflow: hidden;
                  text-overflow: ellipsis;
                  white-space: nowrap;
               }

               .plus {
                  grid-column: 3;
                  justify-self: end;

                  @include padding-right-standard;
               }
            }

            &.resolve {
               --titan-meter-color: var(--titan-resolve-background);
            }

            &.stamina {
               --titan-meter-color: var(--titan-stamina-background);
            }

            &.wounds {
               --titan-meter-color: var(--titan-wounds-background);
            }
         }
      }
   }
</style>

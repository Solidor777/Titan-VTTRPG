<script>
   import { getContext } from 'svelte';
   import CheckboxInput from '~/helpers/svelte-components/input/CheckboxInput.svelte';
   import Text from '~/helpers/svelte-components/Text.svelte';
   import groupSituationalModifiers from '~/check/dialog/GroupSituationalModifiers.js';

   /**
    * @typedef {object} CheckDialogSituationsFieldProps
    * @property {SituationalCheckModifier[]} [modifiers] The situational modifiers that apply to the check.
    */

   /** @type {CheckDialogSituationsFieldProps} */
   const { modifiers = [] } = $props();

   /** @type {import('svelte/store').Writable} Reference to the Check Options store. */
   const checkOptions = getContext('checkOptions');

   /** @type {(field: string, value: *) => void} The dialog's tracked Check Options setter. */
   const setCheckOption = getContext('setCheckOption');

   /** @type {SituationGroup[]} One checkbox per situation key. */
   const groups = $derived(groupSituationalModifiers(modifiers));

   /**
    * Ticks or unticks a situation in the check options; the dialog recomputes the parameters from the new options.
    * @param {string} key - The camel-case situation key.
    * @param {boolean} ticked - Whether the situation applies.
    */
   function setTicked(key, ticked) {
      setCheckOption('situations', ticked ?
         [
            ...$checkOptions.situations,
            key,
         ] :
            $checkOptions.situations.filter((situation) => situation !== key));
   }
</script>

<div class="situations" data-testid="check-field-situations">
   <!--Label-->
   <div class="label">
      <Text text={'situationalModifiers'}/>
   </div>

   <!--One checkbox per situation, unticked until the user ticks it-->
   {#each groups as group (group.key)}
      <div class="situation" data-testid={`situation-row-${group.key}`}>
         <CheckboxInput
            bind:value={
               () => $checkOptions.situations.includes(group.key),
               (ticked) => setTicked(group.key, ticked)
            }
            testId={`situation-toggle-${group.key}`}
         />
         <div class="text">
            <div class="name">{group.label}</div>
            <div class="details">{`${group.modifiers.join(', ')} (${group.sources.join(', ')})`}</div>
         </div>
      </div>
   {/each}
</div>

<style lang="scss">
   .situations {
      @include flex-column;
      @include flex-group-top-left;

      width: 100%;

      .label {
         font-weight: bold;
      }

      .situation {
         @include flex-row;
         @include flex-group-left;
         @include margin-top-standard;

         width: 100%;

         // Shares CheckDialogField's own `.input` height token, so this checkbox aligns with the dialog's other
         // input fields rather than the smaller global default (Variables.scss).
         --titan-input-height: var(--titan-check-dialog-input-height);

         .text {
            @include flex-column;
            @include margin-left-large;
         }

         .details {
            @include font-size-small;
         }
      }
   }
</style>

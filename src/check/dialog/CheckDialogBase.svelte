<script>
   import { getContext } from 'svelte';
   import Text from '~/helpers/svelte-components/Text.svelte';
   import Button from '~/helpers/svelte-components/button/Button.svelte';
   import getApplication from '~/helpers/utility-functions/GetApplication.js';
   import CheckDialogSituationsField from '~/check/dialog/CheckDialogSituationsField.svelte';

   /**
    * @typedef {object} CheckDialogBaseProps
    * @property {Array<typeof import('svelte').SvelteComponent>} [rows] Components for changing the
    * options and displaying the parameters.
    * @property {Function} [onroll] Callback invoked when the Roll button is clicked.
    */

   /** @type {CheckDialogBaseProps} */
   const {
      rows = undefined,
      onroll = undefined,
   } = $props();

   /** @type {SvelteApp} The Svelte Component's Application. */
   const application = getApplication();

   /** @type {ReactiveDocument|undefined} The reactive bridge of the Actor that will roll the check. */
   const checkActor = getContext('checkActor');

   /** @type {string|undefined} The check type, which selects the situational modifiers offered. */
   const checkType = getContext('checkType');

   /** @type {import('svelte/store').Writable} Reference to the Check Options store. */
   const checkOptions = getContext('checkOptions');

   /**
    * @type {SituationalCheckModifier[]} The situational modifiers that apply to the check's current Skill. Read
    * through the Actor's bridge, so the list follows the Actor's item and effect changes while the dialog is open.
    */
   const situationalModifiers = $derived(
      checkActor?.data.system.getSituationalCheckModifiers(checkType, { skill: $checkOptions.skill }) ?? [],
   );

   // Prune ticked situations that are no longer offered (e.g. the effect behind one was removed while the dialog
   // was open), so a later situation that reuses the same key does not appear pre-ticked.
   $effect(() => {
      /** @type {Set<string>} The situation keys currently offered to this check. */
      const offeredKeys = new Set(situationalModifiers.map((modifier) => modifier.key));
      if ($checkOptions.situations.some((key) => !offeredKeys.has(key))) {
         $checkOptions.situations = $checkOptions.situations.filter((key) => offeredKeys.has(key));
      }
   });

   /**
    * Rolls the check and closes the application.
    */
   function onRoll() {
      onroll?.();
      application.close();
   }

   /**
    * Cancels the check and closes the application.
    */
   function onCancel() {
      application.close();
   }

</script>

<div class="check-dialog">
   <!--Fields-->
   {#each rows as Row}
      <div class="row">
         <Row/>
      </div>
   {/each}

   <!--Situational Modifiers-->
   {#if situationalModifiers.length > 0}
      <div class="row">
         <CheckDialogSituationsField modifiers={situationalModifiers}/>
      </div>
   {/if}

   <!--Buttons-->
   <div class="row">
      <div class="button">
         <Button onclick={onRoll} testId={'check-dialog-roll'}><Text text="roll"/></Button>
      </div>

      <div class="button">
         <Button secondary onclick={onCancel} testId={'check-dialog-cancel'}><Text text="cancel"/></Button>
      </div>
   </div>
</div>

<style lang="scss">
   .check-dialog {
      @include flex-column;
      @include font-size-normal;

      justify-items: flex-end;

      .row {
         @include flex-row;
         @include flex-group-center;

         height: 100%;
         width: 100%;

         &:not(:first-child) {
            border-top: solid;

            @include padding-top-standard;
            @include margin-top-standard;

            border-width: var(--titan-border-width);
         }

         .button {
            @include flex-row;

            width: 100%;

            @include margin-top-large;

            &:not(:first-child) {
               @include margin-left-standard;
            }
         }
      }
   }
</style>

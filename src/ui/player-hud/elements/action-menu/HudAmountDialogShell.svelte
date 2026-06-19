<script>
   import { getContext } from 'svelte';
   import IntegerInput from '~/helpers/svelte-components/input/IntegerInput.svelte';
   import localize from '~/helpers/utility-functions/Localize.js';

   /**
    * @typedef {object} HudAmountDialogShellProps
    * @property {string} confirmLabel - The confirm button label.
    * @property {Function} onConfirm - Receives the entered amount.
    */

   /** @type {HudAmountDialogShellProps} */
   const { confirmLabel, onConfirm } = $props();

   /** @type {TitanDialog} The owning dialog application. */
   const application = getContext('application');

   /** @type {number} The entered amount; `IntegerInput` keeps it a whole number >= 0. */
   let amount = $state(1);

   /**
    * Confirms the amount and closes the dialog.
    * @returns {void}
    */
   function confirm() {
      onConfirm(amount);
      application.close();
   }

   /**
    * Handles implicit form submission (Enter in the field). The input commits its value on the same
    * keydown before submission fires, so `amount` is already up to date.
    * @param {SubmitEvent} event - The native submit event.
    * @returns {void}
    */
   function handleSubmit(event) {
      event.preventDefault();
      confirm();
   }
</script>

<form class="amount-dialog" onsubmit={handleSubmit}>
   <label>
      {localize('amount')}
      <IntegerInput
         bind:value={amount}
         min={0}
         testId="hud-amount-input"
      />
   </label>
   <button
      type="button"
      data-testid="hud-amount-confirm"
      onclick={confirm}
   >
      {confirmLabel}
   </button>
</form>

<style lang="scss">
   .amount-dialog {
      @include flex-column;
      @include flex-group-top;
      @include padding-standard;

      gap: var(--titan-spacing-standard);

      label {
         @include flex-row;
         @include flex-group-center;

         // Cascades into the IntegerInput's inner field, which reads `--titan-input-width`.
         --titan-input-width: 80px;

         gap: var(--titan-spacing-standard);
      }

      button {
         @include panel-2;
         @include padding-standard;

         border: none;
         border-radius: var(--titan-border-radius);
         color: inherit;
         cursor: pointer;
      }
   }
</style>

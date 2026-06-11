<script>
   import { getContext } from 'svelte';
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

   /** @type {number} The entered amount. */
   let amount = $state(1);

   /**
    * Confirms the amount and closes the dialog.
    * @returns {void}
    */
   function confirm() {
      onConfirm(Math.max(0, Math.floor(amount)));
      application.close();
   }
</script>

<div class="amount-dialog">
   <label>
      {localize('amount')}
      <input
         type="number"
         min="0"
         bind:value={amount}
         data-testid="hud-amount-input"
         onkeydown={(event) => {
            if (event.key === 'Enter') {
               confirm();
            }
         }}
      />
   </label>
   <button
      type="button"
      data-testid="hud-amount-confirm"
      onclick={confirm}
   >
      {confirmLabel}
   </button>
</div>

<style lang="scss">
   .amount-dialog {
      @include flex-column;
      @include flex-group-top;
      @include padding-standard;

      gap: var(--titan-spacing-standard);

      label {
         @include flex-row;
         @include flex-group-center;

         gap: var(--titan-spacing-standard);
      }

      input {
         width: 80px;
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

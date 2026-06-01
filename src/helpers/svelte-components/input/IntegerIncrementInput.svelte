<script>
   import isModifierActive from '~/helpers/utility-functions/IsModifierActive.js';
   import localize from '~/helpers/utility-functions/Localize.js';
   import MiniIconButton from '~/helpers/svelte-components/button/MiniIconButton.svelte';
   import { DECREMENT_ICON, INCREMENT_ICON } from '~/system/icons.js';
   import IntegerInput from '~/helpers/svelte-components/input/IntegerInput.svelte';
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';

   /**
    * @typedef {object} IntegerIncrementInputProps
    * @property {number} [value=undefined] - The value that this input should modify.
    * @property {number|boolean} [min=false] - The minimum value of the input, or false for no minimum.
    * @property {number|boolean} [max=false] - The maximum value of the input, or false for no maximum.
    * @property {boolean} [disabled=false] - Whether the input should currently be disabled.
    * @property {string|object} [tooltip=undefined] - The Tooltip to display for this element, if any.
    * @property {number} [increment=1] - Amount to change the value per button press (no modifier).
    * @property {number} [modifierIncrement=10] - Amount to change the value per button press (modifier active).
    * @property {Function} [onchange] - Callback forwarded from the native change event.
    * @property {Function} [onkeyup] - Callback forwarded from the native keyup event.
    * @property {string} [testId] - Optional stable selector applied as `data-testid` on the root element.
    */

   /** @type {IntegerIncrementInputProps} */
   let {
      value             = $bindable(undefined),
      min               = false,
      max               = false,
      disabled          = false,
      tooltip           = void 0,
      increment         = 1,
      modifierIncrement = 10,
      onchange          = void 0,
      onkeyup           = void 0,
      testId            = void 0,
   } = $props();

   /**
    * Called when the decrement button is pressed to decrement the value.
    * @returns {void}
    */
   function decrementInput() {
      value -= isModifierActive() ? modifierIncrement : increment;
   }

   /**
    * Called when the increment button is pressed to increment the value.
    * @returns {void}
    */
   function incrementInput() {
      value += isModifierActive() ? modifierIncrement : increment;
   }
</script>

<div class="input" data-testid={testId} use:tooltipAction={tooltip}>
   <div class="decrement">
      <MiniIconButton
         {disabled}
         icon={DECREMENT_ICON}
         label={localize('decrement')}
         onclick={decrementInput}
      />
   </div>
   <IntegerInput
      bind:value
      {max}
      {min}
      {onchange}
      {onkeyup}
   />
   <div class="increment">
      <MiniIconButton
         {disabled}
         icon={INCREMENT_ICON}
         label={localize('increment')}
         onclick={incrementInput}
      />
   </div>
</div>

<style lang="scss">
   .input {
      @include flex-row;
      @include flex-group-center;

      .increment {
         margin-left: 2px;
      }

      .decrement {
         margin-right: 2px;
      }
   }
</style>

<script>
   import isModifierActive from '~/helpers/utility-functions/IsModifierActive.js';
   import MiniIconButton from '~/helpers/svelte-components/button/MiniIconButton.svelte';
   import {DECREMENT_ICON, INCREMENT_ICON} from '~/system/icons.js';
   import IntegerInput from '~/helpers/svelte-components/input/IntegerInput.svelte';

   /** @type number The value that this input should modify. */
   export let value = void 0;

   /** @type {number|boolean} The minimum value of the input. */
   export let min = false;

   /** @type {number|boolean} The maximum value of the input. */
   export let max = false;

   /** @type boolean Whether the input should currently be disabled. */
   export let disabled = false;

   /**
    * @type number
    * How much to increment or decrement the value when the increase or decrease buttons are pressed while the modifier
    * is NOT active.
    */
   export let increment = 1;

   /**
    * @type number
    * How much to increment or decrement the value when the increase or decrease buttons while the modifier IS active.
    */
   export let modifierIncrement = 10;

   /**
    * Called when the decrement button is pressed to decrement the value.
    */
   function decrementInput() {
      value -= isModifierActive() ? modifierIncrement : increment;
   }

   /**
    * Called when the increment button is pressed to increment the value.
    */
   function incrementInput() {
      value += isModifierActive() ? modifierIncrement : increment;
   }
</script>

<div class="input">
   <div class="decrement">
      <MiniIconButton
         {disabled}
         icon={DECREMENT_ICON}
         on:click={decrementInput}
      />
   </div>
   <IntegerInput
      bind:value
      {max}
      {min}
      on:change
   />
   <div class="increment">
      <MiniIconButton
         {disabled}
         icon={INCREMENT_ICON}
         on:click={incrementInput}
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

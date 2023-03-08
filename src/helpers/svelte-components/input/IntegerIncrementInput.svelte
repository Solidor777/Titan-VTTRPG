<script>
   import { createEventDispatcher } from 'svelte';
   import { isModifierActive } from '~/helpers/utility.js';
   import MinIconButton from '~/helpers/svelte-components/button/MinIconButton.svelte';

   // The value of the input
   export let value = void 0;
   export let min = false;
   export let max = false;
   export let disabled = false;
   export let increment = 1;
   export let modifierIncrement = 10;

   let editingActive = false;
   let input = value;

   const dispatch = createEventDispatcher();

   $: if (!editingActive) {
      input = value;
   }

   function validateInput() {
      let newValue = parseInt(input);
      if (isNaN(newValue)) {
         newValue = 0;
      }
      if (min !== false) {
         newValue = Math.max(newValue, min);
      }
      if (max !== false) {
         newValue = Math.min(newValue, max);
      }

      value = newValue;
      dispatch('change');
   }

   function checkInput(event) {
      // Only accept valid inputs
      if (!/[0-9\.,-]/.test(event.key)) {
         event.preventDefault();
      } else if (/[\.,]/.test(event.key)) {
         event.preventDefault();
      }
   }

   function onFocus() {
      editingActive = true;
   }

   function onBlur() {
      editingActive = false;
   }

   function decrementInput() {
      input -= isModifierActive() ? modifierIncrement : increment;
      validateInput();
   }

   function incrementInput() {
      input += isModifierActive() ? modifierIncrement : increment;
      validateInput();
   }

   function onChange() {
      if (isNaN(input)) {
         input = value;
      }
   }
</script>

<div class="input">
   <div class="decrement">
      <MinIconButton
         icon={'fas fa-minus'}
         on:click={decrementInput}
         {disabled}
      />
   </div>
   <input
      type="number"
      on:keyup={validateInput}
      on:keyup
      on:change={onChange}
      on:focus={onFocus}
      on:focus
      on:blur={onBlur}
      on:blur
      bind:value={input}
      on:keypress={(event) => checkInput(event)}
      {disabled}
   />
   <div class="increment">
      <MinIconButton
         icon={'fas fa-plus'}
         on:click={incrementInput}
         {disabled}
      />
   </div>
</div>

<style lang="scss">
   @import '../../../styles/Mixins.scss';

   .input {
      @include flex-row;
      @include flex-group-center;

      input {
         @include input;

         &:disabled {
            @include input-disabled;
         }
      }

      .increment {
         margin-left: 0.125rem;
      }
      .decrement {
         margin-right: 0.125rem;
      }
   }
</style>

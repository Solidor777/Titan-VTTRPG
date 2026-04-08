<script>
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';

   /**
    * Object used to store data for an Option within a Select Svelte component.
    * @template T
    * @typedef {object} SelectOption
    * @property {T} value - The value for this option.
    * @property {string|TextData} [label] - The display label for this option.
    * @property {string|TooltipAction} [tooltip] - Tooltip to display for this option.
    */

   /**
    * Options for the Select Svelte component.
    * @template T
    * @type SelectOption<T>[]  */
   export let options = void 0;

   /** @type * The value that this input should modify. */
   export let value = void 0;

   /** @type {boolean} Whether the input should currently be disabled. */
   export let disabled = false;

   /** @type {string|TooltipAction} The Tooltip to display for this element, if any. */
   export let tooltip = void 0;
</script>

<select
   bind:value
   {disabled}
   on:change
   use:tooltipAction={tooltip}
>
   {#each options as option}
      <option
         value={option.value}
         use:tooltipAction={option.tooltip}
      >
         <Text
      </option>
   {/each}
</select>

<style lang="scss">
   select {
      @include input;

      option {
         @include flex-group-left;

         background: var(--titan-input-background);
      }
   }
</style>

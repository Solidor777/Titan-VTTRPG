<script>
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';
   import Text from '~/helpers/svelte-components/Text.svelte';

   /**
    * Object used to store data for an Option within a Select Svelte component.
    * @template T
    * @typedef {object} SelectOption
    * @property {T} value - The value for this option.
    * @property {string | number | TextData} [label] - The label to display for this option.
    * @property {string | TooltipAction} [tooltip] - The Tooltip to display for this option, if any.
    */

   /**
    * @typedef {object} SelectProps
    * @property {(SelectOption<*> | string | number)[]} [options] - Options for the select element.
    * @property {*} [value] - The value that this input should modify.
    * @property {boolean} [disabled] - Whether the input should currently be disabled.
    * @property {string | TooltipAction} [tooltip] - The Tooltip to display for this element, if any.
    * @property {() => void} [onchange] - Callback fired when the selected value changes.
    */

   /** @type {SelectProps} */
   let { options = void 0, value = $bindable(void 0), disabled = false, tooltip = void 0, onchange } = $props();

   // Clamp value into the available options. Guarded so it converges (no loop): only writes when out
   // of range, which makes the next run's guard false.
   $effect(() => {
      if (!(options?.length > 0)) { return; }
      const first = options[0];
      if (typeof first === 'object') {
         if (!options.find((o) => o.value === value)) { value = first.value; onchange?.(); }
      }
      else if (!options.includes(value)) { value = first; onchange?.(); }
   });
</script>

<select bind:value {disabled} onchange={() => onchange?.()} use:tooltipAction={tooltip}>
   {#each options as option}
      <option value={option.value ?? option} use:tooltipAction={option.tooltip}>
         <Text text={option.label ?? option.value ?? option}/>
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

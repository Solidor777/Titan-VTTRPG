<script>
   import Select from '~/helpers/svelte-components/input/select/Select.svelte';

   /**
    * @typedef {object} SelectOnPlainObjectProps
    * @property {{ field?: string }} data - A plain, non-reactive object (as a Foundry document's data is) that the
    * Select binds its value to.
    * @property {Array<string>} options - The options the Select offers.
    * @property {() => void} [onchange] - Callback forwarded to the Select.
    */

   /** @type {SelectOnPlainObjectProps} */
   const { data, options, onchange } = $props();
</script>

<Select
   bind:value={data.field}
   {onchange}
   {options}
/>

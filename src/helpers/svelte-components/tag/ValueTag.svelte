<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import StatTag from '~/helpers/svelte-components/tag/StatTag.svelte';

   /**
    * @typedef {object} ValueTagProps
    * @property {string | number} [value] - The value to display.
    * @property {string} [testId] - Optional test identifier forwarded to the root element of the inner StatTag.
    */

   /** @type {ValueTagProps} */
   let { value = void 0, testId = void 0 } = $props();
</script>
<StatTag label={localize('value')} {value} {testId}/>

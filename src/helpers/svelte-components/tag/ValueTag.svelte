<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import StatTag from '~/helpers/svelte-components/tag/StatTag.svelte';

   /** @type {string} The Value represented by this tag. */
   export let value = void 0;
</script>
<StatTag label={localize('value')} {value}/>
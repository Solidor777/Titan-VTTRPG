<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import StatTag from '~/helpers/svelte-components/tag/StatTag.svelte';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   // Chat-message system snapshot reference.
   const system = document.data.system;
</script>

<StatTag label={localize('tradition')} value={system.tradition}/>

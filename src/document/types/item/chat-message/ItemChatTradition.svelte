<script>
   import {getContext} from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import StatTag from '~/helpers/svelte-components/tag/StatTag.svelte';

   /** @type object Reference to the Document store. */
   const document = getContext('document');
   const titanFlags = $document.flags.titan;
</script>

<StatTag label={localize('tradition')} value={titanFlags.system.tradition}/>

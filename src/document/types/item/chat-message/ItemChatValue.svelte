<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import StatTag from '~/helpers/svelte-components/tag/StatTag.svelte';

   // Chat context reference
   const document = getContext('document');
   const chatContext = $document.flags.titan;
</script>

<StatTag label={localize('value')} value={chatContext.system.value} />

<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import StatTag from '~/helpers/svelte-components/tag/StatTag.svelte';

   /** @type {{ value?: string }} The Value represented by this tag. */
   let { value = void 0 } = $props();
</script>
<StatTag label={localize('value')} {value}/>

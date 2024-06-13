<svelte:options accessors={true}/>

<script>
   import {setContext} from 'svelte';

   /** @type writable Store for the Check Options. */
   export let checkOptions = void 0;

   /** @type writable Store for the Check Parameters. */
   export let checkParameters = void 0;

   /** @type svelte Svelte svelte-components to attach to this dialog. */
   export let shell = void 0;

   /** @type TitanActor The actor that will roll the check. */
   export let actor = void 0;

   // Setup context objects
   setContext('checkOptions', checkOptions);
   setContext('checkParameters', checkParameters);
</script>
<svelte:component {actor} this={shell}/>

<svelte:options accessors={true}/>

<script>
   import { setContext } from 'svelte';

   /**
    * @typedef {object} CheckDialogShellProps
    * @property {import('svelte/store').Writable} [checkOptions] Store for the Check Options.
    * @property {import('svelte/store').Writable} [checkParameters] Store for the Check Parameters.
    * @property {typeof import('svelte').SvelteComponent} [shell] Svelte component to attach to this dialog.
    * @property {TitanActor} [actor] The actor that will roll the check.
    */

   /** @type {CheckDialogShellProps} */
   const {
      checkOptions = undefined,
      checkParameters = undefined,
      shell = undefined,
      actor = undefined,
   } = $props();

   // Setup context objects.
   setContext('checkOptions', checkOptions);
   setContext('checkParameters', checkParameters);
</script>

{#if shell}
   {@const Shell = shell}
   <Shell {actor}/>
{/if}

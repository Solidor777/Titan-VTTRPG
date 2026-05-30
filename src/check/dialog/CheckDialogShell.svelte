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
   // These captures are intentional: both stores are stable for the dialog's lifetime.
   // svelte-ignore state_referenced_locally
   setContext('checkOptions', checkOptions);
   // svelte-ignore state_referenced_locally
   setContext('checkParameters', checkParameters);
</script>

{#if shell}
   {@const Shell = shell}
   <Shell {actor}/>
{/if}

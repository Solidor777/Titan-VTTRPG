<script>
   import { setContext } from 'svelte';
   import ReactiveDocument from '~/document/reactive/ReactiveDocument.svelte.js';

   /**
    * @typedef {object} CheckDialogShellProps
    * @property {import('svelte/store').Writable} [checkOptions] Store for the Check Options.
    * @property {import('svelte/store').Writable} [checkParameters] Store for the Check Parameters.
    * @property {typeof import('svelte').SvelteComponent} [shell] Svelte component to attach to this dialog.
    * @property {TitanActor} [actor] The actor that will roll the check.
    * @property {string} [checkType] The check type (attribute, resistance, attack, casting, or item), which selects the
    * situational modifiers the dialog offers.
    */

   /** @type {CheckDialogShellProps} */
   const {
      checkOptions = undefined,
      checkParameters = undefined,
      shell = undefined,
      actor = undefined,
      checkType = undefined,
   } = $props();

   // Setup context objects.
   // These captures are intentional: the stores, actor, and check type are stable for the dialog's lifetime.
   // svelte-ignore state_referenced_locally
   setContext('checkOptions', checkOptions);
   // svelte-ignore state_referenced_locally
   setContext('checkParameters', checkParameters);

   // The Actor's reactive bridge: a reader of `.data` re-runs when the Actor, or one of its items or effects, changes,
   // so the situational list and the parameters follow the Actor while the dialog is open. Its hooks tear down when
   // the dialog unmounts.
   // svelte-ignore state_referenced_locally
   setContext('checkActor', actor ? new ReactiveDocument(actor) : undefined);
   // svelte-ignore state_referenced_locally
   setContext('checkType', checkType);

   // The actor-derived option fields (Dice/Training/Expertise/Damage/Healing Mod, Advantage, Automatic Failure) the
   // user has edited in this dialog; the shell's re-derivation effect skips a touched field so the user's choice
   // survives a later Actor change. Plain (non-reactive) Set: mutated imperatively by field components on user edit
   // and read imperatively by the shell's effect, never rendered from directly.
   setContext('touchedCheckOptionFields', new Set());
</script>

{#if shell}
   {@const Shell = shell}
   <Shell {actor}/>
{/if}

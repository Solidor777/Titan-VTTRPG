<script>
   import { setContext } from 'svelte';
   import { writable } from 'svelte/store';
   import ReactiveDocument from '~/document/reactive/ReactiveDocument.svelte.js';
   import rebuildCheckOptions, {
      createCheckOptionSetter,
      freezeCheckOptions,
   } from '~/check/dialog/ReinitializeCheckOptions.js';

   /**
    * @typedef {object} CheckDialogShellProps
    * @property {import('svelte/store').Writable} [checkOptions] Store for the Check Options.
    * @property {import('svelte/store').Writable} [checkParameters] Store for the Check Parameters.
    * @property {typeof import('svelte').SvelteComponent} [shell] Svelte component to attach to this dialog.
    * @property {TitanActor} [actor] The actor that will roll the check.
    * @property {string} [checkType] The check type (attribute, resistance, attack, casting, or item), which selects the
    * situational modifiers the dialog offers and the Actor methods that rebuild its options.
    * @property {object} [callerOptions] The options the caller passed to `request<Type>Check`, plus any open-time
    * provenance (an Attack's target Defense); every rebuild keeps them unless the user edits the field.
    */

   /** @type {CheckDialogShellProps} */
   const {
      checkOptions = undefined,
      checkParameters = undefined,
      shell = undefined,
      actor = undefined,
      checkType = undefined,
      callerOptions = undefined,
   } = $props();

   // Setup context objects.
   // These captures are intentional: the two stores, the actor, and the check type are stable for the dialog's
   // lifetime.
   // The dialog's components receive a read-only view of the Check Options: the writable store stays private to this
   // shell and the tracked setter, and every value it holds is frozen, so a bind, assignment, in-place mutation, or
   // store-method write from a component throws. The dialog's initial options are frozen before any component reads
   // them.
   // svelte-ignore state_referenced_locally
   checkOptions.update(freezeCheckOptions);
   // svelte-ignore state_referenced_locally
   setContext('checkOptions', { subscribe: checkOptions.subscribe });
   // svelte-ignore state_referenced_locally
   setContext('checkParameters', checkParameters);

   // The Actor's reactive bridge: a reader of `.data` re-runs when the Actor, or one of its items or effects, changes,
   // so the situational list and the parameters follow the Actor while the dialog is open. Its hooks tear down when
   // the dialog unmounts.
   // svelte-ignore state_referenced_locally
   const checkActor = actor ? new ReactiveDocument(actor) : undefined;
   setContext('checkActor', checkActor);
   // svelte-ignore state_referenced_locally
   setContext('checkType', checkType);

   /** @type {import('svelte/store').Writable<object>} The fields the user wrote in this dialog (field → value). */
   const userEdits = writable({});

   // The one tracked setter every dialog field writes through, so each write is kept by every later rebuild.
   // svelte-ignore state_referenced_locally
   setContext('setCheckOption', createCheckOptionSetter(checkOptions, userEdits));

   // Rebuild the Check Options whenever the Actor (or one of its items or effects) changes, the user writes a field,
   // or the options change: the caller's options and the user's edits are kept and the live Actor derives every
   // other field. The rebuild returns nothing when the result equals the current options, so this effect settles
   // after its own write.
   $effect(() => {
      /** @type {TitanActor|undefined} The live Actor, read through its bridge so this effect tracks it. */
      const liveActor = checkActor?.data;
      if (!liveActor) {
         return;
      }

      /** @type {object|undefined} The rebuilt options, or undefined when unchanged or no longer valid. */
      const rebuilt = rebuildCheckOptions({
         callerOptions,
         checkType,
         currentOptions: $checkOptions,
         system: liveActor.system,
         userEdits: $userEdits,
      });
      if (rebuilt) {
         $checkOptions = rebuilt;
      }
   });
</script>

{#if shell}
   {@const Shell = shell}
   <Shell {actor}/>
{/if}

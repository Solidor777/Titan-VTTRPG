<script>
   import { setContext } from 'svelte';
   import ReactiveDocument from '~/document/reactive/ReactiveDocument.svelte.js';
   import {
      INITIALIZE_CHECK_OPTIONS_METHODS,
      rederiveActorCheckOptionFields,
      seedTouchedFieldsFromCallerOptions,
   } from '~/check/dialog/ReinitializeCheckOptions.js';

   /**
    * @typedef {object} CheckDialogShellProps
    * @property {import('svelte/store').Writable} [checkOptions] Store for the Check Options.
    * @property {import('svelte/store').Writable} [checkParameters] Store for the Check Parameters.
    * @property {typeof import('svelte').SvelteComponent} [shell] Svelte component to attach to this dialog.
    * @property {TitanActor} [actor] The actor that will roll the check.
    * @property {string} [checkType] The check type (attribute, resistance, attack, casting, or item), which selects the
    * situational modifiers the dialog offers.
    * @property {object} [callerOptions] The raw options the caller passed to `request<Type>Check`; a field present
    * there (not `undefined`) was set by the caller, not derived from the Actor, and survives dialog mount.
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
   // These captures are intentional: the stores, actor, and check type are stable for the dialog's lifetime.
   // svelte-ignore state_referenced_locally
   setContext('checkOptions', checkOptions);
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

   // The actor-derived option fields (Dice/Training/Expertise/Damage/Healing Mod, Advantage, Automatic Failure,
   // Attack's Melee/Accuracy/target Defense) the user has edited in this dialog; the re-derivation effect below
   // skips a touched field so the user's (or the caller's) choice survives a later Actor change. Plain
   // (non-reactive) Set: mutated imperatively by field components and this component, read imperatively by the
   // effect below, never rendered from directly.
   // svelte-ignore state_referenced_locally
   const touchedFields = new Set();
   setContext('touchedCheckOptionFields', touchedFields);

   // Seed the touched set from the caller's raw request options: a field the caller explicitly set is not
   // actor-derived and must not be overwritten by the first re-derivation pass below.
   // svelte-ignore state_referenced_locally
   seedTouchedFieldsFromCallerOptions(touchedFields, callerOptions);

   // Re-derive the check's actor-derived option fields (see ReinitializeCheckOptions.js) from the live Actor
   // whenever it (or one of its items or effects) changes, or the user changes another option that a derivation
   // reads (Attribute, Skill, Attack Type, Multi-Attack, etc.); a field the user has touched in the dialog is
   // preserved. Depends on `$checkOptions` as well as the Actor bridge; the `changed` guard inside
   // `rederiveActorCheckOptionFields` is what stops this effect from looping on its own write: a run that produces
   // no actual field change makes no assignment, so the store issues no further notification.
   // The single mechanism for all five check types: `INITIALIZE_CHECK_OPTIONS_METHODS` resolves the live Actor's
   // type-specific initializer, so no per-type copy of this effect is needed.
   $effect(() => {
      /** @type {TitanActor|undefined} The live Actor, read through its bridge so this effect tracks it. */
      const liveActor = checkActor?.data;
      /** @type {string|undefined} The live Actor's `initialize<Type>CheckOptions` method name for this check type. */
      const methodName = INITIALIZE_CHECK_OPTIONS_METHODS[checkType];
      if (!liveActor || !methodName) {
         return;
      }

      /** @type {object|undefined} The re-derived options, or undefined if nothing actually changed. */
      const nextOptions = rederiveActorCheckOptionFields(
         $checkOptions,
         touchedFields,
         checkType,
         (options) => liveActor.system[methodName](options),
      );
      if (nextOptions) {
         $checkOptions = nextOptions;
      }
   });
</script>

{#if shell}
   {@const Shell = shell}
   <Shell {actor}/>
{/if}

<script>
   import { setContext } from 'svelte';
   import EffectHud from '~/ui/effect-hud/EffectHud.svelte';

   /**
    * @typedef {object} EffectHudShellProps
    * @property {object} documentStore - Reactive bridge around the active actor.
    * @property {EffectHudState} hudState - Shared HUD UI state.
    */

   /** @type {EffectHudShellProps} */
   const { documentStore, hudState } = $props();

   // Provide the actor bridge as the 'document' context so reused effect leaf components
   // (checks, description, owner-gated delete) resolve the active actor exactly as they
   // do inside the character sheet. The capture is intentional: documentStore is stable for
   // this mount's lifetime (the controller remounts the shell when the tracked actor changes).
   // svelte-ignore state_referenced_locally
   setContext('document', documentStore);

   // 'sheetDocument' mirrors DocumentSheetShell: the HUD's top-level actor bridge, never shadowed by
   // embedded-document providers, so actor-coupled leaves (checks, delete) keep an escape hatch.
   // svelte-ignore state_referenced_locally
   setContext('sheetDocument', documentStore);
</script>

<EffectHud {hudState}/>

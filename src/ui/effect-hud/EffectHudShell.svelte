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

   // Provide the actor bridge as the 'document' context: it anchors the HUD's own actor reads and is
   // the parent each EmbeddedDocumentProvider chains from, so converted effect leaves read the effect
   // via the shadowed 'document' and reach the actor via 'sheetDocument'. The capture is intentional:
   // documentStore is stable for this mount's lifetime (the controller remounts the shell when the
   // tracked actor changes).
   // svelte-ignore state_referenced_locally
   setContext('document', documentStore);

   // 'sheetDocument' mirrors DocumentSheetShell: the HUD's top-level actor bridge, never shadowed by
   // embedded-document providers, so actor-coupled leaves (checks, delete) keep an escape hatch.
   // svelte-ignore state_referenced_locally
   setContext('sheetDocument', documentStore);
</script>

<EffectHud {hudState}/>

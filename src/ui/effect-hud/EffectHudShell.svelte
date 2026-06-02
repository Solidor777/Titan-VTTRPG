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
   // do inside the character sheet.
   setContext('document', documentStore);
</script>

<EffectHud {hudState}/>

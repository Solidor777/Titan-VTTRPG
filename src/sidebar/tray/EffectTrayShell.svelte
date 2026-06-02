<script>
   import { setContext } from 'svelte';
   import EffectTray from '~/sidebar/tray/EffectTray.svelte';

   /**
    * @typedef {object} EffectTrayShellProps
    * @property {object} trayState - The reactive Effect Tray state instance.
    */

   /** @type {EffectTrayShellProps} */
   const { trayState } = $props();

   // Expose the tray state to all descendant components via context. This capture is intentional:
   // the trayState instance is stable for the component's lifetime.
   // svelte-ignore state_referenced_locally
   setContext('trayState', trayState);
</script>

<EffectTray />

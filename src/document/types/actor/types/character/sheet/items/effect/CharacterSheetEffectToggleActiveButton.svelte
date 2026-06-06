<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import { getContext } from 'svelte';
   import ToggleButton from '~/helpers/svelte-components/button/ToggleButton.svelte';

   /** @type {object} The embedded effect bridge provided by EmbeddedDocumentProvider. */
   const document = getContext('document');

   /** @type {object} The owning sheet's actor bridge (never shadowed by providers). */
   const sheetDocument = getContext('sheetDocument');

   /** @type {boolean} The effect's active state, read reactively through the embedded bridge. */
   const isActive = $derived(document.data?.system.isActive ?? false);
</script>

<ToggleButton
   active={isActive}
   disabled={!document.data?.isOwner}
   label={localize('active')}
   onclick={() => sheetDocument.data.system.toggleEffectActive(document.data?.id)}
/>

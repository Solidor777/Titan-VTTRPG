<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import { getContext } from 'svelte';
   import ToggleButton from '~/helpers/svelte-components/button/ToggleButton.svelte';
   import { isBaseEffect } from '~/system/EffectTypes.js';

   /** @type {object} The embedded effect bridge provided by EmbeddedDocumentProvider. */
   const document = getContext('document');

   /** @type {object} The owning sheet's actor bridge (never shadowed by providers). */
   const sheetDocument = getContext('sheetDocument');

   /**
    * The effect's active state, read reactively through the embedded bridge: the data model's for a TITAN effect, the
    * native `disabled` flag's for a `base` effect, whose model carries no `isActive`.
    * @type {boolean}
    */
   const isActive = $derived(
      isBaseEffect(document.data ?? {}) ? !document.data.disabled : (document.data?.system.isActive ?? false),
   );
</script>

<ToggleButton
   active={isActive}
   disabled={!document.data?.isOwner}
   label={localize('active')}
   onclick={() => sheetDocument.data.system.toggleEffectActive(document.data?.id)}
/>

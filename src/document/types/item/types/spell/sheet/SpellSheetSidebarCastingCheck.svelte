<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import { CASTING_ICON } from '~/system/Icons.js';
   import SidebarCheck from '~/document/svelte-components/check/SidebarCheck.svelte';
   import SpellSheetSidebarAspects from '~/document/types/item/types/spell/sheet/SpellSheetSidebarAspects.svelte';
   import CondensedCastingCheckButton from '~/document/svelte-components/check/CondensedCastingCheckButton.svelte';

   /** @type {object} Reference to the Application State store. */
   const appState = getContext('applicationState');

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {object|undefined} The actor that can roll this spell's casting check, or undefined when the current user cannot. */
   const rollActor = getContext('rollActor');

   /**
    * Determines whether any aspect in the supplied list is currently enabled.
    * @param {Array<{enabled: boolean}>} aspects - The spell aspects to inspect.
    * @returns {boolean} True if at least one aspect is enabled, otherwise false.
    */
   function areAspectsEnabled(aspects) {
      for (let idx = 0; idx < aspects.length; idx++) {
         if (aspects[idx].enabled) {
            return true;
         }
      }
      return false;
   }

   /** @type {object} The spell's casting-check configuration, read reactively through the bridge. */
   const castingCheck = $derived(document.data.system.castingCheck);

   /** @type {boolean} True when the spell has any enabled aspect or at least one custom aspect. */
   const aspectsEnabled = $derived(
      areAspectsEnabled(document.data.system.aspect) ||
      document.data.system.customAspect.length > 0,
   );
</script>

{#snippet rollButtonSnippet()}
   <CondensedCastingCheckButton/>
{/snippet}

<!--Casting Check-->
<SidebarCheck
   attribute={castingCheck.attribute}
   complexity={castingCheck.complexity}
   difficulty={castingCheck.difficulty}
   hasDetails={aspectsEnabled}
   icon={CASTING_ICON}
   label={localize('castingCheck')}
   rollButton={rollActor ? rollButtonSnippet : undefined}
   skill={castingCheck.skill}
   bind:expanded={$appState.sidebar.castingCheck.isExpanded}
>
   <!--Aspects-->
   <SpellSheetSidebarAspects/>
</SidebarCheck>

<script>
   import { getContext } from 'svelte';
   import { DICE_ICON } from '~/system/Icons.js';
   import SidebarCheck from '~/document/svelte-components/check/SidebarCheck.svelte';
   import CheckTags from '~/document/svelte-components/check/CheckTags.svelte';
   import CondensedItemCheckButton from '~/document/svelte-components/check/CondensedItemCheckButton.svelte';

   /**
    * @typedef {object} ItemSheetSidebarCheckProps
    * @property {number} [idx] Index of the Check in the item's system data.
    */

   /** @type {ItemSheetSidebarCheckProps} */
   const { idx = undefined } = $props();

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {object} Reference to the Application State store. */
   const appState = getContext('applicationState');

   /** @type {object|undefined} The actor that can roll this item's checks, or undefined when the current user cannot. */
   const rollActor = getContext('rollActor');

   /** @type {object|undefined} The current check config, re-read reactively through the document bridge. */
   const check = $derived(document.data?.system.check[idx]);

   /** @type {boolean} Whether the check carries details beyond the header's attribute/skill/DC. */
   const hasDetails = $derived(
      !!check
      && (check.resolveCost > 0 || check.resistanceCheck !== 'none' || check.opposedCheck.enabled),
   );
</script>

{#if check}
   {#snippet rollButtonSnippet()}
      <CondensedItemCheckButton {idx}/>
   {/snippet}

   <SidebarCheck
      attribute={check.attribute}
      complexity={check.complexity}
      difficulty={check.difficulty}
      icon={DICE_ICON}
      label={check.label}
      skill={check.skill}
      rollButton={rollActor ? rollButtonSnippet : undefined}
      {hasDetails}
      bind:expanded={
         () => $appState.sidebar.checks.isExpanded[idx] ?? true,
         (value) => $appState.sidebar.checks.isExpanded[idx] = value
      }
   >
      <!--Check details beyond the header basics-->
      <CheckTags
         {idx}
         hideBasics={true}
      />
   </SidebarCheck>
{/if}

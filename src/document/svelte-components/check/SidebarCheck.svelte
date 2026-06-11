<script>
   import { slide } from 'svelte/transition';
   import localize from '~/helpers/utility-functions/Localize.js';
   import ExpandButton from '~/helpers/svelte-components/button/ExpandButton.svelte';

   /**
    * @typedef {object} SidebarCheckProps
    * @property {string} [attribute] - The check's attribute key, used for header color coding.
    * @property {string} [icon] - The icon class shown beside the check name.
    * @property {string} [label] - The display name of the check (already localized or user text).
    * @property {string} [skill] - The check's skill key, shown beside the attribute when set.
    * @property {number} [difficulty] - The check's difficulty; omitted when the check has no fixed DC.
    * @property {number} [complexity] - The check's complexity, shown with the difficulty.
    * @property {boolean} [hasDetails] - Whether the check carries extra details behind the toggle.
    * @property {boolean} [expanded] - Whether the details panel is currently expanded.
    * @property {import('svelte').Snippet} [rollButton] - Optional roll button rendered in place of the info line.
    * @property {import('svelte').Snippet} [children] - The details panel content.
    */

   /** @type {SidebarCheckProps} */
   let {
      attribute = undefined,
      icon = undefined,
      label = undefined,
      skill = undefined,
      difficulty = undefined,
      complexity = undefined,
      hasDetails = false,
      expanded = $bindable(true),
      rollButton = undefined,
      children,
   } = $props();
</script>

<div class="sidebar-check">
   <!--Header (color-coded to the check's attribute)-->
   <div class="header {attribute}">
      <!--Name row-->
      <div class="name">
         <i class={icon}></i>
         <div class="text">{label}</div>
      </div>

      {#if rollButton}
         <!--Roll button replaces the static info line for a user who can roll this check.-->
         <div class="roll">
            {@render rollButton()}
         </div>
      {:else}
         <!--Attribute, Skill, and DC row-->
         <div class="info">
            {localize(attribute)}{skill && skill !== 'none' ? ` (${localize(skill)})` : ''}
            {#if difficulty !== undefined}
               &nbsp;•&nbsp;{localize('dc')} {difficulty}:{complexity}
            {/if}
         </div>
      {/if}
   </div>

   {#if hasDetails}
      <!--Details Toggle-->
      <div class="toggle">
         <ExpandButton bind:expanded/>
      </div>

      <!--Details Panel-->
      {#if expanded}
         <div class="details" transition:slide|local>
            {@render children?.()}
         </div>
      {/if}
   {/if}
</div>

<style lang="scss">
   .sidebar-check {
      @include flex-column;
      @include flex-group-top;

      width: 100%;

      .header {
         @include flex-column;
         @include flex-group-center;
         @include attribute-colors;
         @include padding-standard;

         border-radius: var(--titan-border-radius);
         width: 100%;

         .name {
            @include flex-row;
            @include flex-group-center;

            font-weight: bold;

            i {
               @include margin-right-standard;
            }
         }

         .info {
            @include flex-row;
            @include flex-group-center;
            @include font-size-small;
         }

         .roll {
            @include flex-row;
            @include flex-group-center;

            width: 100%;
         }
      }

      // The toggle strip hangs off the banner: slightly narrower, square top, rounded bottom.
      .toggle {
         @include flex-row;
         @include flex-group-center;

         --titan-button-border-radius: 0 0 var(--titan-border-radius) var(--titan-border-radius);

         width: calc(100% - 2 * var(--titan-spacing-standard));
      }

      // The details panel hangs off the toggle the same way. Top padding stays zero because the
      // contained tag rows carry their own top margins; matching bottom padding keeps the inset even.
      .details {
         @include flex-column;
         @include flex-group-top;
         @include panel-3;

         border-radius: 0 0 var(--titan-border-radius) var(--titan-border-radius);
         padding: 0 var(--titan-spacing-standard) var(--titan-spacing-large);
         width: calc(100% - 4 * var(--titan-spacing-standard));
      }
   }
</style>

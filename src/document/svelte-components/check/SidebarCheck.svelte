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

      <!--Attribute, Skill, and DC row-->
      <div class="info">
         {localize(attribute)}{skill && skill !== 'none' ? ` (${localize(skill)})` : ''}
         {#if difficulty !== undefined}
            &nbsp;•&nbsp;{localize('dc')} {difficulty}:{complexity}
         {/if}
      </div>
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
      }

      .toggle {
         @include flex-row;
         @include flex-group-center;
         @include margin-top-standard;
      }

      .details {
         @include flex-column;
         @include flex-group-top;
         @include panel-3;
         @include padding-standard;
         @include margin-top-standard;

         border-radius: var(--titan-border-radius);
         width: 100%;
      }
   }
</style>

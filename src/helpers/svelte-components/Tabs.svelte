<script>
   import MiniButton from '~/helpers/svelte-components/button/MiniButton.svelte';

   /**
    * Object for storing tab information.
    * @typedef {object} Tab
    * @property {string} id - The ID to use for the type.
    * @property {string} [label] - Display label for the tab button.
    * @property {object} component - The Svelte component to use for the tab.
    */

   /**
    * @typedef {object} TabsProps
    * @property {Tab[]} [tabs] - Array of Tab objects.
    * @property {string} [activeTab] - The ID of the active Tab object.
    * @property {boolean} [border] - Whether the tabs should be bordered.
    * @property {string} [testId] - Optional test identifier bound to the root element.
    */

   /** @type {TabsProps} */
   let {
      tabs = [],
      activeTab = $bindable(undefined),
      border = false,
      testId = void 0,
   } = $props();
</script>

<!--List of tabs-->
<div
   class={`tabs${border ? ' bordered' : ''}`}
   data-testid={testId}
>
   <!--Tab List-->
   <div class="tab-list">
      <!--For each tab-->
      {#each tabs as tab}
         <div class={`button${activeTab === tab.id ? ' active' : ''}`}>
            <MiniButton onclick={() => activeTab = tab.id}>
               {tab.label}
            </MiniButton>
         </div>
      {/each}
   </div>

   <!--Tab Content-->
   <div class="tab-content">
      {#each tabs as tab}
         {#if tab.id === activeTab}
            {@const TabComponent = tab.component}
            <TabComponent/>
         {/if}
      {/each}
   </div>
</div>

<style lang="scss">
   .tabs {
      @include flex-column;

      &.bordered {
         @include border;

         // Clip the square tab strip and content to the rounded frame so nothing pokes past it.
         overflow: hidden;
      }

      width: 100%;
      height: 100%;

      .tab-list {
         @include flex-row;
         @include border-bottom;
         @include panel-1;

         list-style: none;
         margin: 0;
         height: 100%;
         width: 100%;
         flex: 0;
         padding: 0;

         .button {
            @include flex-row;

            // The strip reads as one continuous bar; the frame's clipping rounds the outer corners.
            // The mini-button mixin derives its radius from the tag radius token, so zero that.
            --titan-tag-border-radius: 0;

            width: 100%;
            height: 100%;

            &.active {
               --titan-button-background: var(--titan-highlighted-background);
               --titan-button-font-color: var(--titan-highlighted-font-color);
            }

            &:not(:first-child) {
               @include border-left;
            }
         }
      }

      .tab-content {
         @include flex-column;
         @include flex-group-top;

         width: 100%;
         height: 100%;
         flex: 2;
      }
   }
</style>

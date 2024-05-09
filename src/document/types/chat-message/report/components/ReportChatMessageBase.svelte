<script>

   /** @type SvelteComponent Header component. */
   export let header = void 0;

   /** @type {object[]|string[]} Array of sections to include in the report. */
   export let sections = void 0;

   /** @type object[] Array of tags components to append to the report. */
   export let tags = void 0;
</script>

<div class="report">
   <!--Header-->
   <svelte:component this="{header}"/>

   <!--Sections-->
   <div class="sections">

      <!--Messages-->
      {#if sections && sections.length > 0}
         {#each sections as section}
            <div class="{`section${section.isTags ? ' tags' : ''}${section.isRichText ? ' rich-text' : ''}`}">
               {#if typeof section === 'string'}
                  <!--String Message-->
                  {section}
               {:else}
                  <!--Component Message-->
                  <svelte:component this="{section.component ?? section}" {...section.props}/>
               {/if}
            </div>
         {/each}
      {/if}

      <!--Tags-->
      {#if tags && tags.length > 0}
         <div class="section tags">
            {#each tags as tag}
               <!--For tags that can disappear-->
               <div class="tag">
                  {#if tag.component}
                     <svelte:component this="{tag.component}" {...tag.props}/>
                  {:else}
                     <svelte:component this="{tag}"/>
                  {/if}
               </div>
            {/each}
         </div>
      {/if}
   </div>
</div>

<style lang="scss">
   .report {
      @include flex-column;
      @include flex-group-top;
      @include font-size-normal;

      width: 100%;
      font-weight: bold;

      .sections {
         @include flex-column;
         @include flex-group-center;

         width: 100%;

         .section {
            @include flex-row;
            @include flex-group-center;

            flex-wrap: wrap;

            &:not(.tags) {
               &:not(.rich-text) {
                  padding-top: var(--padding-large);
               }
            }

            &:not(:first-child) {
               @include border-top;
               margin-top: var(--padding-large);
            }

            .tag {
               @include tag-margin;
            }
         }
      }
   }
</style>

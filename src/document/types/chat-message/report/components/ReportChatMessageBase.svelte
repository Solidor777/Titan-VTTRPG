<script>
   /**
    * @typedef {object} ReportChatMessageBaseProps
    * @property {object} [header] The header Svelte component to render.
    * @property {Array<object|string>} [sections] Array of sections to include in the report.
    * @property {object[]} [tags] Array of tag Svelte components to append to the report.
    */

   /** @type {ReportChatMessageBaseProps} */
   const { header = void 0, sections = void 0, tags = void 0 } = $props();
</script>

<div class="report">
   <!--Header-->
   {#if header}
      {@const HeaderComp = header}
      <HeaderComp/>
   {/if}

   <!--Sections-->
   <div class="sections">

      <!--Messages-->
      {#if sections && sections.length > 0}
         {#each sections as section}
            <div class={`section${section.isTags ? ' tags' : ''}${section.isRichText ? ' rich-text' : ''}`}>
               {#if typeof section === 'string'}
                  <!--String Message-->
                  {section}
               {:else}
                  <!--Component Message-->
                  {@const SectionComp = section.component ?? section}
                  <SectionComp {...(section.props ?? {})}/>
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
                     {@const TagComp = tag.component}
                     <TagComp {...(tag.props ?? {})}/>
                  {:else}
                     {@const TagComp = tag}
                     <TagComp/>
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
                  @include padding-top-large;
               }
            }

            &:not(:first-child) {
               @include border-top;
               @include margin-top-large;
            }

            .tag {
               @include tag-container-child-margin;
            }
         }
      }
   }
</style>

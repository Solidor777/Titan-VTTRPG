<script>
   /**
    * @typedef {object} BorderedColumnListProps
    * @property {object} [entryComponent] - The Svelte component to use for each object in the list.
    * @property {Array<*>} [entries] - The properties for each entry in the list.
    * @property {string} [testId] - Optional test identifier bound to the root element.
    */

   /** @type {BorderedColumnListProps} */
   let {
      entryComponent = undefined,
      entries = undefined,
      testId = void 0,
   } = $props();
</script>

<!--Entries-->
<div
   class="entries"
   data-testid={testId}
>

   <!--Each Entry-->
   {#each entries as entry}
      {@const EntryComponent = entryComponent}

      <!--Entry Component using the Entry as props-->
      <div class="entry">
         <EntryComponent {...entry}/>
      </div>
   {/each}
</div>

<style lang="scss">
   .entries {
      @include flex-column;
      @include flex-group-top;

      width: 100%;
      height: 100%;

      .entry {
         @include flex-row;
         @include flex-group-center;

         width: 100%;

         &:not(:first-child) {
            @include border-top;

            // border-width: var(--titan-border-width);.
            @include margin-top-standard;
            @include padding-top-standard;
         }
      }
   }
</style>

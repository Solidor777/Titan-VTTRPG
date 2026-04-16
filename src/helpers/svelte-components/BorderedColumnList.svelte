<script>

   /** @type {object} The Svelte Component to use for each object in the list. */
   export let entryComponent = void 0;

   /** @type {*[]} The properties for each entry in the list. */
   export let entries = void 0;
</script>

<!--Entries-->
<div class="entries">

   <!--Each Entry-->
   {#each entries as entry}

      <!--Entry Component using the Entry as props-->
      <div class="entry">
         <svelte:component this={entryComponent} {...entry}/>
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
            margin-top: var(--titan-spacing-standard);
            padding-top: var(--titan-spacing-standard);
         }
      }
   }
</style>

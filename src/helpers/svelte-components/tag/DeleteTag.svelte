<script>
   export let label = void 0;
   export let deleteFunction = void 0;
</script>

<div class="tag">
   <div>
      {label}
   </div>
   <!-- svelte-ignore a11y-missing-attribute -->
   <!-- svelte-ignore a11y-missing-content -->
   <a
      class="fas fa-trash"
      on:keypress={() => {
         deleteFunction();
      }}
      on:click={() => {
         deleteFunction();
      }}
   />
</div>

<style lang="scss">
   @import "../../../styles/mixins.scss";

   .tag {
      @include flex-row;
      @include flex-group-center;
      @include border;
      @include label;
      font-weight: bold;
      padding: 0.25rem;

      a {
         @include border-left;
         margin-left: 0.25rem;
         padding-left: 0.25rem;
      }
   }
</style>

<script>
   // Main label
   export let label = void 0;

   // Type label
   export let typeLabel = void 0;
</script>

<div class="label">
   <!--Main Label -->
   <div class="main-label">
      {label}
   </div>

   <!--Sub Label -->
   {#if typeLabel}
      <div class="sub-label">
         {typeLabel}
      </div>
   {/if}
</div>

<style lang="scss">
   @import "../../../styles/mixins.scss";
   .label {
      @include border-normal;
      @include flex-column;
      padding: 0.5rem;
      align-items: flex-start;
      background-color: var(--color-background-label);

      .main-label {
         font-size: 1.2rem;
         font-weight: bold;
      }

      .sub-label {
         margin-top: 0.25rem;
         font-size: 0.9rem;
      }
   }
</style>

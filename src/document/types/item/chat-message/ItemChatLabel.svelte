<script>
   // Chat context reference
   export let item = void 0;
</script>

<div class="label">
   <img alt="item" src={item.img}/>
   <div class="name">{item.name}</div>
</div>

<style lang="scss">
   .label {
      @include flex-row;
      @include flex-group-left;
      @include border;
      @include panel-1;

      padding: var(--titan-padding-standard);

      img {
         border: none;
         width: 32px;
         height: 32px;
      }

      .name {
         @include flex-row;
         @include flex-group-center;
         @include font-size-large;

         margin: 0 var(--titan-padding-standard);
         height: 100%;
         font-weight: bold;
      }
   }
</style>

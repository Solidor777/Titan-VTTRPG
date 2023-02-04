<script>
   export let item = void 0;
</script>

<img class="item-image" src={item.img} alt="item" />

<style lang="scss">
   @import '../../../../../Styles/Mixins.scss';

   .item-image {
      width: 2rem;
      border: none;
   }
</style>

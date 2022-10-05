<script>
   import { getContext } from "svelte";
   const document = getContext("DocumentStore");

   // Chat context reference
   const chatContext = $document.flags.titan.chatContext;
</script>

<div class="label">
   <img src={chatContext.img} alt="item" />
   <div class="name">{chatContext.name}</div>
</div>

<style lang="scss">
   @import "../../styles/mixins.scss";
   .label {
      @include flex-row;
      @include flex-group-left;
      @include border;
      @include panel-1;
      padding: 0.5rem;

      img {
         border: none;
         width: 2.5rem;
      }

      .name {
         @include flex-row;
         @include flex-group-center;
         @include font-size-large;
         margin-left: 0.5rem;
         height: 100%;
         font-weight: bold;
      }
   }
</style>

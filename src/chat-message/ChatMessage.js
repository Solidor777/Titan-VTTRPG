export class TitanChatMessage extends ChatMessage {
   _onDelete(options) {
      super._onDelete(options);
      if (this.shell) {
         this.shell.$destroy();
      }
   }
}
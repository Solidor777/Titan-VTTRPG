export default class TitanTokenDocument extends TokenDocument {
   get isTargeted() {
      return this.object.isTargeted;
   }

   _onUpdateBaseActor(update = {}, options = {}) {
      // Update synthetic Actor data
      if (!this.isLinked) {
         update = foundry.utils.mergeObject(update, this.actorData, {
            insertKeys: false,
            insertValues: false,
            inplace: false
         });
         this.actor.updateSource(update, options);
      }

      // Update tracked Combat resource
      const c = this.combatant;
      if (c && foundry.utils.hasProperty(update.system || {}, game.combat.settings.resource)) {
         c.updateResource();
         ui.combat.render();
      }

      // Trigger redraws on the token
      if (this.parent.isView) {
         this.object.drawBars();
         if ("effects" in update) {
            this.object.drawEffects();
         }
      }
   }
}
import TitanTypeComponent from '~/helpers/TypeComponent';

export default class TitanEffect extends TitanTypeComponent {
   onCreate() {
      if (this.parent.parent) {
         this._initializeEffect();
      }
   }

   async _initializeEffect() {
      const parent = this.parent;
      const actor = this.parent.parent;
      const effect = await ActiveEffect.create(
         {
            label: parent.name,
            icon: parent.img,
            origin: parent.uuid,
            disabled: false,
            flags: {
               core: {
                  statusId: parent.uuid,
               },
            },
         },
         {
            parent: actor
         }
      );

      this.parent.system.effectId = effect._id;
      this.parent.update({
         system: parent.system
      });
   }
}

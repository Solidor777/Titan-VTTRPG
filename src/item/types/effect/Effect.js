import TitanTypeComponent from '~/helpers/TypeComponent';

export default class TitanEffect extends TitanTypeComponent {
   prepareDerivedData() {
      if (this.parent.system.effectId === "") {
         this.parent.system.effectId = "Creating Effect";
         this.initializeEffect();
      }
   }

   async initializeEffect() {
      const effectData = {
         label: this.parent.name,
         icon: this.parent.img,
         origin: this.parent.uuid,
         disabled: false
      };
      console.log(this.parent.system.effectId);
      // const effect = await this.parent.createEmbeddedDocuments('ActiveEffect', [effectData]);
      // this.parent.system.effectId = effect._id;
   }
}

export async function addRulesElement() {
   if (this.reactive.document.isOwner) {
      return await this.reactive.document.typeComponent.addRulesElement();
   }

   return;
}

export async function removeRulesElement(idx) {
   if (this.reactive.document.isOwner) {
      return await this.reactive.document.typeComponent.removeRulesElement(idx);
   }

   return;
}
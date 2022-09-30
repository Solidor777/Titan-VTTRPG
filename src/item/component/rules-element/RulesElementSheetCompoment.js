export async function addRulesElement() {
   return await this.reactive.document.typeComponent.addRulesElement();
}

export async function removeRulesElement(idx) {
   return await this.reactive.document.typeComponent.removeRulesElement(idx);
}
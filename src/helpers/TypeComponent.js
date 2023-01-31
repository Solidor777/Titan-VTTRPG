export default class TitanTypeComponent {
  constructor(parent) {
    this.parent = parent;
  }

  prepareDerivedData() {
    return;
  }

  getRollData(rollData) {
    return rollData;
  }

  getChatContext(chatContext) {
    return chatContext;
  }

  onAddRulesElement(idx) {
    return;
  }

  onRemoveRulesElement(idx) {
    return;
  }

  onCreate() {
    return;
  }

  onDelete() {
    return;
  }

  isFirstOwner() {
    // Check if the current user is the first owner
    // This is to ensure this the initialize functions only fire once
    const owners = game.users.filter((user) => user.active && this.parent.canUserModify(user, 'owner'));
    return owners.length > 0 && game.user === owners[0];
  }
}
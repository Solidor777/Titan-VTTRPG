import SvelteDocumentSheet from '~/documents/DocumentSheet';
import createActorSheetState from './ActorSheetState';

export default class TitanActorSheet extends SvelteDocumentSheet {
   /**
    * Default Application options
    *
    * @returns {object} options - Application options.
    * @see https://foundryvtt.com/api/Application.html#options
    */
   static get defaultOptions() {
      return foundry.utils.mergeObject(super.defaultOptions, {
         width: 750,
         height: 800,
      });
   }

   constructor(object) {
      super(object);
      this.reactive.state = createActorSheetState();
   }

   _getHeaderButtons() {
      const buttons = super._getHeaderButtons();

      if (game.user.isGM || (this.reactive.document.isOwner && game.user.can('TOKEN_CONFIGURE'))) {
         buttons.splice(1, 0, {
            label: this.token ? 'Token' : 'TOKEN.TitlePrototype',
            class: 'configure-token',
            icon: 'fas fa-user-circle',
            onclick: (ev) => this._onConfigureToken(ev),
         });
      }

      return buttons;
   }
}
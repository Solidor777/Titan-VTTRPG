import SvelteDocumentSheet from '~/documents/DocumentSheet';
import { localize } from '../../helpers/Utility';

export default class TitanActorSheet extends SvelteDocumentSheet {
   /**
    * Default Application options
    *
    * @returns {object} options - Application options.
    * @see https://foundryvtt.com/api/Application.html#options
    */

   actor = this.reactive.document;

   static get defaultOptions() {
      return foundry.utils.mergeObject(super.defaultOptions, {
         width: 750,
         height: 800,
      });
   }

   _onConfigureToken(event) {
      if (event) {
         event.preventDefault();
      }
      const actor = this.reactive.document;
      const token = actor.token ?? actor.prototypeToken;
      return new CONFIG.Token.prototypeSheetClass(token, {
         left: Math.max(this.position.left - 570, 10),
         top: this.position.top,
      }).render(true);
   }

   _getHeaderButtons() {
      const buttons = super._getHeaderButtons();
      const actor = this.reactive.document;

      const isGM = game.user.isGM;
      if (isGM || (actor.isOwner && game.user.can('TOKEN_CONFIGURE'))) {
         // Token configure button
         buttons.unshift({
            label: actor.token ? localize('token') : localize('prototypeToken'),
            class: 'configure-token',
            icon: 'fas fa-user-circle',
            onclick: (ev) => this._onConfigureToken(ev),
         });

         if (isGM) {
            // If no token
            if (!actor.token) {
               buttons.unshift({
                  label: "",
                  class: "token-link",
                  icon: actor.prototypeToken.actorLink ? "fas fa-link" : "fas fa-unlink",
                  onclick: (html) => tokenLinkToggle(html, actor)
               });
            }

            // If token
            else {
               // If actor linked
               if (actor.token.actorLink === true) {
                  buttons.unshift({
                     label: "",
                     class: "token-link-highlight",
                     icon: "fas fa-link",
                     onclick: (html) => tokenUnlinkToken(html, actor)
                  });
               }

               // If actor not linked
               else if (actor.token.actorLink === false) {
                  buttons.unshift({
                     label: "",
                     class: "token-link-warning",
                     icon: "fas fa-unlink",
                     onclick: () => { }
                  });
               }
            }
         }

         if (this.actor.pack) {
            buttons.unshift({
               class: 'import',
               icon: 'fas fa-download',
               label: localize('import'),
               onclick: (event) => this._onImport(event)
            });
         }
      }

      return buttons;
   }

   _onImport(event) {
      if (event) {
         event.preventDefault();
      }
      return this.actor.collection
         .importFromCompendium(this.actor.compendium, this.actor.id);
   }
}

function tokenLinkToggle(html, actor) {
   const shouldBeLinked = actor.prototypeToken.actorLink;
   const button = $(html.currentTarget);
   if (shouldBeLinked) {
      button.html(button.html().replace('fa-link', 'fa-unlink'));
   }
   else {
      button.html(button.html().replace('fa-unlink', 'fa-link'));
   }
   actor.update({ 'token.actorLink': !(shouldBeLinked) });
}

async function tokenUnlinkToken(html, actor) {
   const button = $(html.target);
   actor.token.update({ actorLink: false });
   button.html(button.html().replace('Linked', 'Unlinked'));
   const newToken = actor.token;
   await actor.close();
   newToken.actor.sheet.render(true);
}
import registerInitiativeFormula from "./Initiative";

export default function registerSystemSettings() {
  game.settings.register('titan', 'getCheckOptions', {
    config: true,
    scope: 'client',
    name: 'SETTINGS.getCheckOptions.label',
    hint: 'SETTINGS.getCheckOptions.hint',
    type: Boolean,
    default: false,
  });

  game.settings.register('titan', 'autoIncreaseResolve', {
    config: true,
    scope: 'client',
    name: 'SETTINGS.autoIncreaseResolve.label',
    hint: 'SETTINGS.autoIncreaseResolve.hint',
    type: Boolean,
    default: true,
  });

  game.settings.register('titan', 'initiativeFormula', {
    config: true,
    scope: 'world',
    name: 'SETTINGS.initiativeFormula.label',
    hint: 'SETTINGS.initiativeFormula.hint',
    type: String,
    restricted: true,
    choices: {
      flat: 'SETTINGS.initiativeFormula.flat',
      roll1d6: 'SETTINGS.initiativeFormula.roll1d6',
      roll2d6: 'SETTINGS.initiativeFormula.roll2d6',
    },
    default: 'roll2d6',
    onChange: () => {
      registerInitiativeFormula();
    }
  });
}
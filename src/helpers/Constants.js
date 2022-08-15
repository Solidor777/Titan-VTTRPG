export const TITANCONSTANTS = Object.freeze({
  attribute: {
    min: 1,
    max: 8,
    totalExpCostByRank: [2, 7, 14, 23, 34, 47, 62],
  },

  skill: {
    training: {
      max: 3,
      totalExpCostByRank: [1, 3, 7],
    },
    expertise: {
      max: 3,
      totalExpCostByRank: [1, 3, 7],
    },
  },

  resource: {
    resolve: {
      maxBaseMulti: 0.5,
    },
    stamina: {
      maxBaseMulti: 1.0,
    },
    wounds: {
      maxBaseMulti: 0.5,
    },
  },

  trait: {
    attack: {
      blast: 0,
      cleave: false,
      close: false,
      crushing: false,
      defensive: false,
      ineffective: false,
      loud: false,
      magical: false,
      multiAttack: false,
      penetrating: false,
      piercing: false,
      range: false,
      reload: false,
      rend: false,
      restraining: false,
      slashing: false,
      spread: 0,
      subtle: false,
      thrown: false,
      twoHanded: false,
    }
  },

  validChatMessageTypes: new Set(['attributeCheck', 'skillCheck', 'resistanceCheck', 'attackCheck', 'weapon', 'damageReport']),
});

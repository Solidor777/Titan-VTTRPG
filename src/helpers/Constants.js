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
      maxBaseMulti: 1.0,
    },
    stamina: {
      maxBaseMulti: 0.5,
    },
    wounds: {
      maxBaseMulti: 0.5,
    },
  },

  attack: {
    trait: {
      blast: {
        type: "number"
      },
      cleave: {
        type: "bool"
      },
      close: {
        type: "bool"
      },
      crushing: {
        type: "bool"
      },
      dualAttack: {
        type: "bool"
      },
      defensive: {
        type: "bool"
      },
      ineffective: {
        type: "bool"
      },
      loud: {
        type: "bool"
      },
      magical: {
        type: "bool"
      },
      penetrating: {
        type: "bool"
      },
      piercing: {
        type: "bool"
      },
      range: {
        type: "bool"
      },
      reload: {
        type: "bool"
      },
      rend: {
        type: "bool"
      },
      restraining: {
        type: "bool"
      },
      slashing: {
        type: "bool"
      },
      spread: {
        type: "number"
      },
      subtle: {
        type: "bool"
      },
      thrown: {
        type: "bool"
      },
      twoHanded: {
        type: "bool"
      },
    },
  },
});

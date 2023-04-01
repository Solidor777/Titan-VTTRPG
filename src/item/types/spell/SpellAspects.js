export default Object.freeze({
   range: {
      template: {
         label: 'range',
         initialValue: 'self',
         cost: 0,
         enabled: true
      },
      settings: {
         sortOrder: 0,
         initialValueOptions: [
            {
               value: 'self',
               label: 'self',
            },
            {
               value: 'touch',
               label: 'touch',
            },
            {
               value: 10,
               label: 10,
            },
            {
               value: 30,
               label: 30,
            },
            {
               value: 50,
               label: 50,
            },
         ],
         initialValueCosts: {
            self: 0,
            touch: 1,
            10: 2,
            30: 3,
            50: 4
         }
      }
   },
   radius: {
      template: {
         label: 'radius',
         initialValue: 5,
         cost: 3,
         enabled: true
      },
      settings: {
         sortOrder: 1,
         initialValueOptions: [
            {
               value: 5,
               label: 5,
            },
            {
               value: 10,
               label: 10,
            },
         ],
         initialValueCosts: {
            5: 2,
            10: 5,
         }
      }
   },
   duration: {
      template: {
         label: 'duration',
         scaling: true,
         initialValue: 1,
         unit: 'rounds',
         cost: 1,
         enabled: true
      },
      settings: {
         sortOrder: 2,
         unitOptions: [
            {
               value: 'rounds',
               label: 'rounds',
            },
            {
               value: 'minutes',
               label: 'minutes',
            },
         ],
         unitCosts: {
            rounds: 1,
            minutes: 4,
         }
      }
   },
   damage: {
      template: {
         label: 'damage',
         scaling: true,
         initialValue: 1,
         cost: 1,
         resistanceCheck: 'none',
         isDamage: true,
         option: [],
         enabled: true
      },
      settings: {
         sortOrder: 3,
         optionCost: 1,
         option: ['ignoreArmor']
      }
   },
   healing: {
      template: {
         label: 'healing',
         scaling: true,
         initialValue: 1,
         cost: 1,
         isHealing: true,
         enabled: true
      },
      settings: {
         sortOrder: 4,
      }
   },
   decreaseMod: {
      template: {
         label: 'decreaseMod',
         initialValue: 1,
         cost: 0,
         option: [],
         resistanceCheck: 'none',
         scaling: true,
         enabled: false,
      },
      settings: {
         sortOrder: 5,
         requireOption: true,
         option: [
            'armor',
            'damage',
            'healing',
         ],
         optionCost: 2,
      }
   },
   increaseMod: {
      template: {
         label: 'increaseMod',
         initialValue: 1,
         option: [],
         cost: 0,
         scaling: true,
         enabled: false
      },
      settings: {
         sortOrder: 6,
         requireOption: true,
         option: [
            'armor',
            'damage',
            'healing',
         ],
         optionCost: 2,
      }
   },
   decreaseRating: {
      template: {
         label: 'decreaseRating',
         initialValue: 1,
         cost: 0,
         option: [],
         resistanceCheck: 'none',
         scaling: true,
         enabled: false
      },
      settings: {
         sortOrder: 7,
         requireOption: true,
         option: [
            'awareness',
            'accuracy',
            'defense',
            'initiative',
            'melee',
         ],
         optionCost: 1,
      }
   },
   increaseRating: {
      template: {
         label: 'increaseRating',
         initialValue: 1,
         cost: 0,
         option: [],
         scaling: true,
         enabled: false,
      },
      settings: {
         sortOrder: 8,
         requireOption: true,
         option: [
            'awareness',
            'accuracy',
            'defense',
            'initiative',
            'melee',
         ],
         optionCost: 1,
      }
   },
   decreaseResistance: {
      template: {
         label: 'decreaseResistance',
         initialValue: 1,
         cost: 0,
         option: [],
         resistanceCheck: 'none',
         scaling: true,
         enabled: false
      },
      settings: {
         sortOrder: 9,
         requireOption: true,
         option: [
            'reflexes',
            'resilience',
            'willpower',
         ],
         optionCost: 1,
      }
   },
   increaseResistance: {
      template: {
         label: 'increaseResistance',
         initialValue: 1,
         cost: 0,
         option: [],
         scaling: true,
         enabled: false
      },
      settings: {
         sortOrder: 10,
         requireOption: true,
         option: [
            'reflexes',
            'resilience',
            'willpower',
         ],
         optionCost: 1,
      }
   },
   decreaseAttribute: {
      template: {
         label: 'decreaseAttribute',
         initialValue: 1,
         cost: 0,
         option: [],
         resistanceCheck: 'none',
         scaling: true,
         enabled: false
      },
      settings: {
         sortOrder: 11,
         requireOption: true,
         option: [
            'body',
            'mind',
            'soul',
         ],
         optionCost: 4,
      }
   },
   increaseAttribute: {
      template: {
         label: 'increaseAttribute',
         initialValue: 1,
         cost: 0,
         option: [],
         scaling: true,
         enabled: false
      },
      settings: {
         sortOrder: 12,
         requireOption: true,
         option: [
            'body',
            'mind',
            'soul',
         ],
         optionCost: 4,
      }
   },
   decreaseSkill: {
      template: {
         label: 'decreaseSkill',
         initialValue: 1,
         cost: 0,
         option: [],
         resistanceCheck: 'none',
         scaling: true,
         enabled: false
      },
      settings: {
         sortOrder: 13,
         requireOption: true,
         option: [
            'arcana',
            'athletics',
            'deception',
            'dexterity',
            'diplomacy',
            'engineering',
            'intimidation',
            'investigation',
            'lore',
            'medicine',
            'meleeWeapons',
            'metaphysics',
            'nature',
            'perception',
            'performance',
            'rangedWeapons',
            'subterfuge',
            'stealth'
         ],
         optionCost: 1,
      }
   },
   increaseSkill: {
      template: {
         label: 'increaseSkill',
         initialValue: 1,
         cost: 0,
         option: [],
         scaling: true,
         enabled: false
      },
      settings: {
         sortOrder: 14,
         requireOption: true,
         option: [
            'arcana',
            'athletics',
            'deception',
            'dexterity',
            'diplomacy',
            'engineering',
            'intimidation',
            'investigation',
            'lore',
            'medicine',
            'meleeWeapons',
            'metaphysics',
            'nature',
            'perception',
            'performance',
            'rangedWeapons',
            'subterfuge',
            'stealth'
         ],
         optionCost: 1,
      }
   },
   decreaseSpeed: {
      template: {
         label: 'decreaseSpeed',
         initialValue: 5,
         cost: 0,
         option: [],
         resistanceCheck: 'none',
         scaling: true,
         enabled: false
      },
      settings: {
         sortOrder: 15,
         requireOption: true,
         option: [
            'stride',
            'fly',
            'swim',
            'burrow'
         ],
         optionCost: 1,
      }
   },
   increaseSpeed: {
      template: {
         label: 'increaseSpeed',
         initialValue: 5,
         cost: 0,
         option: [],
         scaling: true,
         enabled: false
      },
      settings: {
         sortOrder: 16,
         requireOption: true,
         option: [
            'stride',
            'fly',
            'swim',
            'burrow'
         ],
         optionCost: 2,
      }
   },
   inflictCondition: {
      template: {
         label: 'inflictCondition',
         cost: 0,
         option: [],
         resistanceCheck: 'none',
         enabled: false
      },
      settings: {
         sortOrder: 17,
         requireOption: true,
         option: [
            'blinded',
            'contaminated',
            'deafened',
            'frightened',
            'incapacitated',
            'prone',
            'restrained',
            'stunned',
            'unconscious'
         ],
         optionCosts: {
            blinded: 4,
            contaminated: 4,
            deafened: 1,
            frightened: 3,
            incapacitated: 6,
            prone: 2,
            restrained: 5,
            stunned: 4,
            unconscious: 7
         },
      }
   },
   removeCondition: {
      template: {
         label: 'removeCondition',
         cost: 0,
         allOptions: false,
         option: [],
         enabled: false
      },
      settings: {
         sortOrder: 18,
         requireOption: true,
         allOptionsCost: 5,
         option: [
            'blinded',
            'contaminated',
            'deafened',
            'frightened',
            'incapacitated',
            'prone',
            'restrained',
            'stunned',
            'unconscious'
         ],
         optionCost: 2,
      }
   },
});
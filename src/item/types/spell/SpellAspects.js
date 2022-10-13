export default Object.freeze({
   range: {
      template: {
         label: 'range',
         initialValue: 'self',
         cost: 0,
         enabled: true
      },
      settings: {
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
            5: 3,
            10: 6,
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
      }
   },
   decreaseMod: {
      template: {
         label: 'decreaseMod',
         cost: 0,
         option: [],
         resistanceCheck: 'none',
         enabled: false
      },
      settings: {
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
         option: [],
         cost: 0,
         enabled: false
      },
      settings: {
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
         cost: 0,
         option: [],
         resistanceCheck: 'none',
         enabled: false
      },
      settings: {
         requireOption: true,
         option: [
            'accuracy',
            'defense',
            'melee',
         ],
         optionCost: 1,
      }
   },
   increaseRating: {
      template: {
         label: 'increaseRating',
         cost: 0,
         option: [],
         resistanceCheck: 'none',
         enabled: false
      },
      settings: {
         requireOption: true,
         option: [
            'accuracy',
            'defense',
            'melee',
         ],
         optionCost: 1,
      }
   },
   decreaseResistance: {
      template: {
         label: 'decreaseResistance',
         cost: 0,
         option: [],
         resistanceCheck: 'none',
         enabled: false
      },
      settings: {
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
         cost: 0,
         option: [],
         enabled: false
      },
      settings: {
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
         cost: 0,
         option: [],
         resistanceCheck: 'none',
         enabled: false
      },
      settings: {
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
         cost: 0,
         option: [],
         enabled: false
      },
      settings: {
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
         cost: 0,
         option: [],
         resistanceCheck: 'none',
         enabled: false
      },
      settings: {
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
         cost: 0,
         option: [],
         enabled: false
      },
      settings: {
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
         cost: 0,
         option: [],
         resistanceCheck: 'none',
         enabled: false
      },
      settings: {
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
         cost: 0,
         option: [],
         enabled: false
      },
      settings: {
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
   inflictCondition: {
      template: {
         label: 'inflictCondition',
         cost: 0,
         option: [],
         resistanceCheck: 'none',
         enabled: false
      },
      settings: {
         requireOption: true,
         option: [
            'blinded',
            'charmed',
            'deafened',
            'frightened',
            'incapacitated',
            'poisoned',
            'prone',
            'restrained',
            'stunned',
            'unconscious'
         ],
         optionCosts: {
            blinded: 4,
            charmed: 2,
            deafened: 1,
            frightened: 3,
            incapacitated: 6,
            poisoned: 4,
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
         requireOption: true,
         allOptionsCost: 5,
         option: [
            'blinded',
            'charmed',
            'deafened',
            'frightened',
            'incapacitated',
            'poisoned',
            'prone',
            'restrained',
            'stunned',
            'unconscious'
         ],
         optionCosts: {
            blinded: 2,
         },
      }
   },
});
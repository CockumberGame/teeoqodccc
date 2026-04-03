/**
 * SkillSystem — Система навыков героини (v0.7.0)
 * 
 * Концепт от 23.03: 8 навыков с требованиями и прокачкой за очки навыков
 * 
 * Навыки:
 * 1. Выносливость (stamina_max) — макс. стамина (+20/ур), +action point на 5 и 10 уровне
 * 2. Наблюдательность (observation) — осмотр, шанс открыть фетиш
 * 3. Ловкость рук (hand_skill) — hand_*, shaft_* карты
 * 4. Оральный (oral_skill) — bj_* карты
 * 5. Глубокое горло (deep_skill) — deep_* карты (открывается при Оральный 5+)
 * 6. Дразнение (teasing_skill) — t_ease_*, edge фаза (Наблюдательность 3+, Выносливость 2+)
 * 7. Внешность (appearance) — репутация, деньги, чаевые, старт arousal
 * 8. Доминантность (dominance_skill) — rough_* карты (Репутация 5+, Наблюдательность 5+, Внешность 5+)
 * 
 * Прокачка: 1 очко навыка за уровень репутации
 */

class SkillSystem {
  constructor() {
    // Очки навыков (даются за уровень репутации)
    this.skillPoints = 0;
    
    // 8 навыков
    this.skills = {
      // ============================================
      // 1. ВЫНОСЛИВОСТЬ — макс. стамина, action points
      // ============================================
      stamina_max: {
        id: 'stamina_max',
        name: 'Выносливость',
        description: '+20 к максимальной стамине за каждый уровень. На 5 и 10 уровне +1 action point.',
        level: 0,
        maxLevel: 10,
        category: 'base',
        // Требования для открытия
        requirements: {
          reputation: 0
        },
        // Эффекты
        effects: {
          staminaBonus: 20,  // +20 maxStamina за уровень
          actionPointsAtLevels: [5, 10]  // +1 action point на этих уровнях
        }
      },
      
      // ============================================
      // 2. НАБЛЮДАТЕЛЬНОСТЬ — осмотр, фетиши
      // ============================================
      observation: {
        id: 'observation',
        name: 'Наблюдательность',
        description: 'Замечает скрытые черты и предпочтения клиентов. +10% шанс открыть фетиш за уровень.',
        level: 0,
        maxLevel: 10,
        category: 'base',
        requirements: {
          reputation: 0
        },
        effects: {
          traitRevealChance: 0.10,  // +10% за уровень
          fetishRevealChance: 0.15, // +15% за уровень
          inspectionBonus: 1        // +1 линейка осмотра за уровень
        }
      },
      
      // ============================================
      // 3. ЛОВКОСТЬ РУК — hand_*, shaft_* карты
      // ============================================
      hand_skill: {
        id: 'hand_skill',
        name: 'Ловкость рук',
        description: 'Мастерство ласк руками. Открывает карты hand_* и shaft_*. +5% шанс успеха за уровень.',
        level: 0,
        maxLevel: 10,
        category: 'combat',
        requirements: {
          reputation: 0
        },
        effects: {
          successChanceBonus: 0.05,  // +5% за уровень
          unlocksCards: ['hand_mid', 'hand_intense', 'hand_special', 'shaft_soft', 'shaft_mid', 'shaft_intense', 'shaft_special']
        }
      },
      
      // ============================================
      // 4. ОРАЛЬНЫЙ — bj_* карты
      // ============================================
      oral_skill: {
        id: 'oral_skill',
        name: 'Оральный навык',
        description: 'Мастерство минета. Открывает карты bj_*. +5% шанс успеха за уровень.',
        level: 0,
        maxLevel: 10,
        category: 'combat',
        requirements: {
          reputation: 0
        },
        effects: {
          successChanceBonus: 0.05,  // +5% за уровень
          unlocksCards: ['bj_mid', 'bj_intense', 'bj_special'],
          unlocksDeepAtLevel: 5      // Открывает Deep навык на уровне 5
        }
      },
      
      // ============================================
      // 5. ГЛУБОКИЙ — deep_* карты
      // ============================================
      deep_skill: {
        id: 'deep_skill',
        name: 'Глубокий',
        description: 'Глубокое проникновение. Открывает карты deep_*. +5% шанс успеха за уровень.',
        level: 0,
        maxLevel: 10,
        category: 'combat',
        requirements: {
          oral_skill: 5  // Требуется Оральный 5+
        },
        effects: {
          successChanceBonus: 0.05,  // +5% за уровень
          unlocksCards: ['deep_soft', 'deep_mid', 'deep_intense', 'deep_special']
        }
      },
      
      // ============================================
      // 6. ДРАЗНЕНИЕ — t_ease_*, edge фаза
      // ============================================
      teasing_skill: {
        id: 'teasing_skill',
        name: 'Дразнение',
        description: 'Искусство возбуждения и сброса arousal. Бонусы к деньгам в edge фазе. +5% бонус к деньгам за уровень.',
        level: 0,
        maxLevel: 10,
        category: 'combat',
        requirements: {
          observation: 3,  // Требуется Наблюдательность 3+
          stamina_max: 2   // Требуется Выносливость 2+
        },
        effects: {
          moneyBonusEdge: 0.05,  // +5% к деньгам в edge фазе за уровень
          arousalResetBonus: 0.02, // +2% к эффективности сброса arousal
          unlocksCards: ['t_ease_mid', 't_ease_intense', 't_ease_special']
        }
      },
      
      // ============================================
      // 7. ВНЕШНОСТЬ — репутация, деньги, чаевые, старт arousal
      // ============================================
      appearance: {
        id: 'appearance',
        name: 'Внешность',
        description: 'Влияет на клиентов, чаевые и старт arousal. +5% к награде, +10% к шансу чаевых за уровень.',
        level: 0,
        maxLevel: 10,
        category: 'social',
        requirements: {
          // Динамические требования от репутации
          // reputation 3+ для уровней 1-4
          // reputation 5+ для уровней 5-7
          // reputation 8+ для уровней 8-10
        },
        effects: {
          rewardBonus: 0.05,      // +5% к награде за уровень
          tipChanceBonus: 0.10,   // +10% шанс чаевых за уровень
          startingArousalBonus: 2, // +2% к старту arousal клиента за уровень (макс +20%)
          reputationBonus: 0.05   // +5% к получению репутации за уровень
        },
        // Бонусы на определённых уровнях
        levelBonuses: {
          5: { special: 'Красивая', tipChanceBonus: 0.15 }, // Дополнительно +15% шанс чаевых
          10: { special: 'Очень красивая', tipChanceBonus: 0.25 } // Дополнительно +25% шанс чаевых
        }
      },
      
      // ============================================
      // 8. ДОМИНАНТНОСТЬ — rough_* карты
      // ============================================
      dominance_skill: {
        id: 'dominance_skill',
        name: 'Доминантность',
        description: 'Управление клиентом через доминацию. Открывает карты rough_*. +5% шанс успеха за уровень.',
        level: 0,
        maxLevel: 10,
        category: 'combat',
        requirements: {
          reputation: 5,         // Требуется репутация 5+ уровень
          observation: 5,        // Требуется Наблюдательность 5+
          appearance: 5          // Требуется Внешность 5+
        },
        effects: {
          successChanceBonus: 0.05,  // +5% за уровень
          unlocksCards: ['rough_soft', 'rough_mid', 'rough_intense', 'rough_special'],
          itemRequirements: {
            rough_mid: ['handcuffs'],
            rough_intense: ['handcuffs'],
            rough_special: ['handcuffs', 'boss_item']
          }
        }
      }
    };
    
    // Карта категорий навыков для разблокировки карт
    this.categoryToSkill = {
      'hand': 'hand_skill',
      'shaft': 'hand_skill',
      'bj': 'oral_skill',
      'deep': 'deep_skill',
      't_ease': 'teasing_skill',
      'rough': 'dominance_skill',
      'special': null  // special карты не требуют навык
    };
  }

  /**
   * Установить очки навыков (вызывается при повышении репутации)
   */
  setSkillPoints(points) {
    this.skillPoints = points;
  }

  /**
   * Добавить очки навыков
   */
  addSkillPoints(points) {
    this.skillPoints += points;
  }

  /**
   * Потратить очки навыков
   */
  spendSkillPoints(points) {
    if (this.skillPoints >= points) {
      this.skillPoints -= points;
      return true;
    }
    return false;
  }

  /**
   * Получить навык по ID
   */
  getSkill(skillId) {
    return this.skills[skillId] || null;
  }

  /**
   * Получить все навыки
   */
  getAllSkills() {
    return Object.values(this.skills);
  }

  /**
   * Получить все навыки (объект, для совместимости)
   */
  getSkills() {
    return { ...this.skills };
  }

  /**
   * Получить стоимости всех улучшений (для совместимости)
   */
  getUpgradeCosts() {
    const costs = {};
    Object.keys(this.skills).forEach(skillId => {
      const skill = this.skills[skillId];
      costs[skillId] = Math.floor(
        skill.baseCost * Math.pow(skill.costMultiplier, skill.level)
      );
    });
    return costs;
  }

  /**
   * Проверить требования для навыка
   */
  meetsRequirements(skillId) {
    const skill = this.skills[skillId];
    if (!skill) return false;
    
    const reqs = skill.requirements;
    if (!reqs) return true;
    
    // Проверка требований репутации
    if (reqs.reputation !== undefined) {
      // Репутация передаётся извне
      return false; // Заглушка
    }
    
    // Проверка требований других навыков
    for (const [reqSkillId, reqLevel] of Object.entries(reqs)) {
      if (reqSkillId === 'reputation') continue;
      
      const reqSkill = this.skills[reqSkillId];
      if (!reqSkill || reqSkill.level < reqLevel) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Проверить требования для уровня навыка (для appearance)
   */
  meetsLevelRequirements(skillId, targetLevel) {
    const skill = this.skills[skillId];
    if (!skill) return false;
    
    // Специальная логика для appearance
    if (skillId === 'appearance') {
      if (targetLevel <= 4) return true;  // Уровни 1-4: без требований
      if (targetLevel <= 7) return false; // Уровни 5-7: нужна репутация 5+ (заглушка)
      return false; // Уровни 8-10: нужна репутация 8+ (заглушка)
    }
    
    return this.meetsRequirements(skillId);
  }

  /**
   * Проверить, можно ли улучшить навык
   */
  canUpgrade(skillId, skillPoints) {
    const skill = this.skills[skillId];
    if (!skill) return false;
    if (skill.level >= skill.maxLevel) return false;
    if (skillPoints < 1) return false;
    
    // Проверка требований
    if (!this.meetsRequirements(skillId)) return false;
    
    // Специальная проверка для appearance
    if (skillId === 'appearance' && !this.meetsLevelRequirements(skillId, skill.level + 1)) {
      return false;
    }
    
    return true;
  }

  /**
   * Улучшить навык (за очки навыков)
   */
  upgradeSkill(skillId) {
    if (!this.canUpgrade(skillId, this.skillPoints)) {
      return { 
        success: false, 
        reason: 'Недостаточно очков навыков или не выполнены требования' 
      };
    }

    this.skills[skillId].level += 1;
    this.spendSkillPoints(1);

    return {
      success: true,
      newLevel: this.skills[skillId].level,
      skillPointsLeft: this.skillPoints
    };
  }

  /**
   * Проверить разблокировку карты действия
   */
  isActionUnlocked(actionId) {
    const action = this.getActionData(actionId);
    if (!action) return false;
    
    // Проверка требования навыка
    if (action.skillRequirement) {
      const { skill, level } = action.skillRequirement;
      const skillData = this.skills[skill];
      if (!skillData || skillData.level < level) {
        return false;
      }
    }
    
    // Проверка требования предмета (заглушка — инвентарь проверяется отдельно)
    if (action.itemRequirement) {
      // Предметы проверяются в InventorySystem
      return 'item_check_needed';
    }
    
    return true;
  }

  /**
   * Получить данные действия
   */
  getActionData(actionId) {
    // Заглушка — данные загружаются из actions.json
    return null;
  }

  /**
   * Получить бонус стамины от навыка "Выносливость"
   */
  getStaminaBonus() {
    const skill = this.skills.stamina_max;
    if (!skill || skill.level === 0) return 0;
    return skill.level * (skill.effects.staminaBonus || 20);
  }

  /**
   * Получить бонус actionPoints от навыка "Выносливость"
   */
  getActionPointsBonus() {
    const skill = this.skills.stamina_max;
    if (!skill || skill.level === 0) return 0;

    let bonus = 0;
    const actionPointsAtLevels = skill.effects.actionPointsAtLevels || [5, 10];

    for (const level of actionPointsAtLevels) {
      if (skill.level >= level) {
        bonus++;
      }
    }

    return bonus;
  }

  /**
   * Получить эффект навыка наблюдательности
   */
  getObservationEffects() {
    const observation = this.skills.observation;
    if (!observation || observation.level === 0) {
      return { traitRevealChance: 0, fetishRevealChance: 0, inspectionBonus: 0 };
    }

    return {
      traitRevealChance: observation.level * observation.effects.traitRevealChance,
      fetishRevealChance: observation.level * observation.effects.fetishRevealChance,
      inspectionBonus: observation.level * observation.effects.inspectionBonus
    };
  }

  /**
   * Получить шанс раскрытия черты
   */
  getTraitRevealChance() {
    return this.getObservationEffects().traitRevealChance || 0;
  }

  /**
   * Получить шанс раскрытия фетиша
   */
  getFetishRevealChance() {
    return this.getObservationEffects().fetishRevealChance || 0;
  }

  /**
   * Получить бонус к успеху для категории навыка
   */
  getSuccessChanceBonus(category) {
    const skillId = this.categoryToSkill[category];
    if (!skillId) return 0;
    
    const skill = this.skills[skillId];
    if (!skill || skill.level === 0) return 0;
    
    return skill.level * (skill.effects.successChanceBonus || 0);
  }

  /**
   * Получить бонус к деньгам в edge фазе (Дразнение)
   */
  getEdgeMoneyBonus() {
    const teasing = this.skills.teasing_skill;
    if (!teasing || teasing.level === 0) return 0;
    return teasing.level * teasing.effects.moneyBonusEdge;
  }

  /**
   * Получить бонус к награде (Внешность)
   */
  getRewardBonus() {
    const appearance = this.skills.appearance;
    if (!appearance || appearance.level === 0) return 0;
    return appearance.level * appearance.effects.rewardBonus;
  }

  /**
   * Получить бонус к шансу чаевых (Внешность)
   */
  getTipChanceBonus() {
    const appearance = this.skills.appearance;
    if (!appearance || appearance.level === 0) return 0;
    
    let bonus = appearance.level * appearance.effects.tipChanceBonus;
    
    // Добавить бонусы уровней
    if (appearance.level >= 5) {
      bonus += appearance.levelBonuses[5].tipChanceBonus;
    }
    if (appearance.level >= 10) {
      bonus += appearance.levelBonuses[10].tipChanceBonus;
    }
    
    return bonus;
  }

  /**
   * Получить бонус к старту arousal клиента (Внешность)
   */
  getStartingArousalBonus() {
    const appearance = this.skills.appearance;
    if (!appearance || appearance.level === 0) return 0;
    return Math.min(appearance.level * appearance.effects.startingArousalBonus, 20);
  }

  /**
   * Проверить разблокировку навыка Deep (при Оральный 5+)
   */
  isDeepUnlocked() {
    const oral = this.skills.oral_skill;
    return oral && oral.level >= 5;
  }

  /**
   * Получить общий уровень персонажа (сумма уровней навыков)
   */
  getTotalLevel() {
    return Object.values(this.skills)
      .reduce((sum, skill) => sum + skill.level, 0);
  }

  /**
   * Сериализация
   */
  serialize() {
    return {
      skillPoints: this.skillPoints,
      skills: Object.fromEntries(
        Object.entries(this.skills).map(([id, skill]) => [id, { level: skill.level }])
      )
    };
  }

  /**
   * Десериализация
   */
  deserialize(data) {
    if (!data) return;
    
    if (data.skillPoints !== undefined) {
      this.skillPoints = data.skillPoints;
    }
    
    if (!data.skills) return;

    Object.entries(data.skills).forEach(([id, skillData]) => {
      if (this.skills[id]) {
        this.skills[id].level = skillData.level || 0;
      }
    });
  }
}

export default SkillSystem;

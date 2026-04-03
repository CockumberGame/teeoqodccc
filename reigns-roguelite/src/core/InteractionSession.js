/**
 * InteractionSession - Объект встречи с клиентом
 * Gloryhole Quest - инкапсулирует состояние interaction сессии
 *
 * Отвечает за:
 * - Состояние клиента (arousal, patience, mood, traits, preferences)
 * - Ход внутри встречи (turn)
 * - История действий (actionHistory)
 * - Edge tension (напряжение)
 * - Проверка завершения встречи
 * - Расчёт удовлетворённости
 */

import balanceData from '../data/balance.json' with { type: 'json' };

class InteractionSession {
  /**
   * @param {Object} client - Данные клиента (clientData из карты)
   * @param {Object} player - Данные игрока
   * @param {Object} options - Дополнительные опции
   */
  constructor(client, player, options = {}) {
    // Клиент (копируем данные чтобы не мутировать оригинал)
    this.client = {
      id: client.id,
      arousal: client.arousal || 0,
      patience: client.patience || 100,
      mood: client.mood || 'neutral',
      traits: client.traits || [],
      preferences: client.preferences || { liked: [], disliked: [], neutral: [] },
      fetishes: client.fetishes || [],
      type: client.type || { id: 'regular', name: 'Обычный' },
      sizeCm: client.sizeCm || 16,
      basePayout: client.basePayout || 30,
      ...client
    };

    // Игрок (ссылка)
    this.player = player;

    // Состояние сессии
    this.turn = 0;
    this.actionHistory = [];
    this.tensionLevel = 0;
    this.edgeTension = 0;
    this.isFinished = false;
    this.finishReason = null;

    // Статистика сессии
    this.stats = {
      totalArousalGained: 0,
      totalStaminaSpent: 0,
      totalMentalSpent: 0,
      successfulActions: 0,
      failedActions: 0,
      preferenceMatches: 0,
      preferenceMismatches: 0
    };

    // Edge stacking (v0.8)
    this.edgeStacks = 0;
    this.maxEdgeStacks = 5;
    this.edgePhaseThreshold = 75;
    this.arousalResetTo = 70;

    // Константы из баланса
    this.balance = balanceData;
  }

  /**
   * Сыграть действие в рамках сессии
   * @param {Object} action - Данные действия
   * @param {Object} context - Контекст (навыки игрока, модификаторы, itemEffects)
   * @returns {Object} Результат действия
   */
  playAction(action, context = {}) {
    if (this.isFinished) {
      return {
        success: false,
        error: 'Сессия уже завершена',
        finishReason: this.finishReason
      };
    }

    this.turn++;
    
    // v0.8: Сбрасываем флаг edge stacking для этого хода
    this._edgeStackAppliedThisTurn = false;

    // Получаем эффекты предметов из контекста
    const itemEffects = context.itemEffects || {
      arousalBonus: 0,
      staminaDiscount: 0,
      mentalDiscount: 0,
      successChanceBonus: 0,
      trustBonus: 0
    };

    // Применяем diminishing returns
    const diminishingMultiplier = this._getDiminishingMultiplier(action.id);
    
    // v0.7: arousal в effects.arousal
    const baseArousal = action.effects?.arousal || action.baseArousalGain || 15;
    let effectiveArousalGain = Math.floor(baseArousal * diminishingMultiplier);

    // Применяем бонусы от предметов к arousal gain
    if (itemEffects.arousalBonus) {
      effectiveArousalGain += itemEffects.arousalBonus;
    }

    // Расчёт шанса успеха (с бонусами от предметов)
    let successChance = this._calculateSuccessChance(action, context);
    if (itemEffects.successChanceBonus) {
      successChance = Math.min(0.95, successChance + itemEffects.successChanceBonus);
    }

    // Бросок на успех
    const roll = Math.random();
    const isSuccess = roll <= successChance;

    // Фактический arousal gain
    let actualArousalGain = effectiveArousalGain;
    if (!isSuccess) {
      actualArousalGain = Math.floor(effectiveArousalGain * 0.5);

      // При серьёзном провале может быть потеря arousal
      // Шанс серьёзного провала: 20% от шанса успеха (не 50%!)
      if (roll < successChance * 0.2) {
        actualArousalGain = -Math.floor(Math.abs(effectiveArousalGain) * 0.3);
      }
    }

    // Обновляем состояние клиента
    this._applyActionEffects(actualArousalGain, action, isSuccess);

    // Обновляем статистику
    this._updateStats(action, isSuccess, actualArousalGain);

    // Обновляем edge tension
    this._updateTension(actualArousalGain);

    // v0.8: Edge stacking обработка
    const edgeStackResult = this._handleEdgeStacking(action, isSuccess);

    // Добавляем в историю
    this.actionHistory.push({
      actionId: action.id,
      turn: this.turn,
      success: isSuccess,
      arousalGain: actualArousalGain,
      itemEffects: itemEffects.arousalBonus > 0 ? itemEffects : null,
      edgeStacksGained: edgeStackResult.stacksGained || 0,
      totalEdgeStacks: this.edgeStacks
    });

    // Проверяем завершение
    const endCheck = this.checkEndConditions();

    // v0.7: стоимость в effects.stamina
    const baseStamina = action.effects?.stamina || action.staminaCost || 5;
    const baseMental = action.effects?.mental || action.mentalCost || 1;

    // Возвращаем результат с информацией о предметах
    return {
      success: isSuccess,
      actionId: action.id,
      actionName: action.name,
      arousalGain: actualArousalGain,
      baseArousalGain: baseArousal,
      itemArousalBonus: itemEffects.arousalBonus || 0,
      newArousal: this.client.arousal,
      staminaCost: baseStamina - (itemEffects.staminaDiscount || 0),
      baseStaminaCost: baseStamina,
      staminaDiscount: itemEffects.staminaDiscount || 0,
      mentalCost: baseMental - (itemEffects.mentalDiscount || 0),
      baseMentalCost: baseMental,
      mentalDiscount: itemEffects.mentalDiscount || 0,
      successChance,
      baseSuccessChance: action.successChance,
      roll,
      diminishingMultiplier,
      tensionLevel: this.tensionLevel,
      edgeTension: this.edgeTension,
      edgeStacks: this.edgeStacks,
      edgeStacksGained: edgeStackResult.stacksGained || 0,
      isFinished: this.isFinished,
      finishReason: this.finishReason,
      endCheck,
      itemEffects: Object.keys(itemEffects).length > 0 ? itemEffects : null,
      effects: action.effects  // v0.7: передаём effects для совместимости
    };
  }

  /**
   * v0.8: Обработка edge stacking
   */
  _handleEdgeStacking(action, isSuccess) {
    if (!isSuccess) return { stacksGained: 0 };

    const specialEffect = action.specialEffect;
    const edgeStackGain = action.edgeStackGain || 0;

    // Проверяем edge stacking действие и что ещё не применяли в этом ходу
    if (specialEffect === 'edge_stack' && edgeStackGain > 0 && !this._edgeStackAppliedThisTurn) {
      // Проверяем что клиент в edge фазе (arousal >= 75)
      if (this.client.arousal >= this.edgePhaseThreshold) {
        // Сбрасываем arousal
        const arousalBefore = this.client.arousal;
        this.client.arousal = this.arousalResetTo;
        this._edgeStackAppliedThisTurn = true;  // Флаг что применили в этом ходу

        // Добавляем стеки
        const stacksToAdd = Math.min(edgeStackGain, this.maxEdgeStacks - this.edgeStacks);
        this.edgeStacks += stacksToAdd;

        return {
          stacksGained: stacksToAdd,
          arousalBefore,
          arousalAfter: this.client.arousal,
          totalStacks: this.edgeStacks,
          bonusMultiplier: 1 + (this.edgeStacks * 0.10)
        };
      }
    }

    return { stacksGained: 0 };
  }

  /**
   * Проверить условия завершения встречи
   * @returns {Object|null} Результат проверки или null если не завершено
   */
  checkEndConditions() {
    // 1. Climax - arousal >= 95
    if (this.client.arousal >= this.balance.arousal.climaxThreshold) {
      this.isFinished = true;
      this.finishReason = 'climax';
      return {
        finished: true,
        reason: 'climax',
        satisfaction: this.getSatisfaction(),
        bonusXp: this.balance.earlyFinish.bonusXp
      };
    }

    // 2. Client Left - patience <= 0
    if (this.client.patience <= 0) {
      this.isFinished = true;
      this.finishReason = 'clientLeft';
      return {
        finished: true,
        reason: 'clientLeft',
        satisfaction: Math.max(0, this.getSatisfaction() - 30)
      };
    }

    // 3. Player Ran Out - stamina <= 0 (проверяется извне)
    // Эта проверка выполняется в GameEngine

    // 4. Early Finish - попытка завершения при arousal > 70
    // Эта проверка выполняется отдельно через attemptEarlyFinish()

    return null;
  }

  /**
   * Попытка раннего завершения (Early Finish)
   * Формула: arousal + skills + trust - difficulty
   * @returns {Object} Результат попытки
   */
  attemptEarlyFinish() {
    const minArousal = this.balance.arousal.earlyFinishThreshold;

    if (this.client.arousal < minArousal) {
      return {
        success: false,
        reason: 'Arousal недостаточно для раннего завершения',
        requiredArousal: minArousal
      };
    }

    if (this.isFinished) {
      return {
        success: false,
        reason: 'Сессия уже завершена'
      };
    }

    // === ФОРМУЛА: arousal + skills + trust - difficulty ===

    // 1. Базовый шанс от arousal (50% при пороге 70, растёт до 95% при 95 arousal)
    // Формула: (arousal - 50) / 50, мин 0.3, макс 0.9
    const arousalChance = Math.max(0.3, Math.min(0.9, (this.client.arousal - 50) / 50));

    // 2. Бонус от навыков игрока
    let skillBonus = 0;
    if (this.player && this.player.skills) {
      // Навык "technique" (Оральный) даёт бонус
      const techniqueLevel = this.player.skills.technique?.level || 0;
      skillBonus += techniqueLevel * 0.05;  // +5% за уровень

      // Навык "hand_skill" (Ловкость рук) даёт бонус
      const handLevel = this.player.skills.hand_skill?.level || 0;
      skillBonus += handLevel * 0.03;  // +3% за уровень

      // Навык "observation" (Наблюдательность) даёт бонус если клиент осмотрен
      const observationLevel = this.player.skills.observation_skill?.level || 0;
      const clientMemory = this.clientMemory?.getKnownClient?.(this.client.id);
      if (clientMemory?.wasInspected && observationLevel >= 3) {
        skillBonus += 0.10;  // +10% если клиент осмотрен и навык 3+
      }
    }
    skillBonus = Math.min(0.3, skillBonus);  // Максимум +30% от навыков

    // 3. Бонус от доверия клиента (trust)
    let trustBonus = 0;
    if (this.client.trust) {
      // trust: 0-100, бонус: 0-20%
      trustBonus = (this.client.trust / 100) * 0.20;
    }

    // 4. Штраф от сложности клиента (difficulty)
    // difficulty: 0.8 (лёгкий) - 2.0 (сложный)
    // Штраф: (difficulty - 1.0) * 15%
    const clientDifficulty = this.client.difficulty || 1.0;
    const difficultyPenalty = Math.max(0, (clientDifficulty - 1.0) * 0.15);

    // Итоговый шанс
    let successChance = arousalChance + skillBonus + trustBonus - difficultyPenalty;
    successChance = Math.max(0.15, Math.min(0.95, successChance));

    const roll = Math.random();

    if (roll <= successChance) {
      // Успешное завершение
      this.isFinished = true;
      this.finishReason = 'earlyFinish';

      const satisfaction = Math.floor(
        this.balance.earlyFinish.satisfactionRange[0] +
        Math.random() * (this.balance.earlyFinish.satisfactionRange[1] - this.balance.earlyFinish.satisfactionRange[0])
      );

      return {
        success: true,
        finished: true,
        reason: 'earlyFinish',
        satisfaction,
        bonusXp: this.balance.earlyFinish.bonusXp,
        successChance: Math.round(successChance * 100)
      };
    }

    // Неудача - клиент не кончил, теряем немного arousal
    const arousalLoss = 10;
    this.client.arousal = Math.max(0, this.client.arousal - arousalLoss);

    return {
      success: false,  // false при неудаче
      finished: false,
      reason: 'Клиент ещё не готов',
      arousalLoss,
      successChance: Math.round(successChance * 100)
    };
  }

  /**
   * Рассчитать шанс раннего завершения (без броска)
   * @returns {Object} { successChance, canAttempt, requiredArousal }
   */
  getEarlyFinishChance() {
    const minArousal = this.balance.arousal.earlyFinishThreshold;

    if (this.client.arousal < minArousal) {
      return {
        canAttempt: false,
        requiredArousal: minArousal,
        successChance: 0
      };
    }

    // === ФОРМУЛА: arousal + skills + trust - difficulty ===

    // 1. Базовый шанс от arousal
    const arousalChance = Math.max(0.3, Math.min(0.9, (this.client.arousal - 50) / 50));

    // 2. Бонус от навыков игрока
    let skillBonus = 0;
    if (this.player && this.player.skills) {
      const techniqueLevel = this.player.skills.technique?.level || 0;
      skillBonus += techniqueLevel * 0.05;

      const handLevel = this.player.skills.hand_skill?.level || 0;
      skillBonus += handLevel * 0.03;

      const observationLevel = this.player.skills.observation_skill?.level || 0;
      const clientMemory = this.clientMemory?.getKnownClient?.(this.client.id);
      if (clientMemory?.wasInspected && observationLevel >= 3) {
        skillBonus += 0.10;
      }
    }
    skillBonus = Math.min(0.3, skillBonus);

    // 3. Бонус от доверия клиента
    let trustBonus = 0;
    if (this.client.trust) {
      trustBonus = (this.client.trust / 100) * 0.20;
    }

    // 4. Штраф от сложности клиента
    const clientDifficulty = this.client.difficulty || 1.0;
    const difficultyPenalty = Math.max(0, (clientDifficulty - 1.0) * 0.15);

    // Итоговый шанс
    let successChance = arousalChance + skillBonus + trustBonus - difficultyPenalty;
    successChance = Math.max(0.15, Math.min(0.95, successChance));

    return {
      canAttempt: true,
      successChance: Math.round(successChance * 100),
      requiredArousal: minArousal
    };
  }

  /**
   * Рассчитать удовлетворённость клиента
   * @returns {number} Удовлетворённость (0-100)
   */
  getSatisfaction() {
    let satisfaction = this.client.arousal;

    // Бонус за попадание в предпочтения
    satisfaction += this.stats.preferenceMatches * this.balance.reward.preferenceMatchBonus;

    // Штраф за несоответствие предпочтениям
    satisfaction -= this.stats.preferenceMismatches * this.balance.reward.preferenceMismatchPenalty;

    // Бонус за успешные действия
    satisfaction += this.stats.successfulActions * 2;

    // Штраф за проваленные действия
    satisfaction -= this.stats.failedActions * 3;

    // Штраф за слишком быстрое завершение
    if (this.actionHistory.length < 2 && this.client.arousal >= 95) {
      satisfaction -= 20;
    }

    // Бонус за идеальную сессию (3-5 действий, climax)
    if (this.actionHistory.length >= 3 && this.actionHistory.length <= 5 && this.client.arousal >= 95) {
      satisfaction += 15;
    }

    return Math.max(0, Math.min(100, Math.floor(satisfaction)));
  }

  /**
   * Рассчитать награду за встречу
   * @returns {Object} Детализация награды
   */
  calculateReward() {
    const arousalPhase = this._getArousalPhase(this.client.arousal);
    
    // Базовая награда
    const baseReward = this.balance.reward.baseReward;

    // Бонус за размер
    const sizeBonus = this._getSizeBonus(this.client.sizeCm);

    // Бонус за тип клиента
    const typeBonus = this._getTypeBonus(this.client.type.id);

    // Бонус за фазу возбуждения
    const phaseBonus = this.balance.reward.phaseBonus[arousalPhase.id] || 0;

    // Бонус за напряжение
    const tensionBonus = this.tensionLevel * this.balance.reward.tensionBonus;

    // Бонус за предпочтения
    const preferenceBonus = 
      this.stats.preferenceMatches * this.balance.reward.preferenceMatchBonus -
      this.stats.preferenceMismatches * this.balance.reward.preferenceMismatchPenalty;

    // Бонус за удовлетворённость
    const satisfaction = this.getSatisfaction();
    const satisfactionBonus = Math.floor(satisfaction * this.balance.reward.satisfactionMultiplier);

    // Итоговая награда (БЕЗ edge stacking)
    let totalReward = baseReward + sizeBonus + typeBonus + phaseBonus + tensionBonus +
                        Math.max(0, preferenceBonus) + satisfactionBonus;

    // v0.8: Edge stacking бонус (применяется к итогу)
    const edgeStackBonus = Math.floor(totalReward * (this.edgeStacks * 0.10));
    totalReward += edgeStackBonus;

    return {
      baseReward,
      sizeBonus,
      typeBonus,
      phaseBonus,
      tensionBonus,
      preferenceBonus,
      satisfactionBonus,
      edgeStackBonus,
      edgeStacks: this.edgeStacks,
      satisfaction,
      totalReward: Math.floor(totalReward),
      arousalPhase: arousalPhase.name,
      tensionLevel: this.tensionLevel
    };
  }

  /**
   * Получить текущее состояние сессии
   * @returns {Object} Состояние для UI
   */
  getState() {
    return {
      client: {
        id: this.client.id,
        arousal: this.client.arousal,
        patience: this.client.patience,
        mood: this.client.mood,
        arousalPhase: this._getArousalPhase(this.client.arousal).name
      },
      turn: this.turn,
      actionHistory: this.actionHistory.map(h => h.actionId),
      tensionLevel: this.tensionLevel,
      edgeTension: this.edgeTension,
      isFinished: this.isFinished,
      finishReason: this.finishReason,
      stats: this.stats
    };
  }

  // ==================== ПРИВАТНЫЕ МЕТОДЫ ====================

  /**
   * Применить эффекты действия
   */
  _applyActionEffects(arousalGain, action, isSuccess) {
    // Обновляем arousal
    this.client.arousal = Math.max(0, Math.min(100, this.client.arousal + arousalGain));

    // Обновляем patience (уменьшается каждый ход)
    const patienceDecay = this.balance.patience.decayPerTurn;
    this.client.patience = Math.max(0, this.client.patience - patienceDecay);

    // Проверяем соответствие предпочтениям
    if (action.preferenceHint) {
      if (this.client.preferences.liked?.includes(action.preferenceHint)) {
        this.stats.preferenceMatches++;
        // Бонус к patience за любимое действие
        this.client.patience = Math.min(100, this.client.patience + 2);
      } else if (this.client.preferences.disliked?.includes(action.preferenceHint)) {
        this.stats.preferenceMismatches++;
        // Штраф к patience за нелюбимое действие
        this.client.patience = Math.max(0, this.client.patience - 3);
      }
    }

    // Обновляем mood на основе результата
    if (isSuccess && arousalGain > 0) {
      if (this.client.mood === 'bored') {
        this.client.mood = 'neutral';
      } else if (this.client.mood === 'neutral' && this.client.arousal >= 40) {
        this.client.mood = 'excited';
      }
    } else if (!isSuccess) {
      if (this.client.mood === 'excited') {
        this.client.mood = 'neutral';
      } else if (this.client.mood === 'neutral') {
        this.client.mood = 'bored';
      }
    }
  }

  /**
   * Обновить статистику
   */
  _updateStats(action, isSuccess, arousalGain) {
    this.stats.totalStaminaSpent += action.staminaCost;
    this.stats.totalMentalSpent += action.mentalCost || 0;
    this.stats.totalArousalGained += arousalGain;

    if (isSuccess) {
      this.stats.successfulActions++;
    } else {
      this.stats.failedActions++;
    }
  }

  /**
   * Обновить edge tension
   */
  _updateTension(arousalChange) {
    const arousalPhase = this._getArousalPhase(this.client.arousal);
    
    if (arousalChange > 0) {
      const rate = this.balance.tension.accumulationRate[arousalPhase.id] || 1.0;
      this.edgeTension = Math.min(100, this.edgeTension + arousalChange * rate);
    }

    if (arousalChange < 0) {
      this.edgeTension = Math.max(0, this.edgeTension + arousalChange * this.balance.tension.decayRate);
    }

    this.tensionLevel = Math.floor(this.edgeTension / 20);
  }

  /**
   * Получить множитель diminishing returns
   */
  _getDiminishingMultiplier(actionId) {
    let consecutiveCount = 0;
    
    // Считаем повторения подряд с конца истории
    for (let i = this.actionHistory.length - 1; i >= 0; i--) {
      if (this.actionHistory[i].actionId === actionId) {
        consecutiveCount++;
      } else {
        break;
      }
    }

    // +1 потому что текущее действие тоже считается
    consecutiveCount++;

    const dr = this.balance.diminishingReturns;
    if (consecutiveCount >= 4) return dr.consecutive4Plus;
    if (consecutiveCount === 3) return dr.consecutive3;
    if (consecutiveCount === 2) return dr.consecutive2;
    return 1.0;
  }

  /**
   * Рассчитать шанс успеха действия
   */
  _calculateSuccessChance(action, context) {
    let chance = action.successChance;

    // Бонус от навыков игрока
    if (action.requiredSkills && this.player?.skills) {
      for (const [skillId, requiredLevel] of Object.entries(action.requiredSkills)) {
        const playerLevel = this.player.skills[skillId]?.level || 0;
        if (playerLevel > requiredLevel) {
          chance += (playerLevel - requiredLevel) * 0.05;
        }
      }
    }

    // Бонус за предпочтение
    if (action.preferenceHint) {
      if (this.client.preferences.liked?.includes(action.preferenceHint)) {
        chance += 0.15;
      } else if (this.client.preferences.disliked?.includes(action.preferenceHint)) {
        chance -= 0.15;
      }
    }

    // Модификатор от архетипа клиента
    const archetype = this.client.archetype;
    if (archetype) {
      if (action.intensity === 'slow' && archetype.id === 'gentle') {
        chance += 0.1;
      } else if (action.intensity === 'intense' && archetype.id === 'dominant') {
        chance += 0.1;
      }
    }

    return Math.max(0.3, Math.min(0.95, chance));
  }

  /**
   * Получить фазу arousal (публичный метод для GameEngine)
   * @param {number} arousal - Уровень возбуждения
   * @returns {Object} Данные фазы
   */
  getArousalPhase(arousal) {
    const phases = this.balance.arousal.phases;
    
    // Особая проверка для climax (arousal >= 90)
    if (arousal >= phases.climax.min) {
      return { id: 'climax', ...phases.climax };
    }
    
    for (const [phaseId, phaseData] of Object.entries(phases)) {
      if (arousal >= phaseData.min && arousal < phaseData.max) {
        return { id: phaseId, ...phaseData };
      }
    }
    
    // Fallback для edge case
    return phases.soft;
  }

  /**
   * Получить фазу arousal (приватный метод)
   * @param {number} arousal - Уровень возбуждения
   * @returns {Object} Данные фазы
   */
  _getArousalPhase(arousal) {
    return this.getArousalPhase(arousal);
  }

  /**
   * Получить бонус за размер
   */
  _getSizeBonus(sizeCm) {
    const bonuses = this.balance.reward.sizeBonus;
    if (sizeCm >= 24) return bonuses.legendary;
    if (sizeCm >= 20) return bonuses.huge;
    if (sizeCm >= 18) return bonuses.large;
    if (sizeCm >= 14) return bonuses.average;
    return bonuses.small;
  }

  /**
   * Получить бонус за тип клиента
   */
  _getTypeBonus(typeId) {
    const bonuses = {
      'newbie': 0,
      'regular': 5,
      'generous': 15,
      'demanding': 20,
      'vip': 25,
      'special': 30
    };
    return bonuses[typeId] || 5;
  }

  /**
   * Проверить завершение по стамине (вызывается из GameEngine)
   * @param {number} playerStamina - Текущая стамина игрока
   * @returns {Object|null} Результат проверки или null
   */
  checkStaminaDepleted(playerStamina) {
    if (playerStamina <= 0 && !this.isFinished) {
      this.isFinished = true;
      this.finishReason = 'staminaDepleted';
      return {
        finished: true,
        reason: 'staminaDepleted',
        satisfaction: Math.max(0, this.getSatisfaction() - 20)
      };
    }
    return null;
  }

  /**
   * Сериализация для сохранения игры
   * @returns {Object} Данные для сохранения
   */
  serialize() {
    return {
      client: { ...this.client },
      turn: this.turn,
      actionHistory: [...this.actionHistory],
      tensionLevel: this.tensionLevel,
      edgeTension: this.edgeTension,
      isFinished: this.isFinished,
      finishReason: this.finishReason,
      stats: { ...this.stats }
    };
  }

  /**
   * Десериализация из сохранения
   * @param {Object} data - Данные из сохранения
   */
  deserialize(data) {
    if (!data) return;

    this.client = { ...data.client };
    this.turn = data.turn || 0;
    this.actionHistory = data.actionHistory || [];
    this.tensionLevel = data.tensionLevel || 0;
    this.edgeTension = data.edgeTension || 0;
    this.isFinished = data.isFinished || false;
    this.finishReason = data.finishReason || null;
    this.stats = data.stats || {
      totalArousalGained: 0,
      totalStaminaSpent: 0,
      totalMentalSpent: 0,
      successfulActions: 0,
      failedActions: 0,
      preferenceMatches: 0,
      preferenceMismatches: 0
    };
  }
}

export default InteractionSession;

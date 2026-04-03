/**
 * ActionDeckSystem v0.7.0 — Генерация карт действий (матрица 8×4)
 * Gloryhole Quest — унифицированная система действий
 *
 * Концепт от 23.03:
 * - Матрица 8×4 = 32 типа действий (hand/head/shaft/bj/deep/t_ease/rough/special × soft/mid/intense/special)
 * - Генерация 2 карт на ход
 * - Минимум 1 карта под текущую фазу клиента
 * - Учёт навыков игрока для разблокировки карт
 * - Diminishing returns на повторяющиеся действия
 *
 * Формула генерации:
 * 1. Определить текущую фазу клиента
 * 2. Получить доступные игроку карты (по навыкам и предметам)
 * 3. Выбрать 1 карту под текущую фазу (или соседнюю интенсивность)
 * 4. Выбрать 1 случайную карту из доступных
 * 5. Если нет карт под фазу → "одолжить" базовую карту
 */

import Logger from '../core/Logger.js';

class ActionDeckSystem {
  constructor() {
    // Пул действий загружается из actions.json
    this.actionsPool = null;
    
    // Баланс загружается из combat_rules.json
    this.combatRules = null;
    
    // История действий для diminishing returns
    this.actionHistory = [];
    
    // Отслеживание использования действий для текущего клиента
    this.currentClientUsage = {};
    
    // Максимальное использование одной карты на одного клиента
    this.maxActionUsagePerClient = 3;
    
    // Карта категорий к навыкам
    this.categoryToSkill = {
      'hand': 'hand_skill',
      'head': 'oral_skill',
      'shaft': 'hand_skill',
      'bj': 'oral_skill',
      'deep': 'deep_skill',
      't_ease': 'teasing_skill',
      'rough': 'dominance_skill',
      'special': null  // special карты не требуют навык
    };
    
    // Соседние интенсивности для fallback
    this.neighborIntensities = {
      'soft': ['mid'],
      'mid': ['soft', 'intense'],
      'intense': ['mid', 'special'],
      'special': ['intense']
    };
    
    // Базовые карты для "одалживания"
    this.fallbackCards = ['hand_soft', 'head_soft', 'bj_soft'];
  }

  /**
   * Загрузить данные действий и правил
   */
  loadData(actionsData, combatRulesData) {
    this.actionsPool = actionsData;
    this.combatRules = combatRulesData;
  }

  /**
   * Сгенерировать 2 карты действий для игрока
   * @param {Object} client - Данные клиента (arousal, phase)
   * @param {Object} player - Данные игрока (skills, inventory)
   * @param {Object} skillSystem - Экземпляр SkillSystem
   * @param {string} clientId - ID клиента для отслеживания повторов
   * @param {number} turnNumber - Номер текущего хода (для гарантированной карты "Осмотреть")
   * @returns {Array} 2 карты действий
   */
  generateActionCards(client, player, skillSystem, clientId = null, turnNumber = 1) {
    const currentPhase = this._getCurrentPhase(client.arousal);
    Logger.debugModule('actionDeck', `Генерация карт: фаза=${currentPhase}, arousal=${client.arousal}, ход=${turnNumber}`);

    // Получить доступные карты (по навыкам и предметам)
    const availableActions = this._getAvailableActions(player, skillSystem, currentPhase);
    Logger.debugModule('actionDeck', `Доступно карт: ${availableActions.length}`);

    if (availableActions.length === 0) {
      // Критическая ошибка — нет доступных карт
      Logger.errorModule('actionDeck', 'Нет доступных карт действий! Возвращаем fallback.');
      return this._getFallbackCards(2, currentPhase);
    }

    const selectedCards = [];

    // ГАРАНТИРОВАННАЯ КАРТА "ОСМОТРЕТЬ" НА 1-2 ХОДУ
    const inspectCard = this._getGuaranteedInspectCard(availableActions, turnNumber);
    if (inspectCard) {
      selectedCards.push(inspectCard);
      Logger.debugModule('actionDeck', `Карта 1 (гарантированный осмотр): ${inspectCard.id}`);
    } else {
      // КАРТА 1: Под текущую фазу (или соседнюю интенсивность)
      const phaseCard = this._selectPhaseCard(availableActions, currentPhase, skillSystem);
      if (phaseCard) {
        selectedCards.push(phaseCard);
        Logger.debugModule('actionDeck', `Карта 1 (фаза): ${phaseCard.id}`);
      } else {
        // Нет карты под фазу → "одалживаем" базовую
        const fallback = this._lendFallbackCard(currentPhase);
        selectedCards.push(fallback);
        Logger.debugModule('actionDeck', `Карта 1 (fallback): ${fallback.id}`);
      }
    }

    // КАРТА 2: Случайная из доступных (не совпадающая с первой)
    const randomCard = this._selectRandomCard(availableActions, selectedCards);
    if (randomCard) {
      selectedCards.push(randomCard);
      Logger.debugModule('actionDeck', `Карта 2 (random): ${randomCard.id}`);
    } else if (selectedCards.length < 2) {
      // Добавляем вторую fallback если нужно
      const fallback2 = this._lendFallbackCard(currentPhase, selectedCards[0]?.id);
      selectedCards.push(fallback2);
      Logger.debugModule('actionDeck', `Карта 2 (fallback): ${fallback2.id}`);
    }

    // Применяем diminishing returns к каждой карте
    const cardsWithEffects = selectedCards.map(card =>
      this._applyDiminishingReturns(card, clientId)
    );

    Logger.debugModule('actionDeck', `Сгенерировано карт: ${cardsWithEffects.length}`);
    return cardsWithEffects;
  }

  /**
   * Определить текущую фазу клиента по arousal
   */
  _getCurrentPhase(arousal) {
    if (arousal < 0) return 'soft';
    if (arousal < 25) return 'interested';
    if (arousal < 50) return 'excited';
    if (arousal < 75) return 'ready';
    if (arousal < 95) return 'edge';
    return 'climax';
  }

  /**
   * Получить гарантированную карту "Осмотреть" на 1-2 ходу
   * @param {Array} availableActions - Доступные действия
   * @param {number} turnNumber - Номер хода
   * @returns {Object|null} Карта осмотра или null
   */
  _getGuaranteedInspectCard(availableActions, turnNumber) {
    // Гарантируем карту "Осмотреть" только на 1-2 ходу
    if (turnNumber > 2) {
      return null;
    }

    // Проверяем есть ли уже карта осмотра в выбранных
    const actions = this.actionsPool?.actions || {};
    const inspectCard = actions['inspect_client'];

    if (!inspectCard) {
      return null;  // Нет карты в пуле
    }

    // Проверяем что карта доступна игроку (нет требований)
    if (inspectCard.skillRequirement) {
      const { skill, level } = inspectCard.skillRequirement;
      const skillData = this.skillSystem?.getSkill?.(skill);
      if (!skillData || skillData.level < level) {
        return null;  // Навык не соответствует
      }
    }

    // Возвращаем карту осмотра с применёнными diminishing returns
    return { ...inspectCard, id: 'inspect_client' };
  }

  /**
   * Получить доступные действия с учётом навыков и предметов
   */
  _getAvailableActions(player, skillSystem, currentPhase) {
    const available = [];
    const actions = this.actionsPool?.actions || {};

    // Уровень игрока для ограничений
    const playerLevel = player.stats?.level || 1;

    for (const [actionId, actionData] of Object.entries(actions)) {
      // Проверка: не заблокировано ли из-за частого использования
      if (this.currentClientUsage[actionId] >= this.maxActionUsagePerClient) {
        continue;
      }

      // Проверка требования навыка
      if (actionData.skillRequirement) {
        const { skill, level } = actionData.skillRequirement;
        const skillData = skillSystem.getSkill(skill);
        if (!skillData || skillData.level < level) {
          continue;  // Навык не соответствует
        }
      }

      // Проверка требования предмета (если есть)
      if (actionData.itemRequirement && actionData.itemRequirement.length > 0) {
        // player.inventory не существует, используем inventorySystem если передан
        // Или проверяем player.items (устаревшее)
        const playerItems = player.items || player.inventory || [];
        const hasItem = actionData.itemRequirement.some(itemId =>
          playerItems.includes(itemId)
        );
        if (!hasItem) {
          continue;  // Нет нужного предмета
        }
      }

      // Ограничение special карт для низких уровней
      if (actionData.intensity === 'special' && playerLevel < 5) {
        // Special карты доступны только с 5 уровня
        continue;
      }

      // Ограничение intense карт для очень низких уровней
      if (actionData.intensity === 'intense' && playerLevel < 3) {
        // Intense карты доступны только с 3 уровня
        continue;
      }

      // Проверка доступности по фазе
      if (actionData.phaseAvailability && !actionData.phaseAvailability.includes(currentPhase)) {
        // Фаза не подходит для этой карты
        continue;
      }

      available.push({ ...actionData, id: actionId });
    }

    // Гарантируем минимум 3 действия в пуле
    if (available.length < 3) {
      for (const fallbackId of this.fallbackCards) {
        if (!available.find(a => a.id === fallbackId)) {
          const fallbackData = actions[fallbackId];
          if (fallbackData) {
            available.push({ ...fallbackData, id: fallbackId });
          }
        }
        if (available.length >= 3) break;
      }
    }

    return available;
  }

  /**
   * Выбрать карту под текущую фазу
   */
  _selectPhaseCard(availableActions, currentPhase, skillSystem) {
    // Фильтруем карты по интенсивности, подходящей для фазы
    const phaseIntensities = this._getIntensitiesForPhase(currentPhase);
    
    const suitableCards = availableActions.filter(action => 
      phaseIntensities.includes(action.intensity)
    );
    
    if (suitableCards.length === 0) {
      // Пробуем соседние интенсивности
      const neighborIntensities = [];
      for (const intensity of phaseIntensities) {
        const neighbors = this.neighborIntensities[intensity] || [];
        neighborIntensities.push(...neighbors);
      }
      
      const neighborCards = availableActions.filter(action =>
        neighborIntensities.includes(action.intensity)
      );
      
      if (neighborCards.length > 0) {
        return this._weightedRandom(neighborCards, skillSystem);
      }
      
      return null;
    }
    
    return this._weightedRandom(suitableCards, skillSystem);
  }

  /**
   * Получить интенсивности для фазы
   */
  _getIntensitiesForPhase(phase) {
    const phaseIntensityMap = {
      'soft': ['soft'],
      'interested': ['soft', 'mid'],
      'excited': ['soft', 'mid', 'intense'],
      'ready': ['soft', 'mid', 'intense', 'special'],
      'edge': ['soft', 'mid', 'intense', 'special'],
      'climax': ['special']
    };
    return phaseIntensityMap[phase] || ['soft'];
  }

  /**
   * Выбрать случайную карту (не совпадающую с уже выбранными)
   */
  _selectRandomCard(availableActions, alreadySelected) {
    const selectedIds = new Set(alreadySelected.map(c => c.id));
    const remaining = availableActions.filter(a => !selectedIds.has(a.id));
    
    if (remaining.length === 0) return null;
    
    const randomIndex = Math.floor(Math.random() * remaining.length);
    return remaining[randomIndex];
  }

  /**
   * "Одолжить" базовую карту если у игрока нет доступа
   */
  _lendFallbackCard(currentPhase, excludeId = null) {
    const actions = this.actionsPool?.actions || {};
    
    for (const fallbackId of this.fallbackCards) {
      if (fallbackId === excludeId) continue;
      
      const fallbackData = actions[fallbackId];
      if (fallbackData) {
        return {
          ...fallbackData,
          id: fallbackId,
          _isLent: true  // Пометка что карта "одолжена"
        };
      }
    }
    
    // Если все fallback не подошли, берём первую soft карту
    for (const [actionId, actionData] of Object.entries(actions)) {
      if (actionData.intensity === 'soft' && actionId !== excludeId) {
        return { ...actionData, id: actionId, _isLent: true };
      }
    }
    
    // Совсем критично — возвращаем любую карту
    const firstAction = Object.entries(actions)[0];
    if (firstAction) {
      return { ...firstAction[1], id: firstAction[0], _isLent: true };
    }
    
    return null;
  }

  /**
   * Получить fallback карты
   */
  _getFallbackCards(count, currentPhase) {
    const cards = [];
    for (let i = 0; i < count; i++) {
      const card = this._lendFallbackCard(currentPhase, cards[cards.length - 1]?.id);
      if (card) cards.push(card);
    }
    return cards;
  }

  /**
   * Взвешенный случайный выбор с учётом навыков
   */
  _weightedRandom(actions, skillSystem) {
    if (actions.length === 0) return null;
    if (actions.length === 1) return actions[0];
    
    const weightedActions = actions.map(action => {
      let weight = 1.0;
      
      // Бонус за соответствие навыку игрока
      if (action.skillRequirement) {
        const { skill, level } = action.skillRequirement;
        const skillData = skillSystem.getSkill(skill);
        if (skillData && skillData.level > level) {
          weight += (skillData.level - level) * 0.1;  // +10% за каждый уровень сверх
        }
      }
      
      // Бонус за низкую стоимость стамины (игрок предпочитает экономить)
      weight += (20 - (action.effects?.stamina || 20)) * 0.02;
      
      // Рандомизация
      weight *= (0.8 + Math.random() * 0.4);
      
      return { action, weight };
    });
    
    const totalWeight = weightedActions.reduce((sum, item) => sum + item.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const { action, weight } of weightedActions) {
      random -= weight;
      if (random <= 0) {
        return action;
      }
    }
    
    return weightedActions[0].action;
  }

  /**
   * Применить diminishing returns к карте
   */
  _applyDiminishingReturns(card, clientId) {
    const usageCount = this.currentClientUsage[card.id] || 0;

    // Используем множители из balance.json (через combatRules)
    const diminishingData = this.combatRules?.diminishingReturns || {
      consecutive1: 1.0,
      consecutive2: 0.92,
      consecutive3: 0.82,
      consecutive4Plus: 0.70
    };

    let multiplier = 1.0;
    if (usageCount === 0) {
      multiplier = diminishingData.consecutive1;  // 1.0 (первое использование)
    } else if (usageCount === 1) {
      multiplier = diminishingData.consecutive2;  // 0.92 (2-е использование)
    } else if (usageCount === 2) {
      multiplier = diminishingData.consecutive3;  // 0.82 (3-е использование)
    } else {
      multiplier = diminishingData.consecutive4Plus;  // 0.70 (4+ использование)
    }

    // Применяем множитель к arousal gain
    const baseArousal = card.effects?.arousal || 0;
    const modifiedArousal = Math.floor(baseArousal * multiplier);

    return {
      ...card,
      effects: {
        ...card.effects,
        arousal: modifiedArousal
      },
      diminishingMultiplier: multiplier,
      consecutiveCount: usageCount + 1
    };
  }

  /**
   * Записать использование карты (для diminishing returns)
   */
  recordActionUsage(actionId) {
    if (!this.currentClientUsage[actionId]) {
      this.currentClientUsage[actionId] = 0;
    }
    this.currentClientUsage[actionId]++;
    this.actionHistory.push(actionId);
    
    // Ограничиваем историю
    if (this.actionHistory.length > 20) {
      this.actionHistory.shift();
    }
  }

  /**
   * Добавить действие в историю (алиас для совместимости)
   */
  addToHistory(actionId, clientId = null, arousalPhase = null) {
    this.recordActionUsage(actionId);
  }

  /**
   * Смена фазы arousal (сброс inspect для старой фазы)
   */
  onArousalPhaseChanged(clientId, oldPhase, newPhase) {
    // Сбрасываем использование inspect для старой фазы
    Logger.debugModule('actionDeck', `Смена фазы: ${oldPhase} → ${newPhase}`);
  }

  /**
   * Сбросить отслеживание для нового клиента
   */
  resetForNewClient(clientId) {
    this.currentClientUsage = {};
    Logger.debugModule('actionDeck', `Сброс для нового клиента: ${clientId}`);
  }

  /**
   * Сбросить отслеживание для клиента (алиас для совместимости)
   */
  resetClientUsage(clientId) {
    this.resetForNewClient(clientId);
  }

  /**
   * Полностью сбросить историю
   */
  resetHistory() {
    this.actionHistory = [];
    this.currentClientUsage = {};
  }

  /**
   * Рассчитать шанс успеха для карты
   * @param {Object} card - Карта действия
   * @param {Object} client - Данные клиента
   * @param {Object} player - Данные игрока
   * @param {Object} skillSystem - SkillSystem
   * @returns {number} Шанс успеха (0-1)
   */
  calculateSuccessChance(card, client, player, skillSystem) {
    const baseChance = card.successChance || 0.5;

    // Бонус от навыка
    let skillBonus = 0;
    if (card.category && this.categoryToSkill[card.category]) {
      const skillId = this.categoryToSkill[card.category];
      const skillData = skillSystem.getSkill(skillId);
      if (skillData) {
        skillBonus = skillData.level * 0.05;  // +5% за уровень
      }
    }

    // Бонус от внешности
    const appearance = skillSystem.getSkill('appearance');
    const appearanceBonus = appearance ? appearance.level * 0.02 : 0;

    // Штраф за повторяющиеся действия (из balance.json)
    const usageCount = this.currentClientUsage[card.id] || 0;
    const diminishingData = this.combatRules?.diminishingReturns || {
      consecutive1: 1.0,
      consecutive2: 0.92,
      consecutive3: 0.82,
      consecutive4Plus: 0.70
    };

    // Конвертируем множители в штрафы (1.0 - multiplier = penalty)
    let diminishingPenalty = 0;
    if (usageCount === 0) {
      diminishingPenalty = 0;  // Нет штрафа за первое использование
    } else if (usageCount === 1) {
      diminishingPenalty = 1 - diminishingData.consecutive2;  // 0.08
    } else if (usageCount === 2) {
      diminishingPenalty = 1 - diminishingData.consecutive3;  // 0.18
    } else {
      diminishingPenalty = 1 - diminishingData.consecutive4Plus;  // 0.30
    }

    // Итоговый шанс
    let finalChance = baseChance + skillBonus + appearanceBonus - diminishingPenalty;

    // Кап
    finalChance = Math.max(0.10, Math.min(0.95, finalChance));

    return finalChance;
  }

  /**
   * Рассчитать результат действия
   * @param {Object} card - Карта действия
   * @param {Object} client - Данные клиента
   * @param {Object} player - Данные игрока
   * @param {Object} skillSystem - SkillSystem
   * @returns {Object} Результат действия
   */
  calculateResult(card, client, player, skillSystem) {
    const successChance = this.calculateSuccessChance(card, client, player, skillSystem);
    const roll = Math.random();
    const isSuccess = roll <= successChance;
    
    // Расчёт эффектов
    const effects = { ...card.effects };
    
    if (!isSuccess) {
      // При неудаче: -50% эффект, возможен регресс arousal
      effects.arousal = Math.floor(effects.arousal * 0.5);
      
      // Шанс регресса (gets_softer)
      if (roll < successChance * 0.5 && effects.arousal > 0) {
        effects.arousal = -Math.floor(Math.abs(effects.arousal) * 0.3);
        effects.getsSofter = true;
      }
    }
    
    return {
      success: isSuccess,
      actionId: card.id,
      actionName: card.name,
      chance: successChance,
      roll,
      effects,
      getsSofter: effects.getsSofter || false
    };
  }

  /**
   * Получить иконку интенсивности
   */
  getIntensityIcon(intensity) {
    const icons = {
      'soft': '🩶',
      'mid': '🟢',
      'intense': '🔥',
      'special': '⭐'
    };
    return icons[intensity] || intensity;
  }

  /**
   * Получить цвет интенсивности
   */
  getIntensityColor(intensity) {
    const colors = {
      'soft': '#6b7280',
      'mid': '#22c55e',
      'intense': '#ef4444',
      'special': '#fbbf24'
    };
    return colors[intensity] || '#9ca3af';
  }
}

export default ActionDeckSystem;

/**
 * EventSystem — Система контекстных событий
 * Концепт от 15.03: "События должны иметь условия появления"
 *
 * События происходят не случайно, а при выполнении условий:
 * - minTension: минимальное напряжение сцены
 * - minTrust: минимальное доверие
 * - requiredTrait: требуемая черта клиента
 * - minMood: минимальное настроение
 * - turnRange: диапазон ходов
 * - requiredTag: требуемый тег действия в истории
 *
 * КОНТЕНТ: Условия событий в data/events.json (поле conditions)
 */

class EventSystem {
  constructor() {
    // Базовые настройки
    this.baseEventChance = 0.20;  // 20% базовый шанс события

    // Приоритеты условий (все должны выполняться)
    this.conditionTypes = [
      'minTension',
      'maxTension',
      'minTrust',
      'maxTrust',
      'requiredTrait',
      'forbiddenTrait',
      'minMood',
      'maxMood',
      'minArousal',
      'maxArousal',
      'turnRange',
      'requiredTag',
      'forbiddenTag',
      'minReputation',
      'maxReputation',
      'requiredSkill',
      'timeRange'
    ];
  }

  /**
   * Проверить, должно ли произойти событие
   * @param {Object} event - Данные события
   * @param {Object} context - Контекст игры
   * @returns {Object} Результат проверки
   */
  checkEvent(event, context) {
    if (!event || !event.conditions) {
      // Если условий нет, используем базовый шанс
      return {
        canTrigger: Math.random() < this.baseEventChance,
        reason: 'no_conditions',
        matchedConditions: [],
        failedConditions: []
      };
    }

    const conditions = event.conditions;
    const matchedConditions = [];
    const failedConditions = [];

    // Проверка каждого условия
    for (const conditionType of this.conditionTypes) {
      if (conditions.hasOwnProperty(conditionType)) {
        const conditionValue = conditions[conditionType];
        const passed = this._checkCondition(
          conditionType,
          conditionValue,
          context
        );

        if (passed) {
          matchedConditions.push({
            type: conditionType,
            value: conditionValue
          });
        } else {
          failedConditions.push({
            type: conditionType,
            value: conditionValue,
            reason: this._getFailReason(conditionType, conditionValue, context)
          });
        }
      }
    }

    // Событие происходит, если ВСЕ условия выполнены
    const canTrigger = failedConditions.length === 0;

    return {
      canTrigger,
      reason: canTrigger ? 'all_conditions_met' : 'conditions_failed',
      matchedConditions,
      failedConditions,
      matchPercent: this._calculateMatchPercent(matchedConditions, failedConditions)
    };
  }

  /**
   * Проверить отдельное условие
   * @private
   */
  _checkCondition(type, value, context) {
    switch (type) {
      case 'minTension':
        return (context.edgeTension || 0) >= value;

      case 'maxTension':
        return (context.edgeTension || 0) <= value;

      case 'minTrust':
        return (context.trustState?.current || 0) >= value;

      case 'maxTrust':
        return (context.trustState?.current || 0) <= value;

      case 'requiredTrait':
        return context.clientTraits?.includes(value);

      case 'forbiddenTrait':
        return !context.clientTraits?.includes(value);

      case 'minMood':
        return (context.moodState?.score || 0) >= value;

      case 'maxMood':
        return (context.moodState?.score || 0) <= value;

      case 'minArousal':
        return (context.clientArousal || 0) >= value;

      case 'maxArousal':
        return (context.clientArousal || 0) <= value;

      case 'turnRange':
        const turn = context.turn || 0;
        return turn >= value.min && turn <= value.max;

      case 'requiredTag':
        return context.actionHistory?.some(tag => tag === value);

      case 'forbiddenTag':
        return !context.actionHistory?.some(tag => tag === value);

      case 'minReputation':
        return (context.reputation || 0) >= value;

      case 'maxReputation':
        return (context.reputation || 0) <= value;

      case 'requiredSkill':
        const skillLevel = context.playerSkills?.[value.skill] || 0;
        return skillLevel >= value.level;

      case 'timeRange':
        const time = context.time || 0;  // Время в ходах от начала ночи
        return time >= value.min && time <= value.max;

      default:
        console.warn(`[EventSystem] Неизвестный тип условия: ${type}`);
        return false;
    }
  }

  /**
   * Получить причину провала условия
   * @private
   */
  _getFailReason(type, value, context) {
    switch (type) {
      case 'minTension':
        return `Напряжение ${context.edgeTension || 0} < ${value}`;
      case 'maxTension':
        return `Напряжение ${context.edgeTension || 0} > ${value}`;
      case 'minTrust':
        return `Доверие ${context.trustState?.current || 0} < ${value}`;
      case 'maxTrust':
        return `Доверие ${context.trustState?.current || 0} > ${value}`;
      case 'requiredTrait':
        return `Нет черты "${value}"`;
      case 'forbiddenTrait':
        return `Есть черта "${value}"`;
      case 'minMood':
        return `Настроение ${context.moodState?.score || 0} < ${value}`;
      case 'maxMood':
        return `Настроение ${context.moodState?.score || 0} > ${value}`;
      case 'minArousal':
        return `Возбуждение ${context.clientArousal || 0} < ${value}`;
      case 'maxArousal':
        return `Возбуждение ${context.clientArousal || 0} > ${value}`;
      case 'turnRange':
        return `Ход ${context.turn || 0} вне диапазона [${value.min}, ${value.max}]`;
      case 'requiredTag':
        return `Нет действия "${value}" в истории`;
      case 'forbiddenTag':
        return `Было действие "${value}" в истории`;
      case 'minReputation':
        return `Репутация ${context.reputation || 0} < ${value}`;
      case 'maxReputation':
        return `Репутация ${context.reputation || 0} > ${value}`;
      case 'requiredSkill':
        return `Навык ${value.skill} < ${value.level}`;
      case 'timeRange':
        return `Время ${context.time || 0} вне диапазона`;
      default:
        return 'Неизвестная причина';
    }
  }

  /**
   * Рассчитать процент совпадения условий
   * @private
   */
  _calculateMatchPercent(matched, failed) {
    const total = matched.length + failed.length;
    if (total === 0) return 100;
    return Math.round((matched.length / total) * 100);
  }

  /**
   * Выбрать событие из списка с учётом условий
   * @param {Array} events - Список событий
   * @param {Object} context - Контекст игры
   * @returns {Object|null} Выбранное событие или null
   */
  selectEvent(events, context) {
    // Фильтруем события по условиям
    const availableEvents = events.filter(event => {
      const result = this.checkEvent(event, context);
      return result.canTrigger;
    });

    if (availableEvents.length === 0) {
      return null;
    }

    // Выбираем с учётом веса
    const totalWeight = availableEvents.reduce(
      (sum, event) => sum + (event.weight || 1),
      0
    );
    let random = Math.random() * totalWeight;

    for (const event of availableEvents) {
      random -= (event.weight || 1);
      if (random <= 0) {
        return event;
      }
    }

    return availableEvents[availableEvents.length - 1];
  }

  /**
   * Получить контекст из GameEngine для проверки событий
   * @param {Object} gameEngine - GameEngine
   * @returns {Object} Контекст
   */
  createContextFromEngine(gameEngine) {
    const client = gameEngine.currentCard?.clientData || {};
    const trustState = gameEngine.currentCard?.trustState || null;
    const moodState = gameEngine.currentCard?.moodState || null;

    return {
      edgeTension: gameEngine.edgeTension || 0,
      tensionLevel: gameEngine.tensionLevel || 0,
      trustState,
      clientTraits: client.traits || [],
      moodState,
      clientArousal: client.arousal || 0,
      turn: gameEngine.timeSystem?.currentTurn || 0,
      actionHistory: gameEngine.actionHistory || [],
      reputation: gameEngine.reputationSystem?.reputation || 0,
      playerSkills: gameEngine.skillSystem?.getAllSkills() || {},
      time: gameEngine.timeSystem?.getTurnsPlayed?.() || gameEngine.timeSystem?.currentTurn || 0
    };
  }

  /**
   * Проверить событие между клиентами
   * @param {Array} events - Список событий
   * @param {Object} context - Контекст
   * @returns {Object|null} Событие или null
   */
  checkBetweenClientsEvent(events, context) {
    // Фильтруем по timing
    const betweenEvents = events.filter(
      event => event.timing === 'between_clients'
    );

    return this.selectEvent(betweenEvents, context);
  }

  /**
   * Проверить событие во время interaction
   * @param {Array} events - Список событий
   * @param {Object} context - Контекст
   * @returns {Object|null} Событие или null
   */
  checkDuringInteractionEvent(events, context) {
    // Фильтруем по timing
    const duringEvents = events.filter(
      event => event.timing === 'during_interaction'
    );

    if (duringEvents.length === 0) return null;

    // Шанс события во время interaction (10-15%)
    if (Math.random() > 0.12) {
      return null;
    }

    return this.selectEvent(duringEvents, context);
  }

  /**
   * Получить все условия для события (для UI/отладки)
   * @param {Object} event - Данные события
   * @returns {Array} Список условий
   */
  getEventConditions(event) {
    if (!event || !event.conditions) {
      return [];
    }

    const conditions = [];
    for (const [type, value] of Object.entries(event.conditions)) {
      conditions.push({
        type,
        value,
        description: this._getConditionDescription(type, value)
      });
    }

    return conditions;
  }

  /**
   * Получить описание условия
   * @private
   */
  _getConditionDescription(type, value) {
    const descriptions = {
      minTension: `Напряжение >= ${value}`,
      maxTension: `Напряжение <= ${value}`,
      minTrust: `Доверие >= ${value}`,
      maxTrust: `Доверие <= ${value}`,
      requiredTrait: `Черта: ${value}`,
      forbiddenTrait: `Без черты: ${value}`,
      minMood: `Настроение >= ${value}`,
      maxMood: `Настроение <= ${value}`,
      minArousal: `Возбуждение >= ${value}`,
      maxArousal: `Возбуждение <= ${value}`,
      turnRange: `Ходы [${value.min}, ${value.max}]`,
      requiredTag: `Действие: ${value}`,
      forbiddenTag: `Без действия: ${value}`,
      minReputation: `Репутация >= ${value}`,
      maxReputation: `Репутация <= ${value}`,
      requiredSkill: `Навык ${value.skill} >= ${value.level}`,
      timeRange: `Время [${value.min}, ${value.max}]`
    };

    return descriptions[type] || `${type}: ${value}`;
  }
}

export default EventSystem;

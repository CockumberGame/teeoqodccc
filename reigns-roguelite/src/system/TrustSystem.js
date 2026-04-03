/**
 * TrustSystem — Система доверия и дистанции между игроком и персонажем
 * Концепт от 15.03: "уровень доверия или дистанции между сторонами"
 *
 * Доверие влияет на:
 * - Доступные действия (открываются на порогах 25/50/75/100)
 * - Множитель награды
 * - Шанс возврата клиента
 * - Реакции на действия (бонусы/штрафы)
 *
 * КОНТЕНТ: Текстовые описания уровней доверия в src/data/content/trust_levels.json
 */

class TrustSystem {
  constructor() {
    // Базовые настройки
    this.defaultTrust = 50;  // Стартовое доверие (нейтральное)
    this.minTrust = 0;
    this.maxTrust = 100;

    // Пороги доверия (открывают новые действия)
    this.trustThresholds = [0, 25, 50, 75, 100];

    // Загрузка контента (если есть)
    this.trustData = this._loadTrustData();
  }

  /**
   * Загрузить данные о доверии (контент из JSON)
   * @private
   */
  _loadTrustData() {
    // Заглушка — контент загружается из src/data/content/trust_levels.json
    // Вы можете заполнить этот файл самостоятельно
    return {
      levels: [
        { threshold: 0, name: 'Незнакомец', description: 'Первая встреча' },
        { threshold: 25, name: 'Знакомый', description: 'Начинает доверять' },
        { threshold: 50, name: 'Проверенный', description: 'Доверяет вам' },
        { threshold: 75, name: 'Любимый', description: 'Особое отношение' },
        { threshold: 100, name: 'Постоянный', description: 'Полное доверие' }
      ],
      bonuses: [
        { threshold: 0, rewardMultiplier: 1.0, returnChance: 0.2 },
        { threshold: 25, rewardMultiplier: 1.1, returnChance: 0.35 },
        { threshold: 50, rewardMultiplier: 1.25, returnChance: 0.5 },
        { threshold: 75, rewardMultiplier: 1.4, returnChance: 0.7 },
        { threshold: 100, rewardMultiplier: 1.6, returnChance: 0.9 }
      ]
    };
  }

  /**
   * Создать состояние доверия для новой сцены
   * @param {Object} client - Данные клиента
   * @param {number} baseTrust - Базовое доверие (из репутации или прошлого)
   * @returns {Object} Состояние доверия
   */
  createTrustState(client, baseTrust = null) {
    // Для повторного клиента — высокое стартовое доверие
    if (client.isReturning) {
      baseTrust = 60 + (client.visitCount * 5);  // +5 за каждый визит
    } else if (baseTrust === null) {
      // Новый клиент = 0 доверия (Незнакомец)
      baseTrust = 0;
    }

    // Используем базовое или значение по умолчанию
    const initialTrust = baseTrust !== null ? baseTrust : this.defaultTrust;

    return {
      current: this.clamp(initialTrust),
      previous: initialTrust,
      history: [],  // История изменений для отладки
      level: this.getTrustLevel(initialTrust),
      isReturning: client.isReturning || false,
      visitCount: client.visitCount || 0
    };
  }

  /**
   * Изменить доверие (положительно или отрицательно)
   * @param {Object} trustState - Состояние доверия
   * @param {number} change - Изменение (+/-)
   * @param {string} reason - Причина изменения (для отладки)
   * @returns {Object} Результат изменения
   */
  modifyTrust(trustState, change, reason = 'unknown') {
    const oldTrust = trustState.current;
    const oldLevel = trustState.level;

    // Применяем изменение
    trustState.previous = oldTrust;
    trustState.current = this.clamp(oldTrust + change);
    trustState.level = this.getTrustLevel(trustState.current);

    // Записываем в историю
    trustState.history.push({
      change,
      reason,
      from: oldTrust,
      to: trustState.current,
      timestamp: Date.now()
    });

    // Проверка: достигнут ли новый порог
    const newThresholdReached = trustState.level.threshold > oldLevel.threshold;

    return {
      oldTrust,
      newTrust: trustState.current,
      change,
      reason,
      oldLevel: oldLevel.name,
      newLevel: trustState.level.name,
      thresholdReached: newThresholdReached,
      bonus: this.getTrustBonus(trustState.current)
    };
  }

  /**
   * Получить уровень доверия по значению
   * @param {number} trust - Значение доверия (0-100)
   * @returns {Object} Данные уровня
   */
  getTrustLevel(trust) {
    const clamped = this.clamp(trust);

    // Находим подходящий уровень
    for (let i = this.trustData.levels.length - 1; i >= 0; i--) {
      const level = this.trustData.levels[i];
      if (clamped >= level.threshold) {
        return {
          threshold: level.threshold,
          name: level.name,
          description: level.description,
          index: i
        };
      }
    }

    return this.trustData.levels[0];
  }

  /**
   * Получить бонусы от доверия
   * @param {number} trust - Значение доверия
   * @returns {Object} Бонусы (множитель награды, шанс возврата)
   */
  getTrustBonus(trust) {
    const clamped = this.clamp(trust);

    // Находим подходящий бонус
    for (let i = this.trustData.bonuses.length - 1; i >= 0; i--) {
      const bonus = this.trustData.bonuses[i];
      if (clamped >= bonus.threshold) {
        return {
          rewardMultiplier: bonus.rewardMultiplier,
          returnChance: bonus.returnChance,
          satisfactionBonus: Math.floor((clamped / 100) * 15)  // 0-15 бонус к удовлетворённости
        };
      }
    }

    return {
      rewardMultiplier: 1.0,
      returnChance: 0.2,
      satisfactionBonus: 0
    };
  }

  /**
   * Получить множитель награды
   * @param {number} trust - Значение доверия
   * @returns {number} Множитель (1.0-1.6)
   */
  getRewardMultiplier(trust) {
    return this.getTrustBonus(trust).rewardMultiplier;
  }

  /**
   * Получить шанс возврата клиента
   * @param {number} trust - Значение доверия
   * @returns {number} Шанс (0.2-0.9)
   */
  getReturnChance(trust) {
    return this.getTrustBonus(trust).returnChance;
  }

  /**
   * Проверить, открыто ли действие на данном уровне доверия
   * @param {Object} trustState - Состояние доверия
   * @param {number} requiredTrust - Требуемый порог доверия
   * @returns {boolean} Открыто ли действие
   */
  isActionUnlocked(trustState, requiredTrust) {
    return trustState.current >= requiredTrust;
  }

  /**
   * Получить доступные пулы действий для текущего уровня доверия
   * @param {Object} trustState - Состояние доверия
   * @returns {Array} Доступные пулы (например, ['basic', 'intimate', 'deep'])
   */
  getAvailableActionPools(trustState) {
    const pools = ['basic'];  // Базовые действия всегда доступны

    if (trustState.current >= 25) {
      pools.push('friendly');
    }
    if (trustState.current >= 50) {
      pools.push('intimate');
    }
    if (trustState.current >= 75) {
      pools.push('deep');
    }
    if (trustState.current >= 100) {
      pools.push('special');
    }

    return pools;
  }

  /**
   * Ограничить значение доверия диапазоном [0, 100]
   * @param {number} value - Значение
   * @returns {number} Ограниченное значение
   */
  clamp(value) {
    return Math.max(this.minTrust, Math.min(this.maxTrust, value));
  }

  /**
   * Сбросить состояние доверия
   * @param {Object} trustState - Состояние доверия
   */
  reset(trustState) {
    trustState.current = this.defaultTrust;
    trustState.previous = this.defaultTrust;
    trustState.history = [];
    trustState.level = this.getTrustLevel(this.defaultTrust);
  }

  /**
   * Получить сводку состояния (для UI или отладки)
   * @param {Object} trustState - Состояние доверия
   * @returns {Object} Сводка
   */
  getSummary(trustState) {
    const bonus = this.getTrustBonus(trustState.current);

    return {
      current: trustState.current,
      level: trustState.level.name,
      description: trustState.level.description,
      rewardMultiplier: bonus.rewardMultiplier,
      returnChance: bonus.returnChance,
      availablePools: this.getAvailableActionPools(trustState),
      history: trustState.history.slice(-5)  // Последние 5 изменений
    };
  }
}

export default TrustSystem;

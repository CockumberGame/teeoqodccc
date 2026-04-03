/**
 * PatienceSystem - Система терпения клиентов в очереди
 * Gloryhole Quest - Управляет параметром patience_waiting (0-100) для ожидающих клиентов
 *
 * Механика:
 * - У каждого клиента в очереди: patience_waiting = 100
 * - Каждый ход interaction: patience_waiting -= 5-10
 * - Если patience_waiting <= 0: клиент получает модификатор impatient или annoyed
 * - Награда -20%, шанс ошибки +15%
 *
 * Этап 2: Улучшение геймплея (16.03.2026)
 */

class PatienceSystem {
  constructor() {
    // Базовые параметры
    this.basePatience = 100;
    this.minPatience = 0;
    this.maxPatience = 100;

    // Пороги состояний
    this.thresholds = {
      impatient: 50,   // < 50: нетерпеливый
      annoyed: 25,     // < 25: раздражённый
      leaving: 0       // = 0: уходит
    };

    // Уменьшение терпения за ход (5-10)
    this.patienceDecay = {
      min: 5,
      max: 10
    };

    // Модификаторы от типов клиентов
    this.typeModifiers = {
      newbie: 1.2,      // Новички более терпеливы
      regular: 1.0,     // Обычные
      generous: 1.3,    // Щедрые очень терпеливы
      demanding: 0.6,   // Требовательные нетерпеливы
      vip: 0.5          // VIP очень нетерпеливы
    };

    // Модификаторы от черт (traits)
    this.traitModifiers = {
      impatient: 0.5,   // -50% к терпению
      shy: 1.1,         // +10% (скромные ждут)
      curious: 0.9,     // -10% (любознательные торопятся)
      loyal: 1.4,       // +40% (преданные ждут долго)
      demanding: 0.6,   // -40% (требовательные)
      generous: 1.2     // +20% (щедрые терпеливее)
    };

    // Модификаторы от модификаторов клиента
    this.modifierEffects = {
      impatient: { decayMultiplier: 1.5, rewardPenalty: 0.2 },
      wealthy: { decayMultiplier: 0.9, rewardBonus: 0.5 },
      generous: { decayMultiplier: 0.7, rewardBonus: 0.2 },
      demanding: { decayMultiplier: 1.3, rewardBonus: 0.2 }
    };
  }

  /**
   * Инициализация терпения для нового клиента в очереди
   * @param {Object} client - Данные клиента
   * @returns {Object} Объект терпения
   */
  initPatience(client) {
    const typeMod = this.typeModifiers[client.type?.id] || 1.0;

    // Считаем модификаторы от traits
    let traitMod = 1.0;
    if (client.traits && Array.isArray(client.traits)) {
      client.traits.forEach(trait => {
        traitMod *= (this.traitModifiers[trait] || 1.0);
      });
    }

    // Считаем модификаторы от modifier'ов клиента
    let modifierMod = 1.0;
    if (client.modifiers && Array.isArray(client.modifiers)) {
      client.modifiers.forEach(mod => {
        const modEffect = this.modifierEffects[mod];
        if (modEffect) {
          modifierMod *= (modEffect.decayMultiplier || 1.0);
        }
      });
    }

    // Итоговое терпение
    const patience = Math.floor(this.basePatience * typeMod * traitMod * modifierMod);

    return {
      current: Math.min(this.maxPatience, Math.max(this.minPatience, patience)),
      max: Math.min(this.maxPatience, Math.max(this.minPatience, patience)),
      decayRate: 1.0,
      turnCount: 0,
      hasDebuff: false  // Флаг применённого дебафа
    };
  }

  /**
   * Уменьшение терпения каждый ход interaction
   * @param {Object} client - Клиент в очереди
   * @param {number} turn - Номер хода
   * @returns {Object} Результат тика
   */
  tick(client, turn = 0) {
    if (!client.patienceState) {
      client.patienceState = this.initPatience(client);
    }

    const patience = client.patienceState;

    if (patience.current <= this.minPatience) {
      return {
        remaining: 0,
        decay: 0,
        state: 'leaving',
        clientLeaves: true,
        shouldApplyDebuff: !patience.hasDebuff
      };
    }

    // Определяем уменьшение (5-10)
    const baseDecay = Math.floor(
      Math.random() * (this.patienceDecay.max - this.patienceDecay.min) + this.patienceDecay.min
    );

    // Применяем модификаторы
    const decay = Math.floor(baseDecay * patience.decayRate);

    // Уменьшаем терпение
    const oldPatience = patience.current;
    patience.current = Math.max(this.minPatience, patience.current - decay);
    patience.turnCount = turn;

    // Определяем состояние
    const state = this.getPatienceState(patience);
    const clientLeaves = patience.current <= this.minPatience;
    const shouldApplyDebuff = !patience.hasDebuff && patience.current <= 0;

    if (shouldApplyDebuff) {
      patience.hasDebuff = true;
    }

    return {
      remaining: patience.current,
      decay,
      oldPatience,
      state,
      clientLeaves,
      shouldApplyDebuff,
      turnCount: patience.turnCount
    };
  }

  /**
   * Получить модификатор при patience <= 0
   * @param {Object} client - Клиент
   * @returns {Object} Модификаторы
   */
  getModifier(client) {
    if (!client.patienceState || client.patienceState.current > 0) {
      return {
        rewardMultiplier: 1.0,
        successChanceMod: 0,
        satisfactionMod: 0,
        hasDebuff: false
      };
    }

    // Клиент получил дебаф от ожидания
    // Награда -20%, шанс ошибки +15%
    return {
      rewardMultiplier: 0.8,      // -20% к награде
      successChanceMod: -0.15,    // +15% к шансу ошибки
      satisfactionMod: -10,       // -10 к удовлетворённости
      hasDebuff: true,
      debuffType: client.patienceState.current <= 0 ? 'impatient' : 'annoyed'
    };
  }

  /**
   * Применение дебафа клиенту при patience <= 0
   * @param {Object} client - Клиент
   * @returns {Object} Результат применения
   */
  applyPatienceDebuff(client) {
    if (!client.patienceState || client.patienceState.current > 0) {
      return { applied: false, reason: 'Patience ещё есть' };
    }

    if (client.patienceState.hasDebuff) {
      return { applied: false, reason: 'Дебаф уже применён' };
    }

    // Добавляем модификатор 'impatient' если его ещё нет
    if (!client.modifiers) {
      client.modifiers = [];
    }

    // Выбираем тип дебафа
    const debuffType = client.patienceState.current <= 0 ? 'impatient' : 'annoyed';

    if (!client.modifiers.includes(debuffType)) {
      client.modifiers.push(debuffType);
    }

    client.patienceState.hasDebuff = true;

    return {
      applied: true,
      debuffType,
      effects: {
        rewardMultiplier: 0.8,
        successChanceMod: -0.15,
        satisfactionMod: -10
      }
    };
  }

  /**
   * Получить состояние терпения
   * @param {Object} patience - Объект терпения
   * @returns {string} Состояние: 'calm', 'impatient', 'annoyed', 'leaving'
   */
  getPatienceState(patience) {
    if (!patience || patience.current <= this.minPatience) {
      return 'leaving';
    }
    if (patience.current < this.thresholds.annoyed) {
      return 'annoyed';
    }
    if (patience.current < this.thresholds.impatient) {
      return 'impatient';
    }
    return 'calm';
  }

  /**
   * Получить модификаторы от состояния терпения
   * @param {string} state - Состояние терпения
   * @returns {Object} Модификаторы к награде и шансам
   */
  getStateModifiers(state) {
    switch (state) {
      case 'calm':
        return {
          rewardMultiplier: 1.0,
          successChanceMod: 0,
          satisfactionMod: 0,
          description: 'Спокоен'
        };

      case 'impatient':
        return {
          rewardMultiplier: 0.85,  // -15% к награде
          successChanceMod: -0.05, // -5% к шансу успеха
          satisfactionMod: -5,     // -5 к удовлетворённости
          description: 'Нетерпелив'
        };

      case 'annoyed':
        return {
          rewardMultiplier: 0.7,   // -30% к награде
          successChanceMod: -0.15, // -15% к шансу успеха
          satisfactionMod: -15,    // -15 к удовлетворённости
          description: 'Раздражён'
        };

      case 'leaving':
        return {
          rewardMultiplier: 0,     // Никакой награды
          successChanceMod: -1.0,  // Невозможно обслужить
          satisfactionMod: -50,    // Сильный негатив
          description: 'Ушёл'
        };

      default:
        return {
          rewardMultiplier: 1.0,
          successChanceMod: 0,
          satisfactionMod: 0,
          description: 'Нормально'
        };
    }
  }

  /**
   * Увеличить терпение (бонус от действий)
   * @param {Object} patience - Объект терпения
   * @param {number} amount - Количество увеличения
   * @returns {number} Новое значение терпения
   */
  increasePatience(patience, amount) {
    if (!patience) return this.basePatience;

    patience.current = Math.min(this.maxPatience, patience.current + amount);
    return patience.current;
  }

  /**
   * Проверить, может ли клиент ещё ждать
   * @param {Object} patience - Объект терпения
   * @returns {boolean} Может ли ещё ждать
   */
  canWait(patience) {
    return patience && patience.current > this.minPatience;
  }

  /**
   * Получить текстовое описание состояния для UI
   * @param {Object} patience - Объект терпения
   * @returns {string} Описание для отображения
   */
  getDescription(patience) {
    const state = this.getPatienceState(patience);
    const percent = Math.round((patience.current / patience.max) * 100);

    const descriptions = {
      calm: `Спокоен и ждёт своей очереди (${percent}%)`,
      impatient: `Начинает нервничать от ожидания (${percent}%)`,
      annoyed: `Раздражён долгим ожиданием! (${percent}%)`,
      leaving: `Ушёл, не дождавшись!`
    };

    return descriptions[state] || `Терпение: ${percent}%`;
  }

  /**
   * Получить процент терпения для UI
   * @param {Object} patience - Объект терпения
   * @returns {number} Процент (0-100)
   */
  getPatiencePercent(patience) {
    if (!patience || !patience.max) return 0;
    return Math.round((patience.current / patience.max) * 100);
  }

  /**
   * Получить цвет для шкалы терпения
   * @param {Object} patience - Объект терпения
   * @returns {string} HEX цвет
   */
  getPatienceColor(patience) {
    if (!patience) return '#9ca3af';

    const percent = this.getPatiencePercent(patience);
    if (percent >= 50) return '#4ade80';  // Зелёный
    if (percent >= 25) return '#fbbf24';  // Жёлтый
    return '#ef4444';                      // Красный
  }

  /**
   * Сериализация для сохранения
   */
  serialize(patience) {
    if (!patience) return null;
    return {
      current: patience.current,
      max: patience.max,
      decayRate: patience.decayRate,
      turnCount: patience.turnCount,
      hasDebuff: patience.hasDebuff
    };
  }

  /**
   * Десериализация
   */
  deserialize(data) {
    if (!data) return this.initPatience({ type: {} });
    return {
      current: data.current || this.basePatience,
      max: data.max || this.basePatience,
      decayRate: data.decayRate || 1.0,
      turnCount: data.turnCount || 0,
      hasDebuff: data.hasDebuff || false
    };
  }
}

export default PatienceSystem;

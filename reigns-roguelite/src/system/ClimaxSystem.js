/**
 * ClimaxSystem — Система выбора исхода сцены (кульминация)
 * Концепт от 15.03: "В состоянии кульминации игрок получает специальные выборы"
 *
 * Когда arousal = 100:
 * - Игра переходит в фазу кульминации
 * - Игрок выбирает один из 2-3 вариантов исхода
 * - Каждый исход имеет разные последствия (награда, репутация, стресс, шанс возврата)
 *
 * КОНТЕНТ: Тексты вариантов и описания в src/data/content/climax_choices.json
 */

class ClimaxSystem {
  // Константа порога кульминации (синхронизировано с balance.json)
  static CLIMAX_THRESHOLD = 90;

  constructor() {
    // Типы исходов (базовые)
    this.outcomeTypes = {
      quick: {
        id: 'quick',
        name: 'Быстрый финал',
        description: 'Завершить быстро и интенсивно',
        baseReward: 1.0,
        baseStress: 5,
        baseSatisfaction: 60,
        returnChanceMod: -0.1
      },
      gentle: {
        id: 'gentle',
        name: 'Нежный финал',
        description: 'Завершить с лаской и заботой',
        baseReward: 1.2,
        baseStress: 3,
        baseSatisfaction: 80,
        returnChanceMod: 0.15
      },
      intense: {
        id: 'intense',
        name: 'Интенсивный финал',
        description: 'Максимальное удовольствие',
        baseReward: 1.4,
        baseStress: 8,
        baseSatisfaction: 90,
        returnChanceMod: 0.05
      },
      controlled: {
        id: 'controlled',
        name: 'Контролируемый финал',
        description: 'Держать ситуацию под контролем',
        baseReward: 1.3,
        baseStress: 4,
        baseSatisfaction: 75,
        returnChanceMod: 0.1
      },
      dominant: {
        id: 'dominant',
        name: 'Доминирующий финал',
        description: 'Взять контроль в свои руки',
        baseReward: 1.5,
        baseStress: 6,
        baseSatisfaction: 85,
        returnChanceMod: 0.0
      },
      submissive: {
        id: 'submissive',
        name: 'Покорный финал',
        description: 'Позволить клиенту вести',
        baseReward: 1.1,
        baseStress: 2,
        baseSatisfaction: 70,
        returnChanceMod: 0.2
      }
    };

    // Загрузка контента (если есть)
    this.contentData = this._loadContentData();
  }

  /**
   * Загрузить контент (тексты, описания)
   * @private
   */
  _loadContentData() {
    // Заглушка — контент загружается из src/data/content/climax_choices.json
    // Вы можете заполнить этот файл самостоятельно
    return {
      // Дополнительные варианты исходов
      customOutcomes: [],
      // Описания последствий
      outcomeDescriptions: {
        quick: 'Клиент получает быстрое завершение...',
        gentle: 'Нежное завершение оставляет приятное послевкусие...',
        intense: 'Интенсивный финал потрясает обоих...',
        controlled: 'Вы держите ситуацию под контролем...',
        dominant: 'Вы берёте контроль в свои руки...',
        submissive: 'Вы позволяете клиенту вести...'
      }
    };
  }

  /**
   * Проверить, достигнута ли кульминация
   * @param {Object} client - Данные клиента
   * @returns {boolean} Кульминация достигнута
   */
  isClimaxReached(client) {
    return client.arousal >= 100;
  }

  /**
   * Сгенерировать варианты исхода для текущей сцены
   * @param {Object} client - Данные клиента
   * @param {Object} player - Данные игрока
   * @param {Object} trustState - Состояние доверия (из TrustSystem)
   * @returns {Array} Варианты исхода (2-3 штуки)
   */
  generateOutcomes(client, player, trustState = null) {
    const availableOutcomes = [];

    // Базовые варианты (всегда доступны)
    availableOutcomes.push(this.outcomeTypes.quick);
    availableOutcomes.push(this.outcomeTypes.gentle);

    // Дополнительные варианты открываются от условий
    // Интенсивный — если клиент любит грубое
    if (client.fetishes?.some(f => f.id === 'rough')) {
      availableOutcomes.push(this.outcomeTypes.intense);
    }

    // Контролируемый — если высокий навык
    const oralSkill = player?.skills?.oral_skill?.level || 0;
    if (oralSkill >= 3) {
      availableOutcomes.push(this.outcomeTypes.controlled);
    }

    // Доминирующий — если клиент доминирующий или высокий trust
    const trustLevel = trustState?.level?.threshold || 0;
    if (client.archetype?.id === 'dominant' || trustLevel >= 75) {
      availableOutcomes.push(this.outcomeTypes.dominant);
    }

    // Покорный — если клиент нежный или застенчивый
    if (client.archetype?.id === 'gentle' || client.traits?.includes('shy')) {
      availableOutcomes.push(this.outcomeTypes.submissive);
    }

    // Выбираем 2-3 случайных варианта
    const shuffled = availableOutcomes.sort(() => Math.random() - 0.5);
    const selectedCount = Math.min(3, Math.max(2, shuffled.length));

    return shuffled.slice(0, selectedCount).map(outcome => ({
      ...outcome,
      // Применяем модификаторы от доверия
      rewardMultiplier: outcome.baseReward * (trustState ? trustState.rewardMultiplier || 1 : 1),
      satisfactionMod: outcome.baseSatisfaction + (trustState ? trustState.satisfactionBonus || 0 : 0)
    }));
  }

  /**
   * Рассчитать последствия выбранного исхода
   * @param {string} outcomeId - ID выбранного исхода
   * @param {Object} client - Данные клиента
   * @param {Object} player - Данные игрока
   * @param {Object} trustState - Состояние доверия
   * @returns {Object} Последствия
   */
  calculateOutcome(outcomeId, client, player, trustState = null) {
    const outcome = this.outcomeTypes[outcomeId];

    if (!outcome) {
      console.warn(`[ClimaxSystem] Исход "${outcomeId}" не найден, используем quick`);
      return this.calculateOutcome('quick', client, player, trustState);
    }

    // Базовые значения
    let reward = outcome.baseReward;
    let stress = outcome.baseStress;
    let satisfaction = outcome.baseSatisfaction;
    let returnChanceMod = outcome.returnChanceMod;

    // Модификаторы от навыков игрока
    const oralSkill = player?.skills?.oral_skill?.level || 0;
    const enduranceSkill = player?.skills?.endurance?.level || 0;

    if (oralSkill >= 2) {
      reward *= 1.1;  // +10% за навык
    }
    if (enduranceSkill >= 2) {
      stress = Math.max(0, stress - 2);  // -2 стресса
    }

    // Модификаторы от доверия
    if (trustState) {
      const trustBonus = trustState.rewardMultiplier || 1;
      reward *= trustBonus;
      returnChanceMod += (trustState.returnChance || 0.2) * 0.5;
    }

    // Модификаторы от соответствия предпочтениям клиента
    const preferenceMatch = this._checkPreferenceMatch(outcomeId, client);
    if (preferenceMatch === 'perfect') {
      reward *= 1.3;
      satisfaction += 15;
      returnChanceMod += 0.15;
    } else if (preferenceMatch === 'good') {
      reward *= 1.15;
      satisfaction += 8;
      returnChanceMod += 0.05;
    } else if (preferenceMatch === 'bad') {
      reward *= 0.8;
      satisfaction -= 10;
      returnChanceMod -= 0.1;
    }

    // Расчёт финальных значений
    const finalReward = Math.floor(30 * reward);  // Базовая награда 30
    const finalSatisfaction = Math.max(0, Math.min(100, satisfaction));
    const finalReturnChance = Math.max(0.1, Math.min(0.95, 0.5 + returnChanceMod));

    // XP за сцену
    const xpGain = Math.floor(finalReward / 3) + (finalSatisfaction >= 80 ? 10 : 0);

    return {
      outcomeId,
      outcomeName: outcome.name,
      reward: finalReward,
      stress,
      satisfaction: finalSatisfaction,
      returnChance: finalReturnChance,
      xpGain,
      preferenceMatch,
      effects: {
        money: finalReward,
        mental: -stress,
        xp: xpGain
      }
    };
  }

  /**
   * Проверить соответствие исхода предпочтениям клиента
   * @private
   * @param {string} outcomeId - ID исхода
   * @param {Object} client - Данные клиента
   * @returns {string} 'perfect', 'good', 'neutral', 'bad'
   */
  _checkPreferenceMatch(outcomeId, client) {
    const liked = client.preferences?.liked || [];
    const disliked = client.preferences?.disliked || [];

    // Маппинг исходов к предпочтениям
    const outcomePreferences = {
      quick: ['fast'],
      gentle: ['gentle', 'slow'],
      intense: ['rough', 'deep', 'fast'],
      controlled: ['eye_contact', 'teasing'],
      dominant: ['rough', 'spit'],
      submissive: ['gentle', 'slow']
    };

    const prefs = outcomePreferences[outcomeId] || [];

    // Проверка: есть ли в liked
    const likedMatch = prefs.some(p => liked.includes(p));
    // Проверка: есть ли в disliked
    const dislikedMatch = prefs.some(p => disliked.includes(p));

    if (likedMatch && !dislikedMatch) return 'perfect';
    if (likedMatch) return 'good';
    if (dislikedMatch) return 'bad';
    return 'neutral';
  }

  /**
   * Получить описание исхода (для UI)
   * @param {string} outcomeId - ID исхода
   * @returns {string} Описание
   */
  getOutcomeDescription(outcomeId) {
    const outcome = this.outcomeTypes[outcomeId];
    if (!outcome) return 'Неизвестный исход';

    // Проверяем кастомный контент
    const customDesc = this.contentData.outcomeDescriptions?.[outcomeId];
    if (customDesc) return customDesc;

    // Возвращаем базовое описание
    return outcome.description;
  }

  /**
   * Получить все доступные типы исходов
   * @returns {Object} Все типы исходов
   */
  getAllOutcomeTypes() {
    return { ...this.outcomeTypes };
  }

  /**
   * Сбросить состояние (если нужно)
   */
  reset() {
    // Нет состояния для сброса
  }
}

export default ClimaxSystem;

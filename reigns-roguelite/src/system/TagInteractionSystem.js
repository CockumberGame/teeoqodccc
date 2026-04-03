/**
 * TagInteractionSystem — Система взаимодействия тегов действий и черт персонажа
 * Концепт от 15.03: "Реакции персонажа определяются взаимодействием тегов действия с чертами"
 *
 * Как работает:
 * - Каждое действие имеет теги: ["gentle", "slow", "teasing"]
 * - Каждый персонаж имеет черты: ["shy", "gentle", "nervous"]
 * - Система вычисляет модификатор успеха на основе совместимости
 *
 * Пример:
 * - ["gentle"] × ["shy"] = +20% успех
 * - ["rough"] × ["shy"] = -30% успех
 *
 * КОНТЕНТ: Таблица совместимости в src/data/content/tag_compatibility.json
 */

class TagInteractionSystem {
  constructor() {
    // Базовая матрица совместимости (теги действий × черты персонажа)
    // Формат: actionTag_trait = модификатор (0.5 = -50%, 1.0 = нейтрально, 1.5 = +50%)
    this.baseCompatibility = {
      // Теги действий: gentle
      'gentle_shy': 1.3,
      'gentle_nervous': 1.2,
      'gentle_gentle': 1.4,
      'gentle_rough': 0.7,
      'gentle_dominant': 0.8,
      'gentle_experienced': 0.9,

      // Теги действий: rough
      'rough_shy': 0.6,
      'rough_nervous': 0.5,
      'rough_gentle': 0.7,
      'rough_rough': 1.4,
      'rough_dominant': 1.3,
      'rough_experienced': 1.1,
      'rough_thrill_seeker': 1.3,

      // Теги действий: slow
      'slow_shy': 1.2,
      'slow_nervous': 1.1,
      'slow_gentle': 1.3,
      'slow_impatient': 0.6,
      'slow_rough': 0.8,

      // Теги действий: fast
      'fast_shy': 0.8,
      'fast_nervous': 0.9,
      'fast_impatient': 1.4,
      'fast_gentle': 0.9,
      'fast_rough': 1.1,

      // Теги действий: teasing
      'teasing_shy': 1.1,
      'teasing_curious': 1.3,
      'teasing_experienced': 1.2,
      'teasing_impatient': 0.7,

      // Теги действий: intimate
      'intimate_shy': 1.2,
      'intimate_gentle': 1.3,
      'intimate_loyal': 1.4,
      'intimate_rough': 0.8,

      // Теги действий: risky
      'risky_shy': 0.6,
      'risky_nervous': 0.5,
      'risky_curious': 1.3,
      'risky_thrill_seeker': 1.5,
      'risky_experienced': 1.2,

      // Теги действий: supportive
      'supportive_shy': 1.4,
      'supportive_nervous': 1.3,
      'supportive_gentle': 1.2,
      'supportive_rough': 0.9,

      // Теги действий: dominant
      'dominant_shy': 0.7,
      'dominant_submissive': 1.4,
      'dominant_dominant': 0.8,
      'dominant_rough': 1.2,

      // Теги действий: submissive
      'submissive_shy': 1.2,
      'submissive_gentle': 1.3,
      'submissive_dominant': 1.4,
      'submissive_rough': 1.1
    };

    // Загрузка контента (если есть)
    this.contentData = this._loadContentData();
  }

  /**
   * Загрузить контент (кастомная матрица совместимости)
   * @private
   */
  _loadContentData() {
    // Заглушка — контент загружается из src/data/content/tag_compatibility.json
    // Вы можете заполнить этот файл самостоятельно и добавить свои комбинации
    return {
      customCompatibility: {},  // Пользовательские модификаторы
      tagGroups: {
        // Группы тегов для упрощения
        gentle: ['gentle', 'soft', 'tender'],
        rough: ['rough', 'hard', 'intense'],
        slow: ['slow', 'lazy', 'calm'],
        fast: ['fast', 'quick', 'rapid']
      }
    };
  }

  /**
   * Рассчитать модификатор успеха от взаимодействия тегов
   * @param {Array} actionTags - Теги действия
   * @param {Array} characterTraits - Черты персонажа
   * @returns {Object} Результат расчёта
   */
  calculateTagModifier(actionTags = [], characterTraits = []) {
    if (!actionTags || actionTags.length === 0) {
      return {
        modifier: 1.0,
        breakdown: [],
        summary: 'Нет тегов'
      };
    }

    if (!characterTraits || characterTraits.length === 0) {
      return {
        modifier: 1.0,
        breakdown: [],
        summary: 'Нет черт'
      };
    }

    const breakdown = [];
    let totalModifier = 1.0;

    // Проверяем каждую комбинацию тег × черта
    for (const tag of actionTags) {
      for (const trait of characterTraits) {
        const key = `${tag}_${trait}`;
        let modifier = this.baseCompatibility[key] || 1.0;

        // Проверяем кастомные модификаторы
        if (this.contentData.customCompatibility?.[key]) {
          modifier = this.contentData.customCompatibility[key];
        }

        // Проверяем группы тегов (если тег не найден напрямую)
        if (modifier === 1.0) {
          modifier = this._checkTagGroups(tag, trait);
        }

        // Записываем в breakdown только если modifier != 1.0
        if (modifier !== 1.0) {
          const effect = modifier > 1.0 ? 'бонус' : 'штраф';
          const percent = Math.round((modifier - 1.0) * 100);
          breakdown.push({
            tag,
            trait,
            modifier,
            effect,
            percent
          });

          // Применяем к общему модификатору (мультипликативно)
          totalModifier *= modifier;
        }
      }
    }

    // Ограничиваем общий модификатор (0.5 - 2.0)
    totalModifier = Math.max(0.5, Math.min(2.0, totalModifier));

    // Генерируем сводку
    const bonusCount = breakdown.filter(b => b.effect === 'бонус').length;
    const penaltyCount = breakdown.filter(b => b.effect === 'штраф').length;

    let summary = 'Нейтрально';
    if (bonusCount > penaltyCount) {
      summary = `Бонусы (${bonusCount})`;
    } else if (penaltyCount > bonusCount) {
      summary = `Штрафы (${penaltyCount})`;
    } else if (bonusCount > 0) {
      summary = 'Смешанно';
    }

    return {
      modifier: Math.round(totalModifier * 100) / 100,
      breakdown,
      summary,
      bonusCount,
      penaltyCount
    };
  }

  /**
   * Проверить группы тегов (если прямой комбинации нет)
   * @private
   * @param {string} tag - Тег действия
   * @param {string} trait - Черта персонажа
   * @returns {number} Модификатор или 1.0
   */
  _checkTagGroups(tag, trait) {
    const tagGroups = this.contentData.tagGroups || {};

    // Ищем группу, содержащую этот тег
    for (const [groupName, tags] of Object.entries(tagGroups)) {
      if (tags.includes(tag)) {
        // Проверяем совместимость группы с чертой
        const key = `${groupName}_${trait}`;
        if (this.baseCompatibility[key]) {
          return this.baseCompatibility[key];
        }
      }
    }

    return 1.0;  // Нет совместимости
  }

  /**
   * Получить рекомендуемые действия для персонажа
   * @param {Object} availableActions - Доступные действия (с тегами)
   * @param {Array} characterTraits - Черты персонажа
   * @returns {Array} Отсортированные действия (лучшие первыми)
   */
  getRecommendedActions(availableActions, characterTraits) {
    if (!availableActions || !characterTraits) {
      return availableActions || [];
    }

    // Рассчитываем модификатор для каждого действия
    const actionsWithModifiers = availableActions.map(action => {
      const result = this.calculateTagModifier(action.tags, characterTraits);
      return {
        ...action,
        tagModifier: result.modifier,
        tagSummary: result.summary
      };
    });

    // Сортируем по модификатору (убывание)
    return actionsWithModifiers.sort((a, b) => b.tagModifier - a.tagModifier);
  }

  /**
   * Проверить, является ли действие рискованным для данного персонажа
   * @param {Array} actionTags - Теги действия
   * @param {Array} characterTraits - Черты персонажа
   * @returns {boolean} Рискованное ли действие
   */
  isRiskyAction(actionTags, characterTraits) {
    const result = this.calculateTagModifier(actionTags, characterTraits);
    return result.modifier < 0.8;  // Штраф > 20% = рискованно
  }

  /**
   * Проверить, является ли действие идеальным для данного персонажа
   * @param {Array} actionTags - Теги действия
   * @param {Array} characterTraits - Черты персонажа
   * @returns {boolean} Идеальное ли действие
   */
  isIdealAction(actionTags, characterTraits) {
    const result = this.calculateTagModifier(actionTags, characterTraits);
    return result.modifier >= 1.3;  // Бонус >= 30% = идеально
  }

  /**
   * Получить подсказку для игрока о совместимости
   * @param {Array} actionTags - Теги действия
   * @param {Array} characterTraits - Черты персонажа
   * @returns {Object} Подсказка
   */
  getHint(actionTags, characterTraits) {
    const result = this.calculateTagModifier(actionTags, characterTraits);

    if (result.modifier >= 1.3) {
      return {
        type: 'positive',
        text: 'Отлично подходит!',
        icon: '✅',
        color: '#4ade80'
      };
    } else if (result.modifier >= 1.0) {
      return {
        type: 'neutral',
        text: 'Хороший выбор',
        icon: '👌',
        color: '#fbbf24'
      };
    } else if (result.modifier >= 0.8) {
      return {
        type: 'caution',
        text: 'Возможно, не подойдёт',
        icon: '⚠️',
        color: '#f97316'
      };
    } else {
      return {
        type: 'negative',
        text: 'Рискованный выбор',
        icon: '❌',
        color: '#ef4444'
      };
    }
  }

  /**
   * Добавить кастомный модификатор совместимости
   * @param {string} actionTag - Тег действия
   * @param {string} characterTrait - Черта персонажа
   * @param {number} modifier - Модификатор (0.5-2.0)
   */
  addCustomCompatibility(actionTag, characterTrait, modifier) {
    const key = `${actionTag}_${characterTrait}`;
    this.contentData.customCompatibility[key] = Math.max(0.5, Math.min(2.0, modifier));
  }

  /**
   * Сбросить кастомные модификаторы
   */
  resetCustomCompatibility() {
    this.contentData.customCompatibility = {};
  }

  /**
   * Получить полную матрицу совместимости (для отладки)
   * @returns {Object} Матрица совместимости
   */
  getCompatibilityMatrix() {
    return {
      base: this.baseCompatibility,
      custom: this.contentData.customCompatibility
    };
  }
}

export default TagInteractionSystem;

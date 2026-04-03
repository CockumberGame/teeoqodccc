/**
 * MoodSystem - Система настроения клиентов
 * Gloryhole Quest - Управляет эмоциональным состоянием клиента во время сессии
 *
 * Этап 2: Авто-изменение настроения
 * - Настроение меняется каждый ход автоматически
 * - Факторы: ходы без прогресса, усталость от сессии, тип клиента, доверие
 * - Фазы: relaxed, neutral, impatient, frustrated, angry
 *
 * Настроения (прогрессия ухудшения):
 * relaxed → neutral → impatient → frustrated → angry
 */

class MoodSystem {
  constructor() {
    // Уровни настроения с параметрами (Этап 2: обновлённые фазы)
    this.moods = {
      relaxed: {
        id: 'relaxed',
        name: 'Расслаблен',
        emoji: '😌',
        minThreshold: 50,
        rewardMultiplier: 1.2,
        successChanceMod: 0.1,
        satisfactionMod: 10,
        arousalProgressMod: 1.1,
        description: 'Клиент полностью расслаблен и доволен'
      },
      neutral: {
        id: 'neutral',
        name: 'Спокоен',
        emoji: '😐',
        minThreshold: 0,
        rewardMultiplier: 1.0,
        successChanceMod: 0,
        satisfactionMod: 0,
        arousalProgressMod: 1.0,
        description: 'Клиент спокоен и готов к взаимодействию'
      },
      impatient: {
        id: 'impatient',
        name: 'Нетерпелив',
        emoji: '😒',
        minThreshold: -30,
        rewardMultiplier: 0.85,
        successChanceMod: -0.1,
        satisfactionMod: -10,
        arousalProgressMod: 0.9,
        description: 'Клиенту кажется, что всё слишком медленно'
      },
      frustrated: {
        id: 'frustrated',
        name: 'Разочарован',
        emoji: '😤',
        minThreshold: -60,
        rewardMultiplier: 0.7,
        successChanceMod: -0.2,
        satisfactionMod: -25,
        arousalProgressMod: 0.75,
        description: 'Клиент разочарован, почти не реагирует'
      },
      angry: {
        id: 'angry',
        name: 'Зол',
        emoji: '😡',
        minThreshold: -100,
        rewardMultiplier: 0.5,
        successChanceMod: -0.4,
        satisfactionMod: -50,
        arousalProgressMod: 0.5,
        description: 'Клиент зол, может уйти без оплаты'
      }
    };

    // Триггеры изменения настроения
    this.triggers = {
      // Ухудшение настроения
      noArousalProgress: -5,     // Ход без прогресса arousal (авто-тик)
      wrongIntensity: -10,       // Неправильная интенсивность
      fetishMismatch: -20,       // Действие против предпочтений
      tooSlow: -8,               // Слишком медленно для клиента
      tooRough: -12,             // Слишком грубо
      sessionFatigue: -2,        // Усталость от сессии (после 5 хода)

      // Улучшение настроения
      goodArousalProgress: 10,   // Хороший прогресс arousal
      fetishMatch: 15,           // Попадание в фетиш
      perfectIntensity: 8,       // Правильная интенсивность
      skillfulAction: 12,        // Навычное действие
      teasing: 5                 // Успешное дразнение
    };

    // Типы клиентов и их склонности к настроению
    this.clientTypeMoods = {
      newbie: {
        baseMood: 'neutral',
        moodSwing: 1.2,
        patience: 1.3
      },
      regular: {
        baseMood: 'neutral',
        moodSwing: 1.0,
        patience: 1.0
      },
      generous: {
        baseMood: 'relaxed',
        moodSwing: 0.8,
        patience: 1.4
      },
      demanding: {
        baseMood: 'impatient',
        moodSwing: 1.5,
        patience: 0.5
      },
      vip: {
        baseMood: 'neutral',
        moodSwing: 1.3,
        patience: 0.6
      }
    };

    // Модификаторы от modifier'ов клиента (Этап 2)
    this.modifierMoodEffects = {
      impatient: { moodDecayMultiplier: 1.5, baseMoodShift: -10 },
      generous: { moodDecayMultiplier: 0.7, baseMoodShift: 5 },
      mysterious: { moodVariance: 1.3 },
      sensitive: { moodSwing: 1.2 }
    };
  }

  /**
   * Создать объект настроения для клиента
   * @param {Object} client - Данные клиента
   * @returns {Object} Объект настроения
   */
  createMood(client) {
    const typeData = this.clientTypeMoods[client.type?.id] || this.clientTypeMoods.regular;
    const baseMood = typeData.baseMood || 'neutral';

    // Учитываем модификаторы клиента
    let moodSwing = typeData.moodSwing || 1.0;
    let baseMoodShift = 0;

    if (client.modifiers && Array.isArray(client.modifiers)) {
      client.modifiers.forEach(mod => {
        const modEffect = this.modifierMoodEffects[mod];
        if (modEffect) {
          if (modEffect.moodSwing) moodSwing *= modEffect.moodSwing;
          if (modEffect.baseMoodShift) baseMoodShift += modEffect.baseMoodShift;
        }
      });
    }

    return {
      current: baseMood,
      score: baseMoodShift,  // -100 до +100
      moodSwing: moodSwing,
      patience: typeData.patience || 1.0,
      turnsWithoutProgress: 0,
      lastArousal: client.arousal || 0,
      history: [baseMood]
    };
  }

  /**
   * Авто-изменение настроения каждый ход (Этап 2)
   * Настроение меняется автоматически под влиянием факторов
   * @param {Object} moodState - Объект настроения
   * @param {Object} client - Данные клиента
   * @param {number} turn - Номер хода
   * @param {number} trust - Уровень доверия (опционально)
   * @returns {Object} Результат изменения
   */
  autoTick(moodState, client, turn = 0, trust = 50) {
    // Защита: если moodState не создан — создаём
    if (!moodState || !moodState.current) {
      moodState = this.createMood(client);
    }

    let moodChange = 0;
    const reasons = [];

    // Фактор 1: Ходы без прогресса arousal (-5 за каждый ход)
    if (moodState.turnsWithoutProgress > 0) {
      const decay = -5 * moodState.turnsWithoutProgress;
      moodChange += decay;
      reasons.push(`no_progress_decay_${decay}`);
    }

    // Фактор 2: Усталость от сессии (после 5 хода -2 за каждый ход)
    if (turn > 5) {
      const fatigue = -2 * (turn - 5);
      moodChange += fatigue;
      reasons.push(`session_fatigue_${fatigue}`);
    }

    // Фактор 3: Тип клиента влияет на скорость изменения
    const typeModifiers = {
      newbie: 1.3,
      impatient: 1.5,   // Быстрее ухудшается
      gentle: 0.8,      // Медленнее
      loyal: 0.7,
      demanding: 1.4,
      vip: 1.2
    };

    // Базовый модификатор от типа
    let typeMod = typeModifiers[client.type?.id] || 1.0;

    // Модификаторы от modifier'ов клиента
    if (client.modifiers && Array.isArray(client.modifiers)) {
      client.modifiers.forEach(mod => {
        const modEffect = this.modifierMoodEffects[mod];
        if (modEffect?.moodDecayMultiplier) {
          typeMod *= modEffect.moodDecayMultiplier;
        }
      });
    }

    moodChange *= typeMod;

    // Фактор 4: Высокое доверие стабилизирует настроение (-50% изменение при trust >= 75)
    if (trust >= 75) {
      moodChange *= 0.5;
      reasons.push('high_trust_stabilize');
    }

    // Фактор 5: Случайная вариация (-3 до +3)
    const randomVariance = Math.floor(Math.random() * 7) - 3;
    moodChange += randomVariance;
    if (randomVariance !== 0) {
      reasons.push(`random_variance_${randomVariance > 0 ? '+' : ''}${randomVariance}`);
    }

    // Применяем изменение
    const oldScore = moodState.score;
    moodState.score = Math.max(-100, Math.min(100, moodState.score + moodChange));

    // Проверяем смену настроения
    const newMood = this.getMoodPhase(moodState.score);
    let moodChanged = false;

    if (newMood !== moodState.current) {
      moodState.current = newMood;
      moodState.history.push(newMood);
      moodChanged = true;
    }

    return {
      moodChange,
      oldScore,
      newScore: moodState.score,
      oldMood: moodState.current,
      newMood: moodState.current,
      moodChanged,
      reasons,
      moodData: this.moods[moodState.current]
    };
  }

  /**
   * Обновить настроение на основе действий
   * @param {Object} mood - Объект настроения
   * @param {Object} context - Контекст действия
   * @returns {Object} Результат обновления
   */
  updateMood(mood, context) {
    const {
      arousalChange = 0,
      actionIntensity = 'normal',
      clientPreferences = {},
      actionType = null,
      skillLevel = 1
    } = context;

    let moodChange = 0;
    const reasons = [];

    // Проверка прогресса arousal
    if (arousalChange <= 0) {
      moodChange += this.triggers.noArousalProgress;
      mood.turnsWithoutProgress++;
      reasons.push('no_arousal_progress');

      // Дополнительное ухудшение за несколько ходов без прогресса
      if (mood.turnsWithoutProgress >= 2) {
        moodChange -= 5 * (mood.turnsWithoutProgress - 1);
        reasons.push(`stagnant_${mood.turnsWithoutProgress}_turns`);
      }
    } else {
      mood.turnsWithoutProgress = 0;

      // Хороший прогресс
      if (arousalChange >= 25) {
        moodChange += this.triggers.goodArousalProgress;
        reasons.push('good_arousal_progress');
      }
    }

    // Проверка соответствия интенсивности предпочтениям
    const preferredIntensity = clientPreferences.intensity || 'normal';
    if (actionIntensity !== preferredIntensity) {
      moodChange += this.triggers.wrongIntensity;
      reasons.push('wrong_intensity');
    } else {
      moodChange += this.triggers.perfectIntensity;
      reasons.push('perfect_intensity');
    }

    // Проверка соответствия фетишам
    if (clientPreferences.liked && clientPreferences.liked.includes(actionType)) {
      moodChange += this.triggers.fetishMatch;
      reasons.push('fetish_match');
    }

    if (clientPreferences.disliked && clientPreferences.disliked.includes(actionType)) {
      moodChange += this.triggers.fetishMismatch;
      reasons.push('fetish_mismatch');
    }

    // Бонус за навык
    if (skillLevel >= 3) {
      moodChange += this.triggers.skillfulAction;
      reasons.push('skillful_action');
    }

    // Применяем модификатор mood swing
    moodChange *= mood.moodSwing;

    // Обновляем score
    const oldScore = mood.score;
    mood.score = Math.max(-100, Math.min(100, mood.score + moodChange));
    mood.lastArousal = context.newArousal || mood.lastArousal;

    // Определяем новое настроение
    const newMood = this.getMoodPhase(mood.score);

    if (newMood !== mood.current) {
      mood.current = newMood;
      mood.history.push(newMood);
    }

    return {
      moodChange,
      oldScore,
      newScore: mood.score,
      oldMood: mood.current,
      newMood: mood.current,
      reasons,
      moodData: this.moods[mood.current]
    };
  }

  /**
   * Получить фазу настроения по score (Этап 2)
   * @param {number} score - Score настроения (-100 до +100)
   * @returns {string} ID фазы
   */
  getMoodPhase(score) {
    // Сортируем настроения по порогу
    const sortedMoods = Object.values(this.moods).sort((a, b) => b.minThreshold - a.minThreshold);

    for (const mood of sortedMoods) {
      if (score >= mood.minThreshold) {
        return mood.id;
      }
    }

    return 'angry';
  }

  /**
   * Получить модификаторы текущего настроения
   * @param {Object} mood - Объект настроения
   * @returns {Object} Модификаторы
   */
  getMoodModifiers(mood) {
    const moodData = this.moods[mood.current] || this.moods.neutral;

    return {
      rewardMultiplier: moodData.rewardMultiplier,
      successChanceMod: moodData.successChanceMod,
      satisfactionMod: moodData.satisfactionMod,
      arousalProgressMod: moodData.arousalProgressMod
    };
  }

  /**
   * Принудительно изменить настроение (для событий)
   * @param {Object} mood - Объект настроения
   * @param {string} newMoodId - ID нового настроения
   * @returns {Object} Результат
   */
  setMood(mood, newMoodId) {
    if (!this.moods[newMoodId]) {
      return { success: false, reason: 'Invalid mood ID' };
    }

    const oldMood = mood.current;
    mood.current = newMoodId;
    mood.history.push(newMoodId);

    // Устанавливаем score в диапазон нового настроения
    const moodData = this.moods[newMoodId];
    const nextMood = this.getNextMood(newMoodId);
    const maxScore = nextMood ? nextMood.minThreshold - 1 : 100;
    mood.score = moodData.minThreshold + Math.floor(Math.random() * (maxScore - moodData.minThreshold));

    return {
      success: true,
      oldMood,
      newMood: newMoodId,
      moodData: this.moods[newMoodId]
    };
  }

  /**
   * Получить следующее настроение (лучше)
   * @param {string} currentMoodId - Текущее настроение
   * @returns {Object|null} Следующее настроение
   */
  getNextMood(currentMoodId) {
    const moodOrder = ['angry', 'frustrated', 'impatient', 'neutral', 'relaxed'];
    const currentIndex = moodOrder.indexOf(currentMoodId);

    if (currentIndex < moodOrder.length - 1) {
      return this.moods[moodOrder[currentIndex + 1]];
    }

    return null;
  }

  /**
   * Получить предыдущее настроение (хуже)
   * @param {string} currentMoodId - Текущее настроение
   * @returns {Object|null} Предыдущее настроение
   */
  getPreviousMood(currentMoodId) {
    const moodOrder = ['angry', 'frustrated', 'impatient', 'neutral', 'relaxed'];
    const currentIndex = moodOrder.indexOf(currentMoodId);

    if (currentIndex > 0) {
      return this.moods[moodOrder[currentIndex - 1]];
    }

    return null;
  }

  /**
   * Проверить, может ли клиент продолжить сессию
   * @param {Object} mood - Объект настроения
   * @returns {boolean} Может ли продолжить
   */
  canContinue(mood) {
    return mood.current !== 'angry' && mood.current !== 'frustrated';
  }

  /**
   * Получить текстовое описание для UI
   * @param {Object} mood - Объект настроения
   * @returns {string} Описание
   */
  getDescription(mood) {
    const moodData = this.moods[mood.current] || this.moods.neutral;
    return `${moodData.emoji} ${moodData.name}: ${moodData.description}`;
  }

  /**
   * Получить цвет для UI прогресс-бара
   * @param {Object} mood - Объект настроения
   * @returns {string} CSS цвет
   */
  getColor(mood) {
    const colors = {
      relaxed: '#51cf66',    // Зелёный
      neutral: '#fcc419',    // Жёлтый
      impatient: '#ff922b',  // Оранжевый
      frustrated: '#e03131', // Тёмно-красный
      angry: '#c92a2a'       // Очень тёмно-красный
    };

    return colors[mood.current] || colors.neutral;
  }

  /**
   * Получить иконку (emoji) для настроения
   * @param {Object} mood - Объект настроения
   * @returns {string} Emoji
   */
  getEmoji(mood) {
    const moodData = this.moods[mood.current] || this.moods.neutral;
    return moodData.emoji || '😐';
  }

  /**
   * Сбросить счётчик ходов без прогресса
   * @param {Object} mood - Объект настроения
   */
  resetTurnsWithoutProgress(mood) {
    if (mood) {
      mood.turnsWithoutProgress = 0;
    }
  }

  /**
   * Сериализация
   */
  serialize(mood) {
    if (!mood) return null;
    return {
      current: mood.current,
      score: mood.score,
      moodSwing: mood.moodSwing,
      patience: mood.patience,
      turnsWithoutProgress: mood.turnsWithoutProgress,
      lastArousal: mood.lastArousal,
      history: mood.history.slice(-10)
    };
  }

  /**
   * Десериализация
   */
  deserialize(data) {
    if (!data) return this.createMood({ type: {} });

    return {
      current: data.current || 'neutral',
      score: data.score || 0,
      moodSwing: data.moodSwing || 1.0,
      patience: data.patience || 1.0,
      turnsWithoutProgress: data.turnsWithoutProgress || 0,
      lastArousal: data.lastArousal || 0,
      history: data.history || ['neutral']
    };
  }
}

export default MoodSystem;

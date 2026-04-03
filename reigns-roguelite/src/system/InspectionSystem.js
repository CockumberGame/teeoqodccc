/**
 * InspectionSystem - Система осмотра клиентов
 * Управляет механикой осмотра, открытием информации и уходом клиентов
 * 
 * Обновлённая версия с двумя навыками:
 * - visual_assessment (1-5) - точность определения размера
 * - perception (1-5) - раскрытие preferences и traits
 */

class InspectionSystem {
  constructor() {
    // Толерантность к осмотру по типам клиентов
    this.inspectionTolerance = {
      newbie: { base: 15, sizeModifier: 'small' },      // Нервные, но ждут подтверждения
      regular: { base: 25, sizeModifier: 'average' },   // Обычная терпимость
      generous: { base: 30, sizeModifier: 'average' },  // Щедрые более терпеливы
      demanding: { base: 45, sizeModifier: 'large' },   // Требовательные нетерпеливы
      vip: { base: 55, sizeModifier: 'large' }          // VIP очень нетерпеливы
    };

    // Модификаторы по размеру
    this.sizeModifiers = {
      micro: -10,    // Микро - выше шанс ухода (стесняются)
      small: -5,     // Мелкий - чуть выше шанс
      average: 0,    // Средний - база
      large: 10,     // Крупный - ниже шанс (уверены)
      huge: 15,      // Огромный - ещё ниже
      monster: 20    // Монстр - очень уверены
    };

    // Уровни открытия информации по навыку visual_assessment (1-5)
    this.visualAssessmentLevels = [
      { minSkill: 0, infoLevel: 'minimal', accuracy: 0.5 },    // Только категория
      { minSkill: 1, infoLevel: 'basic', accuracy: 0.7 },      // Диапазон
      { minSkill: 2, infoLevel: 'moderate', accuracy: 0.85 },  // Точнее
      { minSkill: 3, infoLevel: 'detailed', accuracy: 0.95 },  // Почти точно
      { minSkill: 5, infoLevel: 'complete', accuracy: 1.0 }    // Точно
    ];

    // Уровни раскрытия preferences по навыку perception (1-5)
    this.perceptionLevels = [
      { minSkill: 0, revealedCount: 0, showTraits: false },
      { minSkill: 1, revealedCount: 1, showTraits: false },
      { minSkill: 2, revealedCount: 2, showTraits: false },
      { minSkill: 3, revealedCount: 3, showTraits: true },
      { minSkill: 5, revealedCount: 99, showTraits: true }  // Все
    ];
  }

  /**
   * Рассчитать шанс ухода клиента при осмотре
   * @param {Object} client - Данные клиента
   * @param {number} visualSkill - Уровень навыка визуальной оценки
   * @returns {Object} Результат с шансом и броском
   */
  calculateLeaveChance(client, visualSkill = 0) {
    // Базовый шанс по типу клиента
    const typeData = this.inspectionTolerance[client.type?.id || 'regular'];
    const baseChance = typeData ? typeData.base : 25;

    // Модификатор по размеру
    const sizeMod = this.sizeModifiers[client.size?.key || 'average'] || 0;

    // Модификатор по навыку (выше навык = ниже шанс ухода)
    const skillMod = Math.min(20, visualSkill * 4);

    // Итоговый шанс
    const finalChance = Math.max(5, Math.min(80, baseChance - sizeMod - skillMod));

    // Бросок
    const roll = Math.random() * 100;
    const willLeave = roll < finalChance;

    return {
      baseChance,
      sizeMod,
      skillMod,
      finalChance,
      roll,
      willLeave,
      rollResult: willLeave ? 'leave' : 'stay'
    };
  }

  /**
   * Получить уровень информации при осмотре (visual_assessment)
   * @param {number} visualSkill - Уровень навыка visual_assessment
   * @returns {Object} Уровень информации
   */
  getInspectionLevel(visualSkill) {
    const level = this.visualAssessmentLevels
      .slice()
      .reverse()
      .find(l => visualSkill >= l.minSkill) || this.visualAssessmentLevels[0];

    return { infoLevel: level.infoLevel, accuracy: level.accuracy };
  }

  /**
   * Получить уровень раскрытия preferences (perception)
   * @param {number} perceptionSkill - Уровень навыка perception
   * @returns {Object} Уровень раскрытия
   */
  getPerceptionLevel(perceptionSkill) {
    const level = this.perceptionLevels
      .slice()
      .reverse()
      .find(l => perceptionSkill >= l.minSkill) || this.perceptionLevels[0];

    return level;
  }

  /**
   * Получить информацию о клиенте после осмотра (обновлённая версия)
   * @param {Object} client - Клиент
   * @param {number} visualSkill - Уровень навыка visual_assessment
   * @param {number} perceptionSkill - Уровень навыка perception
   * @param {boolean} isReturning - Повторный ли клиент
   * @param {Array} knownFetishes - Уже известные фетиши
   * @returns {Object} Открытая информация
   */
  getInspectionInfo(client, visualSkill = 0, perceptionSkill = 0, isReturning = false, knownFetishes = []) {
    const { infoLevel, accuracy } = this.getInspectionLevel(visualSkill);
    const perceptionLevel = this.getPerceptionLevel(perceptionSkill);
    const sizeSystem = client.sizeSystem; // Передаётся из ClientGenerator

    let result = {
      infoLevel,
      accuracy,
      perceptionLevel,
      isReturning,
      knownFetishes: [...knownFetishes],
      newRevealedFetishes: [],
      revealedTraits: [],
      mood: this._generateMood(client, infoLevel)
    };

    // Информация о размере
    if (isReturning) {
      // Повторный клиент - размер уже известен точно
      result.sizeInfo = {
        exact: client.sizeCm,
        display: `${client.sizeCm}см (знакомый)`,
        category: client.size?.key || 'average'
      };
    } else {
      // Новый клиент - по уровню навыка
      result.sizeInfo = this._getSizeInfo(client, visualSkill, sizeSystem);
    }

    // Информация о фетишах и traits (с учётом perception)
    result.fetishInfo = this._getFetishInfo(client, infoLevel, perceptionLevel, knownFetishes);

    // Дополнительная информация
    result.extraInfo = this._getExtraInfo(client, infoLevel, visualSkill);

    return result;
  }

  /**
   * Получить информацию о размере
   */
  _getSizeInfo(client, visualSkill, sizeSystem) {
    const actualSize = client.sizeCm || 16;
    
    if (visualSkill <= 0) {
      // Без навыка - только категория
      return {
        exact: null,
        display: sizeSystem ? sizeSystem.getAssessment(actualSize, 0) : 'обычный',
        category: client.size?.key || 'average',
        accurate: false
      };
    }

    if (visualSkill <= 2) {
      // Низкий навык - диапазон
      const ranges = [
        { min: 0, max: 12, display: '8-12см (мелкий)' },
        { min: 12, max: 16, display: '12-16см (средний)' },
        { min: 16, max: 20, display: '16-20см (крупный)' },
        { min: 20, max: 999, display: '20+см (очень крупный)' }
      ];
      
      const range = ranges.find(r => actualSize >= r.min && actualSize < r.max) || ranges[1];
      
      return {
        exact: null,
        display: range.display,
        category: client.size?.key || 'average',
        accurate: false,
        range: { min: range.min, max: range.max }
      };
    }

    if (visualSkill <= 4) {
      // Средний навык - приблизительно точно
      const variance = Math.floor(Math.random() * 3) + 1; // 1-3см погрешность
      const estimated = actualSize + (Math.random() > 0.5 ? variance : -variance);
      
      return {
        exact: Math.round(estimated * 10) / 10,
        display: `~${Math.round(estimated)}см`,
        category: client.size?.key || 'average',
        accurate: false,
        variance
      };
    }

    // Максимальный навык - точно
    return {
      exact: actualSize,
      display: `${actualSize}см (точно)`,
      category: client.size?.key || 'average',
      accurate: true
    };
  }

  /**
   * Получить информацию о фетишах и traits (обновлённая версия)
   * @param {Object} client - Клиент
   * @param {string} infoLevel - Уровень информации
   * @param {Object} perceptionLevel - Уровень perception
   * @param {Array} knownFetishes - Известные фетиши
   * @returns {Object} Информация
   */
  _getFetishInfo(client, infoLevel, perceptionLevel, knownFetishes) {
    const allFetishes = client.fetishes?.map(f => f.id) || [];
    const hiddenFetishes = allFetishes.filter(f => !knownFetishes.includes(f));
    
    // Получаем traits клиента
    const allTraits = client.traits || [];
    const hiddenTraits = allTraits.filter(t => !knownFetishes.includes(`trait_${t}`));

    let revealedCount = 0;

    switch (infoLevel) {
      case 'minimal':
        // Никаких фетишей не видно
        revealedCount = 0;
        break;

      case 'basic':
        // Намёк на наличие фетишей
        return {
          revealed: [],
          revealedTraits: [],
          hint: hiddenFetishes.length > 0 ? 'Есть особые предпочтения...' : 'Без особых фетишей',
          count: 0
        };

      default:
        // Используем perception для определения количества
        revealedCount = perceptionLevel?.revealedCount || 0;
        break;
    }

    // Выбираем случайные фетиши для открытия
    const revealed = hiddenFetishes
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.min(revealedCount, hiddenFetishes.length));

    // Открываем traits если perception позволяет
    const revealedTraits = [];
    if (perceptionLevel?.showTraits && hiddenTraits.length > 0) {
      const traitsToReveal = Math.min(2, hiddenTraits.length);
      for (let i = 0; i < traitsToReveal; i++) {
        const randomTrait = hiddenTraits[Math.floor(Math.random() * hiddenTraits.length)];
        if (!revealedTraits.includes(randomTrait)) {
          revealedTraits.push(randomTrait);
        }
      }
    }

    return {
      revealed,
      revealedTraits,
      hint: null,
      count: revealed.length,
      traitsCount: revealedTraits.length,
      totalHidden: hiddenFetishes.length,
      totalTraits: allTraits.length
    };
  }

  /**
   * Сгенерировать настроение клиента после осмотра
   */
  _generateMood(client, infoLevel) {
    const rolls = {
      happy: { min: 0, max: 20, emoji: '😊', name: 'Доволен' },
      neutral: { min: 21, max: 60, emoji: '😐', name: 'Спокоен' },
      impatient: { min: 61, max: 85, emoji: '😒', name: 'Нетерпелив' },
      angry: { min: 86, max: 100, emoji: '😤', name: 'Раздражён' }
    };

    // Модификатор по информации (больше инфы = довольнее)
    let moodRoll = Math.random() * 100;
    
    if (infoLevel === 'complete') {
      moodRoll -= 20; // Сдвиг к довольному
    } else if (infoLevel === 'minimal') {
      moodRoll += 15; // Сдвиг к раздражённому
    }

    // Определяем настроение
    for (const [mood, range] of Object.entries(rolls)) {
      if (moodRoll >= range.min && moodRoll <= range.max) {
        return { mood, ...range };
      }
    }

    return rolls.neutral;
  }

  /**
   * Получить дополнительную информацию
   */
  _getExtraInfo(client, infoLevel, visualSkill) {
    const extra = [];

    if (infoLevel === 'complete') {
      extra.push({
        type: 'character',
        text: this._getCharacterHint(client)
      });
    }

    if (infoLevel === 'detailed' || infoLevel === 'complete') {
      extra.push({
        type: 'difficulty',
        text: this._getDifficultyHint(client)
      });
    }

    return extra;
  }

  /**
   * Получить намёк на характер
   */
  _getCharacterHint(client) {
    const hints = {
      demanding: 'Требует особого внимания',
      vip: 'Привык к лучшему сервису',
      generous: 'Любит щедрые чаевые',
      newbie: 'Нервничает, но старается',
      regular: 'Знает чего хочет'
    };

    return hints[client.type?.id] || 'Обычный клиент';
  }

  /**
   * Получить намёк на сложность
   */
  _getDifficultyHint(client) {
    const difficulty = client.difficulty || 1;
    
    if (difficulty < 1.2) return 'Лёгкий клиент';
    if (difficulty < 1.6) return 'Средняя сложность';
    if (difficulty < 2.0) return 'Сложный клиент';
    return 'Очень сложный';
  }

  /**
   * Получить текст для карты осмотра
   */
  getInspectionText(inspectionInfo, client) {
    const lines = [];

    // Заголовок
    if (inspectionInfo.isReturning) {
      lines.push(`🔓 Знакомый клиент! ${client.description}`);
    } else {
      lines.push(`👁️ Вы внимательно осматриваете: ${client.description}`);
    }

    // Размер
    if (inspectionInfo.sizeInfo.display) {
      lines.push(`📏 Размер: ${inspectionInfo.sizeInfo.display}`);
    }

    // Настроение
    lines.push(`Настроение: ${inspectionInfo.mood.emoji} ${inspectionInfo.mood.name}`);

    // Фетиши
    if (inspectionInfo.fetishInfo.hint) {
      lines.push(inspectionInfo.fetishInfo.hint);
    }
    
    if (inspectionInfo.fetishInfo.revealed.length > 0) {
      const fetishNames = inspectionInfo.fetishInfo.revealed.map(f => {
        const fetish = client.fetishes?.find(fet => fet.id === f);
        return fetish?.name || f;
      });
      lines.push(`Открыто: ${fetishNames.join(', ')}`);
    }

    // Доп информация
    inspectionInfo.extraInfo.forEach(extra => {
      lines.push(extra.text);
    });

    return lines.join('\n\n');
  }
}

export default InspectionSystem;

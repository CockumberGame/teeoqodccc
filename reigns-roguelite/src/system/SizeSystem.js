/**
 * SizeSystem - Система размеров и визуальной оценки
 * Скрытый параметр: 8-24см (нормальное распределение)
 * Навык visual_assessment улучшает точность оценки
 */

class SizeSystem {
  constructor() {
    // Диапазоны размеров
    this.ranges = {
      micro: { min: 0, max: 8, name: 'Микро', legendary: true },
      small: { min: 8, max: 12, name: 'Мелкий', legendary: false },
      average: { min: 12, max: 16, name: 'Средний', legendary: false },
      large: { min: 16, max: 20, name: 'Большой', legendary: false },
      huge: { min: 20, max: 24, name: 'Огромный', legendary: false },
      monster: { min: 24, max: 999, name: 'Монстр', legendary: true }
    };

    // Уровни визуальной оценки по навыку
    this.assessmentLevels = [
      { minSkill: 0, accuracy: 'vague' },      // "какой-то крупный"
      { minSkill: 1, accuracy: 'rough' },      // "мелкий/средний/крупный"
      { minSkill: 2, accuracy: 'moderate' },   // "чуть больше среднего"
      { minSkill: 3, accuracy: 'precise' },    // "большой/очень большой"
      { minSkill: 5, accuracy: 'exact' }       // "21см"
    ];
  }

  /**
   * Сгенерировать размер (нормальное распределение)
   * @returns {number} Размер в см (8-24, крайности редко)
   */
  generateSize() {
    // Нормальное распределение с центром в 16см
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    
    // Среднее 16см, стандартное отклонение 3см
    let size = 16 + z * 3;
    
    // Ограничиваем 6-30см (легендарные крайности)
    size = Math.max(6, Math.min(30, size));
    
    return Math.round(size * 10) / 10; // Округление до 0.1см
  }

  /**
   * Получить категорию размера
   * @param {number} size_cm - Размер в см
   * @returns {Object} Категория размера
   */
  getSizeCategory(size_cm) {
    for (const [key, range] of Object.entries(this.ranges)) {
      if (size_cm >= range.min && size_cm < range.max) {
        return {
          id: key,  // Добавлено для совместимости
          key,
          ...range,
          size_cm
        };
      }
    }

    // По умолчанию
    return {
      id: 'average',  // Добавлено для совместимости
      key: 'average',
      ...this.ranges.average,
      size_cm
    };
  }

  /**
   * Получить описание размера на основе навыка визуальной оценки
   * @param {number} size_cm - Реальный размер
   * @param {number} skillLevel - Уровень навыка visual_assessment
   * @returns {string} Описание
   */
  getAssessment(size_cm, skillLevel = 0) {
    const level = this.assessmentLevels
      .slice()
      .reverse()
      .find(l => skillLevel >= l.minSkill) || this.assessmentLevels[0];

    const category = this.getSizeCategory(size_cm);

    switch (level.accuracy) {
      case 'vague':
        // Очень размыто
        return this._getVagueAssessment(category);
      
      case 'rough':
        // Грубо: мелкий/средний/крупный
        return this._getRoughAssessment(category);
      
      case 'moderate':
        // Умеренно: с оттенками
        return this._getModerateAssessment(category, size_cm);
      
      case 'precise':
        // Точно: большой/очень большой
        return this._getPreciseAssessment(category);
      
      case 'exact':
        // Точный размер
        return `${size_cm}см`;
      
      default:
        return this._getRoughAssessment(category);
    }
  }

  _getVagueAssessment(category) {
    const descriptions = {
      micro: 'какой-то мелкий',
      small: 'небольшой',
      average: 'обычный',
      large: 'какой-то крупный',
      huge: 'выглядит большим',
      monster: 'огромный!'
    };
    return descriptions[category.key] || 'обычный';
  }

  _getRoughAssessment(category) {
    if (['micro', 'small'].includes(category.key)) {
      return 'мелкий';
    }
    if (['average'].includes(category.key)) {
      return 'средний';
    }
    return 'крупный';
  }

  _getModerateAssessment(category, size_cm) {
    if (['micro', 'small'].includes(category.key)) {
      return size_cm < 10 ? 'мелкий' : 'чуть меньше среднего';
    }
    if (['average'].includes(category.key)) {
      if (size_cm < 14) return 'средний';
      return 'чуть больше среднего';
    }
    if (['large'].includes(category.key)) {
      return size_cm < 18 ? 'крупный' : 'очень крупный';
    }
    return 'огромный';
  }

  _getPreciseAssessment(category) {
    const descriptions = {
      micro: 'микропенис',
      small: 'мелкий',
      average: 'средний',
      large: 'большой',
      huge: 'очень большой',
      monster: 'монструозный'
    };
    return descriptions[category.key] || 'средний';
  }

  /**
   * Проверить, является ли размер легендарным
   * @param {number} size_cm 
   * @returns {boolean}
   */
  isLegendary(size_cm) {
    const category = this.getSizeCategory(size_cm);
    return category.legendary || false;
  }

  /**
   * Получить множитель выплаты на основе размера
   * Больший размер = сложнее = больше оплата
   * @param {number} size_cm
   * @returns {number} Множитель (0.8 - 2.0)
   */
  getPayoutMultiplier(size_cm) {
    if (size_cm < 8) return 0.8;   // Микро - легче, но меньше платят
    if (size_cm < 12) return 0.9;  // Мелкий
    if (size_cm < 16) return 1.0;  // Средний - база
    if (size_cm < 20) return 1.3;  // Большой
    if (size_cm < 24) return 1.6;  // Огромный
    return 2.0;                     // Монстр - легендарно
  }

  /**
   * Сериализация для сохранения
   */
  serialize() {
    return {
      ranges: this.ranges,
      assessmentLevels: this.assessmentLevels
    };
  }

  /**
   * Десериализация из сохранения
   */
  deserialize(data) {
    if (!data) return;
    if (data.ranges) this.ranges = data.ranges;
    if (data.assessmentLevels) this.assessmentLevels = data.assessmentLevels;
  }
}

export default SizeSystem;

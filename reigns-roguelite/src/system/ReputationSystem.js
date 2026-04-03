/**
 * ReputationSystem - Система репутации героини
 * Gloryhole Quest - Влияет на поток клиентов, их щедрость и события
 *
 * Обновлённая версия с замедлением прогрессии (Этап 2):
 * - reputationGain = satisfaction * 0.2
 * - Лимит 25 за ночь
 * - Влияние на типы клиентов и поток
 * - Шанс редких модификаторов у клиентов
 */

class ReputationSystem {
  constructor() {
    this.reputation = 0;
    this.reputationLevel = 'newbie';
    this.totalClients = 0;
    this.satisfiedClients = 0;
    this.regulars = []; // Постоянные клиенты
    this.blacklisted = []; // Те, кто больше не придёт

    // Лимит репутации за ночь
    this.nightReputationGain = 0;
    this.maxNightReputation = 25;

    // Уровни репутации
    this.levels = {
      newbie: { min: 0, name: 'Новичок', clientFlowBonus: 0, modChance: 0.0 },
      known: { min: 10, name: 'Знакомая', clientFlowBonus: 0, modChance: 0.1 },
      popular: { min: 50, name: 'Популярная', clientFlowBonus: 1, modChance: 0.2 },
      famous: { min: 150, name: 'Известная', clientFlowBonus: 2, modChance: 0.4 },
      legend: { min: 300, name: 'Легенда', clientFlowBonus: 3, modChance: 0.6 }
    };
  }

  /**
   * Добавить репутацию (обновлённая формула с замедлением)
   * Формула: gain = satisfaction * 0.2, capped до (25 - tonightReputation)
   * @param {number} satisfaction - Удовлетворённость клиента
   * @param {Object} sessionStats - Статистика сессии
   * @returns {number} Фактическое количество добавленной репутации
   */
  addReputation(satisfaction, sessionStats = {}) {
    // Новая формула: медленный рост
    const gain = satisfaction * 0.2;
    const remainingLimit = this.maxNightReputation - this.nightReputationGain;
    const capped = Math.min(gain, remainingLimit, 25);

    if (capped > 0) {
      const gainFloor = Math.floor(capped);
      this.reputation += Math.max(1, gainFloor); // Минимум 1 если есть прогресс
      this.nightReputationGain += gainFloor;
      this.updateLevel();
      return Math.max(1, gainFloor);
    }

    return 0;
  }

  /**
   * Отнять репутацию (без лимита)
   * @param {number} amount - Количество
   */
  removeReputation(amount) {
    this.reputation = Math.max(0, this.reputation - amount);
    this.updateLevel();
    return this.reputation;
  }

  /**
   * Обновить уровень репутации
   */
  updateLevel() {
    const levels = Object.entries(this.levels).reverse();

    for (const [key, level] of levels) {
      if (this.reputation >= level.min) {
        this.reputationLevel = key;
        break;
      }
    }
  }

  /**
   * Записать удовлетворённого клиента
   */
  recordSatisfiedClient() {
    this.totalClients++;
    this.satisfiedClients++;
    this.checkRegularClient();
  }

  /**
   * Записать неудачу
   */
  recordFailedClient() {
    this.totalClients++;
  }

  /**
   * Проверить, стал ли клиент постоянным
   */
  checkRegularClient() {
    const satisfactionRate = this.satisfiedClients / Math.max(1, this.totalClients);

    if (satisfactionRate > 0.7 && Math.random() < 0.3) {
      const regularId = `regular_${Date.now()}`;
      this.regulars.push({
        id: regularId,
        name: `Постоянный #${this.regulars.length + 1}`,
        bonusPayout: 1.2 + (this.regulars.length * 0.1),
        visits: 1
      });
      return { isRegular: true, regularId };
    }

    return { isRegular: false };
  }

  /**
   * Получить модификатор потока клиентов
   */
  getClientFlowModifier() {
    return this.levels[this.reputationLevel]?.clientFlowBonus || 0;
  }

  /**
   * Получить количество клиентов для ночи
   * @param {number} reputation - Текущая репутация
   * @returns {number} Количество клиентов (база 3 + бонусы)
   */
  getClientsForNight(reputation) {
    const baseClients = 3;
    const reputationBonus = Math.floor(reputation / 20);
    const levelBonus = this.levels[this.reputationLevel]?.clientFlowBonus || 0;

    return baseClients + reputationBonus + levelBonus;
  }

  /**
   * Получить шанс редких модификаторов для клиента
   * @param {number} reputation - Текущая репутация
   * @returns {number} Шанс (0.0 - 0.8)
   */
  getTierChance(reputation) {
    const level = this.levels[this.reputationLevel];
    if (level) {
      return Math.min(level.modChance, 0.8);
    }

    // Фолбэк: линейная зависимость от репутации
    return Math.min(reputation / 100, 0.8);
  }

  /**
   * Сбросить лимит репутации за ночь (при начале новой сессии)
   */
  resetNightLimit() {
    this.nightReputationGain = 0;
  }

  /**
   * Получить оставшийся лимит репутации за ночь
   * @returns {number} Оставшийся лимит
   */
  getRemainingNightLimit() {
    return Math.max(0, this.maxNightReputation - this.nightReputationGain);
  }

  /**
   * Получить статистику
   */
  getStats() {
    return {
      reputation: this.reputation,
      level: this.reputationLevel,
      levelName: this.levels[this.reputationLevel]?.name || 'Неизвестно',
      totalClients: this.totalClients,
      satisfiedClients: this.satisfiedClients,
      satisfactionRate: Math.round((this.satisfiedClients / Math.max(1, this.totalClients)) * 100),
      regularsCount: this.regulars.length,
      nightReputationGain: Math.floor(this.nightReputationGain),
      maxNightReputation: this.maxNightReputation,
      remainingNightLimit: this.getRemainingNightLimit(),
      modChance: this.getTierChance(this.reputation)
    };
  }

  /**
   * Получить список постоянных клиентов
   */
  getRegulars() {
    return this.regulars;
  }

  /**
   * Посетить постоянного клиента
   */
  visitRegular(regularId) {
    const regular = this.regulars.find(r => r.id === regularId);
    if (regular) {
      regular.visits++;
      regular.bonusPayout += 0.05;
      return regular;
    }
    return null;
  }

  /**
   * Получить текущую репутацию
   * @returns {number}
   */
  getReputation() {
    return this.reputation;
  }

  /**
   * Сериализация
   */
  serialize() {
    return {
      reputation: this.reputation,
      reputationLevel: this.reputationLevel,
      totalClients: this.totalClients,
      satisfiedClients: this.satisfiedClients,
      regulars: this.regulars,
      blacklisted: this.blacklisted
    };
  }

  /**
   * Десериализация
   */
  deserialize(data) {
    if (!data) return;

    this.reputation = data.reputation || 0;
    this.reputationLevel = data.reputationLevel || 'newbie';
    this.totalClients = data.totalClients || 0;
    this.satisfiedClients = data.satisfiedClients || 0;
    this.regulars = data.regulars || [];
    this.blacklisted = data.blacklisted || [];

    this.updateLevel();
  }
}

export default ReputationSystem;

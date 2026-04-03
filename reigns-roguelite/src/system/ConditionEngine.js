/**
 * ConditionEngine - Проверка условий появления карт
 * Проверяет требования: уровень, навыки, флаги, предметы, время
 */

class ConditionEngine {
  constructor(gameEngine) {
    this.gameEngine = gameEngine;
  }

  /**
   * Проверить, может ли карта появиться
   * @param {Object} card - Карта с условиями
   * @param {Object} context - Контекст (игрок, run, флаги и т.д.)
   */
  canCardAppear(card, context) {
    if (!card.conditions || card.conditions.length === 0) {
      return true;
    }

    for (const condition of card.conditions) {
      if (!this.checkCondition(condition, context)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Проверить одно условие
   */
  checkCondition(condition, context) {
    const { player, run, flags, time, reputation } = context;

    switch (condition.type) {
      // Требования к уровню персонажа
      case 'min_level':
        const totalLevel = player?.skills?.getTotalLevel?.() || 0;
        return totalLevel >= condition.value;

      case 'max_level':
        const totalMaxLevel = player?.skills?.getTotalLevel?.() || 0;
        return totalMaxLevel <= condition.value;

      // Требования к навыкам
      case 'min_skill':
        return player?.skills?.meetsRequirement?.(condition.skill, condition.value) || false;

      case 'has_skill':
        const skill = player?.skills?.getSkill?.(condition.skill);
        return skill && skill.level > 0;

      // Требования к репутации
      case 'min_reputation':
        return (reputation?.reputation || 0) >= condition.value;

      case 'reputation_level':
        return (reputation?.reputationLevel || 'newbie') === condition.value;

      // Требования к флагам
      case 'has_flag':
        return flags?.has?.(condition.flag) || false;

      case 'not_flag':
        return !flags?.has?.(condition.flag);

      case 'flag_count':
        const flagCount = flags?.size || 0;
        return flagCount >= condition.value;

      // Требования к предметам
      case 'has_item':
        return run?.inventory?.includes?.(condition.item) || false;

      case 'item_count':
        return (run?.inventory?.length || 0) >= condition.value;

      // Требования к статистике
      case 'min_stat':
        const statValue = player?.stats?.[condition.stat] || 0;
        return statValue >= condition.value;

      case 'max_stat':
        const maxStatValue = player?.stats?.[condition.stat] || 0;
        return maxStatValue <= condition.value;

      // Требования к времени
      case 'time_before':
        const hourBefore = parseInt(condition.time.split(':')[0]);
        return (time?.currentTime || 22) < hourBefore;

      case 'time_after':
        const hourAfter = parseInt(condition.time.split(':')[0]);
        return (time?.currentTime || 22) >= hourAfter;

      case 'session_early':
        // Первая половина сессии (22:00 - 2:00)
        const currentHour = time?.currentTime || 22;
        return currentHour < 2 || currentHour >= 22;

      case 'session_late':
        // Вторая половина сессии (2:00 - 6:00)
        const lateHour = time?.currentTime || 22;
        return lateHour >= 2 && lateHour < 6;

      // Требования к деньгам
      case 'min_money':
        return (player?.stats?.money || 0) >= condition.value;

      case 'max_money':
        return (player?.stats?.money || 0) <= condition.value;

      // Требования к психике
      case 'min_mental':
        return (player?.stats?.mental_health || 0) >= condition.value;

      case 'max_mental':
        return (player?.stats?.mental_health || 0) <= condition.value;

      // Требования к выносливости
      case 'min_stamina':
        return (player?.stats?.stamina || 0) >= condition.value;

      // Требования к клиентам
      case 'clients_served':
        return (run?.stats?.clientsServed || 0) >= condition.value;

      case 'success_rate':
        const served = run?.stats?.clientsServed || 0;
        const satisfied = run?.stats?.satisfiedClients || 0;
        const rate = served > 0 ? satisfied / served : 0;
        return rate >= (condition.value / 100);

      // Случайное условие (шанс)
      case 'chance':
        return Math.random() < (condition.value || 0.5);

      default:
        console.warn(`Unknown condition type: ${condition.type}`);
        return true;
    }
  }

  /**
   * Проверить выбор в карте (требования навыков и т.д.)
   */
  canMakeChoice(choice, context) {
    const { player } = context;

    if (!choice.requiredSkills || Object.keys(choice.requiredSkills).length === 0) {
      return true;
    }

    for (const [skillId, requiredLevel] of Object.entries(choice.requiredSkills)) {
      if (!player?.skills?.meetsRequirement?.(skillId, requiredLevel)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Получить сообщение о невыполненном условии
   */
  getConditionFailMessage(condition) {
    const messages = {
      min_level: `Нужен общий уровень ${condition.value}`,
      min_skill: `Нужен навык "${condition.skill}" уровня ${condition.value}`,
      min_reputation: `Нужна репутация ${condition.value}`,
      has_flag: `Нужен флаг "${condition.flag}"`,
      not_flag: `Нельзя иметь флаг "${condition.flag}"`,
      has_item: `Нужен предмет "${condition.item}"`,
      min_stat: `Нужно ${condition.stat} >= ${condition.value}`,
      min_mental: `Нужна психика >= ${condition.value}`,
      min_stamina: `Нужна стамина >= ${condition.value}`,
      time_before: `Должно быть раньше ${condition.time}`,
      time_after: `Должно быть позже ${condition.time}`,
      session_late: 'Должна быть вторая половина ночи',
      min_money: `Нужно денег >= ${condition.value}`,
      clients_served: `Нужно обслужить клиентов >= ${condition.value}`
    };

    return messages[condition.type] || 'Невыполненное условие';
  }
}

export default ConditionEngine;

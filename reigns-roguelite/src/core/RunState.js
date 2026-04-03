/**
 * RunState - Состояние текущего "забега" (ночи)
 * Хранит временные данные, которые сбрасываются после отдыха
 * 
 * Отличие от player:
 * - player: постоянные данные (навыки, репутация, деньги, предметы)
 * - runState: временные данные на ночь (стамина, психика, баффы)
 */

class RunState {
  constructor() {
    this.reset();
  }

  /**
   * Сбросить состояние на начало ночи
   */
  reset() {
    // Ресурсы на ночь
    this.stamina = 60;
    this.maxStamina = 60;
    this.mental_health = 80;
    this.maxMentalHealth = 80;

    // Временные модификаторы (от предметов, баффов)
    this.modifiers = {
      staminaMultiplier: 1.0,
      mentalMultiplier: 1.0,
      luckMultiplier: 1.0,
      xpMultiplier: 1.0,
      moneyMultiplier: 1.0
    };

    // Временные эффекты (исчезают после ночи)
    this.buffs = [];
    this.debuffs = [];

    // Счётчики за ночь
    this.clientsServed = 0;
    this.actionsTaken = 0;
    this.totalEarned = 0;
    this.totalXp = 0;

    // Флаги состояния
    this.isResting = false;
    this.nightReason = null;
  }

  /**
   * Применить модификаторы от предметов
   * @param {Array} items - Предметы из инвентаря
   */
  applyItemModifiers(items = []) {
    this.resetModifiers();

    items.forEach(item => {
      if (item.modifiers) {
        if (item.modifiers.stamina) {
          this.modifiers.staminaMultiplier *= item.modifiers.stamina;
        }
        if (item.modifiers.mental) {
          this.modifiers.mentalMultiplier *= item.modifiers.mental;
        }
        if (item.modifiers.luck) {
          this.modifiers.luckMultiplier *= item.modifiers.luck;
        }
        if (item.modifiers.xp) {
          this.modifiers.xpMultiplier *= item.modifiers.xp;
        }
        if (item.modifiers.money) {
          this.modifiers.moneyMultiplier *= item.modifiers.money;
        }
      }
    });

    // Пересчитать макс. ресурсы
    this.recalculateMaxResources();
  }

  /**
   * Сбросить модификаторы к базовым
   */
  resetModifiers() {
    this.modifiers = {
      staminaMultiplier: 1.0,
      mentalMultiplier: 1.0,
      luckMultiplier: 1.0,
      xpMultiplier: 1.0,
      moneyMultiplier: 1.0
    };
  }

  /**
   * Пересчитать максимальные ресурсы с учётом модификаторов
   */
  recalculateMaxResources() {
    const baseStamina = 60;
    const baseMental = 80;

    this.maxStamina = Math.floor(baseStamina * this.modifiers.staminaMultiplier);
    this.maxMentalHealth = Math.floor(baseMental * this.modifiers.mentalMultiplier);
  }

  /**
   * Изменить стамину
   * @param {number} amount - Количество (отрицательное для расхода)
   * @returns {Object} Результат изменения
   */
  modifyStamina(amount) {
    const oldStamina = this.stamina;
    this.stamina = Math.max(0, Math.min(this.maxStamina, this.stamina + amount));

    return {
      success: amount >= 0 || oldStamina >= Math.abs(amount),
      oldValue: oldStamina,
      newValue: this.stamina,
      changed: this.stamina !== oldStamina
    };
  }

  /**
   * Изменить психику
   * @param {number} amount - Количество (отрицательное для расхода)
   * @returns {Object} Результат изменения
   */
  modifyMental(amount) {
    const oldMental = this.mental_health;
    this.mental_health = Math.max(0, Math.min(this.maxMentalHealth, this.mental_health + amount));

    return {
      success: amount >= 0 || oldMental >= Math.abs(amount),
      oldValue: oldMental,
      newValue: this.mental_health,
      changed: this.mental_health !== oldMental
    };
  }

  /**
   * Добавить временный эффект
   * @param {Object} effect - Данные эффекта
   * @param {string} effect.id - ID эффекта
   * @param {string} effect.type - 'buff' или 'debuff'
   * @param {number} effect.duration - Длительность в ходах
   * @param {Object} effect.modifiers - Модификаторы эффекта
   */
  addEffect(effect) {
    const effectData = {
      ...effect,
      remainingDuration: effect.duration || 1
    };

    if (effect.type === 'buff') {
      this.buffs.push(effectData);
    } else {
      this.debuffs.push(effectData);
    }

    // Применить модификаторы эффекта
    this.applyEffectModifiers(effectData);
  }

  /**
   * Применить модификаторы эффекта
   */
  applyEffectModifiers(effect) {
    if (effect.modifiers) {
      Object.keys(effect.modifiers).forEach(key => {
        if (this.modifiers.hasOwnProperty(key)) {
          this.modifiers[key] *= effect.modifiers[key];
        }
      });
    }
  }

  /**
   * Удалить эффект по ID
   */
  removeEffect(effectId) {
    const buffIndex = this.buffs.findIndex(b => b.id === effectId);
    if (buffIndex !== -1) {
      const effect = this.buffs.splice(buffIndex, 1)[0];
      // Отменить модификаторы
      if (effect.modifiers) {
        Object.keys(effect.modifiers).forEach(key => {
          if (this.modifiers.hasOwnProperty(key)) {
            this.modifiers[key] /= effect.modifiers[key];
          }
        });
      }
      return true;
    }

    const debuffIndex = this.debuffs.findIndex(d => d.id === effectId);
    if (debuffIndex !== -1) {
      const effect = this.debuffs.splice(debuffIndex, 1)[0];
      if (effect.modifiers) {
        Object.keys(effect.modifiers).forEach(key => {
          if (this.modifiers.hasOwnProperty(key)) {
            this.modifiers[key] /= effect.modifiers[key];
          }
        });
      }
      return true;
    }

    return false;
  }

  /**
   * Обновить длительность эффектов (конец хода)
   */
  tickEffects() {
    // Обновляем баффы
    this.buffs = this.buffs.filter(effect => {
      effect.remainingDuration--;
      if (effect.remainingDuration <= 0) {
        // Отменить модификаторы
        if (effect.modifiers) {
          Object.keys(effect.modifiers).forEach(key => {
            if (this.modifiers.hasOwnProperty(key)) {
              this.modifiers[key] /= effect.modifiers[key];
            }
          });
        }
        return false;
      }
      return true;
    });

    // Обновляем дебаффы
    this.debuffs = this.debuffs.filter(effect => {
      effect.remainingDuration--;
      if (effect.remainingDuration <= 0) {
        if (effect.modifiers) {
          Object.keys(effect.modifiers).forEach(key => {
            if (this.modifiers.hasOwnProperty(key)) {
              this.modifiers[key] /= effect.modifiers[key];
            }
          });
        }
        return false;
      }
      return true;
    });
  }

  /**
   * Проверить, достаточно ли стамины для действия
   * @param {number} cost - Стоимость действия
   * @returns {boolean}
   */
  hasStamina(cost) {
    return this.stamina >= cost;
  }

  /**
   * Проверить, достаточно ли психики для действия
   * @param {number} cost - Стоимость действия
   * @returns {boolean}
   */
  hasMental(cost) {
    return this.mental_health >= cost;
  }

  /**
   * Получить текущее состояние
   * @returns {Object}
   */
  getState() {
    return {
      stamina: this.stamina,
      maxStamina: this.maxStamina,
      mental_health: this.mental_health,
      maxMentalHealth: this.maxMentalHealth,
      modifiers: { ...this.modifiers },
      buffs: [...this.buffs],
      debuffs: [...this.debuffs],
      clientsServed: this.clientsServed,
      actionsTaken: this.actionsTaken,
      totalEarned: this.totalEarned,
      totalXp: this.totalXp
    };
  }

  /**
   * Сериализация для сохранения
   * @returns {Object}
   */
  serialize() {
    return {
      stamina: this.stamina,
      maxStamina: this.maxStamina,
      mental_health: this.mental_health,
      maxMentalHealth: this.maxMentalHealth,
      modifiers: { ...this.modifiers },
      buffs: [...this.buffs],
      debuffs: [...this.debuffs],
      clientsServed: this.clientsServed,
      actionsTaken: this.actionsTaken,
      totalEarned: this.totalEarned,
      totalXp: this.totalXp
    };
  }

  /**
   * Десериализация из сохранения
   * @param {Object} data
   */
  deserialize(data) {
    if (!data) return;

    this.stamina = data.stamina || 60;
    this.maxStamina = data.maxStamina || 60;
    this.mental_health = data.mental_health || 80;
    this.maxMentalHealth = data.maxMentalHealth || 80;
    this.modifiers = data.modifiers || {
      staminaMultiplier: 1.0,
      mentalMultiplier: 1.0,
      luckMultiplier: 1.0,
      xpMultiplier: 1.0,
      moneyMultiplier: 1.0
    };
    this.buffs = data.buffs || [];
    this.debuffs = data.debuffs || [];
    this.clientsServed = data.clientsServed || 0;
    this.actionsTaken = data.actionsTaken || 0;
    this.totalEarned = data.totalEarned || 0;
    this.totalXp = data.totalXp || 0;
  }
}

export default RunState;

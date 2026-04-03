/**
 * InventorySystem - Система предметов и магазина
 * Предметы покупаются за деньги, используются в хабе или во время сессии
 * 
 * Категории предметов:
 * - tool: инструменты (многоразовые, активируются на картах)
 * - consumable: расходники (одноразовые, используются из руки)
 * - accessory: аксессуары (пассивные бонусы, всегда активны)
 * - pet: питомцы (активируются в хабе)
 * - toy: игрушки (пассивные бонусы в хабе)
 */

import itemsData from '../data/items.json' with { type: 'json' };
import Logger from '../core/Logger.js';

class InventorySystem {
  constructor() {
    // Каталог предметов (из JSON)
    this.catalog = itemsData;

    // Инвентарь игрока
    this.inventory = [];
    
    // Активные предметы (счётчики использований)
    this.activeItems = {};
    
    // Пассивные эффекты от предметов
    this.passiveEffects = {};
  }

  /**
   * Проверить, есть ли предмет
   * @param {string} itemId 
   * @returns {boolean}
   */
  hasItem(itemId) {
    return this.inventory.includes(itemId);
  }

  /**
   * Получить предмет из каталога
   * @param {string} itemId 
   * @returns {Object|null}
   */
  getItem(itemId) {
    return this.catalog[itemId] || null;
  }

  /**
   * Получить все предметы каталога
   * @returns {Array}
   */
  getAllItems() {
    return Object.values(this.catalog);
  }

  /**
   * Получить предметы для магазина (все из каталога)
   * @returns {Array}
   */
  getShopItems() {
    return Object.values(this.catalog);
  }

  /**
   * Получить инвентарь
   * @returns {Array}
   */
  getInventory() {
    return this.inventory.map(id => this.catalog[id]).filter(Boolean);
  }

  /**
   * Можно ли купить предмет
   * @param {string} itemId 
   * @param {number} money 
   * @returns {boolean}
   */
  canBuy(itemId, money) {
    const item = this.catalog[itemId];
    if (!item) return false;
    if (this.hasItem(itemId) && item.category !== 'consumable') return false;
    return money >= item.price;
  }

  /**
   * Купить предмет
   * @param {string} itemId 
   * @param {number} money 
   * @returns {Object} Результат
   */
  buyItem(itemId, money) {
    if (!this.canBuy(itemId, money)) {
      const item = this.catalog[itemId];
      if (!item) {
        return { success: false, reason: 'Предмет не найден' };
      }
      if (this.hasItem(itemId) && item.category !== 'consumable') {
        return { success: false, reason: 'Уже есть' };
      }
      return { success: false, reason: 'Недостаточно денег' };
    }

    this.inventory.push(itemId);
    
    const item = this.catalog[itemId];
    return {
      success: true,
      item: {
        id: item.id,
        name: item.name,
        icon: item.icon
      },
      cost: item.price
    };
  }

  /**
   * Использовать предмет (расходуемый)
   * @param {string} itemId 
   * @returns {Object} Результат
   */
  useItem(itemId) {
    const item = this.catalog[itemId];
    if (!item) {
      return { success: false, reason: 'Предмет не найден' };
    }
    
    if (!this.hasItem(itemId)) {
      return { success: false, reason: 'Нет предмета' };
    }

    if (item.category !== 'consumable') {
      return { success: false, reason: 'Нельзя использовать' };
    }

    // Удаляем из инвентаря
    const index = this.inventory.indexOf(itemId);
    if (index > -1) {
      this.inventory.splice(index, 1);
    }

    return { success: true, used: itemId };
  }

  /**
   * Сериализация
   */
  serialize() {
    return {
      inventory: [...this.inventory],
      activeItems: { ...this.activeItems },
      passiveEffects: { ...this.passiveEffects }
    };
  }

  /**
   * Десериализация
   */
  deserialize(data) {
    if (!data || !data.inventory) return;
    this.inventory = [...data.inventory];
    if (data.activeItems) this.activeItems = { ...data.activeItems };
    if (data.passiveEffects) this.passiveEffects = { ...data.passiveEffects };
  }

  /**
   * Проверить, может ли предмет быть активирован на действии
   * @param {string} itemId - ID предмета
   * @param {string} actionId - ID действия
   * @returns {boolean}
   */
  canActivateOnAction(itemId, actionId) {
    const item = this.catalog[itemId];
    if (!item || !this.hasItem(itemId)) return false;
    
    // Пассивные предметы не активируются вручную
    if (item.passive) return false;
    
    // Если у предмета есть связь с действием
    if (item.actionLinks && item.actionLinks.length > 0) {
      return item.actionLinks.includes(actionId);
    }
    
    return false;
  }

  /**
   * Активировать предмет на действии
   * @param {string} itemId - ID предмета
   * @param {string} actionId - ID действия
   * @returns {Object} Результат активации
   */
  activateItem(itemId, actionId) {
    if (!this.canActivateOnAction(itemId, actionId)) {
      return { success: false, reason: 'Нельзя активировать на этом действии' };
    }

    const item = this.catalog[itemId];
    
    // Расходники
    if (item.category === 'consumable') {
      const uses = this.activeItems[itemId] || item.effect.uses || 1;
      if (uses <= 0) {
        return { success: false, reason: 'Предмет израсходован' };
      }
      
      // Уменьшаем счётчик
      this.activeItems[itemId] = uses - 1;
      
      // Если кончились — удаляем из инвентаря
      if (uses - 1 <= 0) {
        const index = this.inventory.indexOf(itemId);
        if (index > -1) {
          this.inventory.splice(index, 1);
        }
        delete this.activeItems[itemId];
      }
    }
    
    Logger.info('Item', `Активирован предмет: ${item.name} на действии ${actionId}`);
    
    return {
      success: true,
      item: {
        id: item.id,
        name: item.name,
        icon: item.icon
      },
      effect: item.effect
    };
  }

  /**
   * Получить эффект предмета для действия
   * @param {string} itemId - ID предмета
   * @param {Object} context - контекст (client, action, etc.)
   * @returns {Object|null}
   */
  getItemEffect(itemId, context = {}) {
    const item = this.catalog[itemId];
    if (!item || !this.hasItem(itemId)) return null;
    
    return {
      type: item.effect.type,
      data: item.effect,
      clientReactions: item.effect.clientReactions || null
    };
  }

  /**
   * Получить пассивные бонусы
   * @returns {Object}
   */
  getPassiveBonuses() {
    const bonuses = {
      trustMultiplier: 0,
      arousalBonus: 0,
      staminaSave: 0,
      mentalSave: 0
    };

    for (const itemId of this.inventory) {
      const item = this.catalog[itemId];
      if (item && item.passive && item.effect) {
        if (item.effect.type === 'trust_bonus') {
          bonuses.trustMultiplier += item.effect.trustMultiplier || 0;
        }
        if (item.effect.type === 'arousal_boost') {
          bonuses.arousalBonus += item.effect.arousalBonus || 0;
        }
      }
    }

    return bonuses;
  }

  /**
   * Получить активные эффекты для действия
   * @param {string} actionId - ID действия
   * @returns {Object} Активные эффекты
   */
  getActiveEffectsForAction(actionId) {
    const effects = {
      arousalBonus: 0,
      staminaDiscount: 0,
      mentalDiscount: 0,
      successChanceBonus: 0,
      trustBonus: 0
    };

    for (const itemId of this.inventory) {
      const item = this.catalog[itemId];
      if (!item || !this.hasItem(itemId)) continue;

      // Пассивные предметы (всегда активны)
      if (item.passive && item.effect) {
        if (item.effect.type === 'trust_bonus') {
          effects.trustBonus += item.effect.trustMultiplier || 0;
        }
        if (item.effect.type === 'arousal_boost') {
          effects.arousalBonus += item.effect.arousalBonus || 0;
        }
      }

      // Активированные предметы (с счётчиками)
      if (this.activeItems[itemId] && item.effect) {
        if (item.effect.type === 'arousal_boost') {
          effects.arousalBonus += item.effect.arousalBonus || 0;
        }
        if (item.effect.type === 'stamina_restore') {
          // Энергетик применяется мгновенно при активации
        }
        if (item.effect.type === 'reveal_size') {
          // Линейка применяется к осмотру
        }
      }
    }

    return effects;
  }

  /**
   * Применить мгновенный эффект предмета (например, энергетик)
   * @param {string} itemId
   * @param {Object} player
   * @returns {Object} Результат
   */
  applyInstantEffect(itemId, player) {
    const item = this.catalog[itemId];
    if (!item || !this.hasItem(itemId)) return null;

    if (item.effect.type === 'stamina_restore') {
      const restore = item.effect.staminaRestore || 0;
      player.stats.stamina = Math.min(player.stats.maxStamina, player.stats.stamina + restore);
      return { type: 'stamina_restore', value: restore };
    }

    return null;
  }
}

export default InventorySystem;

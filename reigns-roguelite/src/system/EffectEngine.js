/**
 * EffectEngine - Централизованная система для применения эффектов
 * Gloryhole Quest - поддержка новых статов: stamina, mental_health, money
 */

import Logger from '../core/Logger.js';

class EffectEngine {
  constructor(gameEngine) {
    this.gameEngine = gameEngine;
  }

  /**
   * Применить один эффект к состоянию игры
   * @param {Object} effect - Объект эффекта с типом и значением
   * @param {Object} context - Текущий контекст (игрок, run и т.д.)
   */
  applyEffect(effect, context) {
    const { player, run } = context;

    switch (effect.type) {
      // === Здоровье (HP) - для обратной совместимости ===
      case 'damage':
        if (player.stats.hp !== undefined) {
          player.stats.hp = Math.max(0, player.stats.hp - effect.value);
        }
        break;

      case 'heal':
        if (player.stats.hp !== undefined) {
          player.stats.hp = Math.min(player.stats.maxHp, player.stats.hp + effect.value);
        }
        break;

      case 'gain_hp':
        if (player.stats.hp !== undefined) {
          player.stats.hp = Math.min(player.stats.maxHp, player.stats.hp + effect.value);
        }
        break;

      case 'lose_hp':
        if (player.stats.hp !== undefined) {
          player.stats.hp = Math.max(0, player.stats.hp - effect.value);
        }
        break;

      // === Стамина ===
      case 'gain_stamina':
        player.stats.stamina = Math.min(player.stats.maxStamina, player.stats.stamina + effect.value);
        break;

      case 'lose_stamina':
        player.stats.stamina = Math.max(0, player.stats.stamina - effect.value);
        break;

      case 'set_max_stamina':
        player.stats.maxStamina += effect.value;
        break;

      // === Психическое здоровье ===
      case 'gain_mental':
      case 'gain_morale':
        player.stats.mental_health = Math.min(player.stats.maxMentalHealth, player.stats.mental_health + effect.value);
        break;

      case 'lose_mental':
      case 'lose_morale':
        player.stats.mental_health = Math.max(0, player.stats.mental_health - effect.value);
        break;

      case 'set_max_mental':
        player.stats.maxMentalHealth += effect.value;
        break;

      // === Деньги ===
      case 'gain_gold':
      case 'gain_money':
        player.stats.money += effect.value;
        if (this.gameEngine?.player?.metaProgression) {
          this.gameEngine.player.metaProgression.totalEarned += effect.value;
        }
        break;

      case 'lose_gold':
      case 'lose_money':
        player.stats.money = Math.max(0, player.stats.money - effect.value);
        break;

      // === Опыт и уровень ===
      case 'gain_xp':
        player.stats.xp += effect.value;
        this.checkLevelUp(player);
        break;

      case 'lose_xp':
        player.stats.xp = Math.max(0, player.stats.xp - effect.value);
        break;

      case 'gain_level':
        player.stats.level += effect.value;
        break;

      // === Репутация ===
      case 'gain_reputation':
        if (this.gameEngine?.reputationSystem) {
          this.gameEngine.reputationSystem.addReputation(effect.value);
        }
        break;

      case 'lose_reputation':
        if (this.gameEngine?.reputationSystem) {
          this.gameEngine.reputationSystem.removeReputation(effect.value);
        }
        break;

      // === Навыки ===
      case 'gain_skill_xp':
        // Будущая система XP для навыков
        if (effect.skillId && this.gameEngine?.skillSystem) {
          // Пока заглушка
        }
        break;

      // === Флаги ===
      case 'add_flag':
      case 'set_flag':
        if (run?.flags) {
          run.flags.add(effect.flag);
        }
        break;

      case 'remove_flag':
        if (run?.flags) {
          run.flags.delete(effect.flag);
        }
        break;

      // === Предметы ===
      case 'add_item':
        if (run?.inventory && !run.inventory.includes(effect.item)) {
          run.inventory.push(effect.item);
        }
        break;

      case 'remove_item':
        if (run?.inventory) {
          run.inventory = run.inventory.filter(item => item !== effect.item);
        }
        break;

      // === Общие статы ===
      case 'set_stat':
        if (player.stats[effect.stat] !== undefined) {
          player.stats[effect.stat] = effect.value;
        }
        break;

      case 'modify_stat':
        if (player.stats[effect.stat] !== undefined) {
          player.stats[effect.stat] += effect.value;
        }
        break;

      case 'multiply_stat':
        if (player.stats[effect.stat] !== undefined) {
          player.stats[effect.stat] *= effect.multiplier;
        }
        break;

      // === События ===
      case 'trigger_event':
        this.triggerEvent(effect.eventId, context);
        break;

      // === Специальные эффекты ===
      case 'end_run':
      case 'end_night':
        if (run) {
          run.isEnded = true;
          run.endReason = effect.reason || 'unknown';
        }
        break;

      case 'skip_card':
        if (run) {
          run.skipNextCard = true;
        }
        break;

      case 'draw_card':
        if (this.gameEngine?.drawCard) {
          this.gameEngine.drawCard();
        }
        break;

      default:
        console.warn(`Неизвестный тип эффекта: ${effect.type}`);
    }
  }

  /**
   * Применить несколько эффектов последовательно
   * @param {Array} effects - Массив объектов эффектов
   * @param {Object} context - Текущий контекст игры
   */
  applyEffects(effects, context) {
    if (!effects || !Array.isArray(effects)) return;

    effects.forEach(effect => {
      this.applyEffect(effect, context);
    });
  }

  /**
   * Проверить, должен ли игрок получить новый уровень
   */
  checkLevelUp(player) {
    const xpNeeded = player.stats.level * 100;
    if (player.stats.xp >= xpNeeded) {
      player.stats.level++;
      player.stats.xp -= xpNeeded;
      
      // Бонусы за уровень
      player.stats.maxStamina += 10;
      player.stats.maxMentalHealth += 10;
      player.stats.stamina = player.stats.maxStamina;
      player.stats.mental_health = player.stats.maxMentalHealth;

      // Событие повышения уровня
      if (this.gameEngine?.eventBus) {
        this.gameEngine.eventBus.emit('levelUp', { level: player.stats.level });
      }
    }
  }

  /**
   * Запустить специальное событие
   */
  triggerEvent(eventId, context) {
    if (this.gameEngine?.eventBus) {
      this.gameEngine.eventBus.emit('eventTriggered', { eventId });
    }
    Logger.debugModule('event', `Событие запущено: ${eventId}`);
  }

  /**
   * Проверить, можно ли применить эффект
   */
  canApplyEffect(effect, context) {
    const { player } = context;

    // Проверка: не убьёт ли эффект игрока
    if ((effect.type === 'damage' || effect.type === 'lose_hp') && player.stats.hp !== undefined) {
      return player.stats.hp > effect.value;
    }

    // Проверка: достаточно ли денег
    if (effect.type === 'lose_gold' || effect.type === 'lose_money') {
      return player.stats.money >= effect.value;
    }

    // Проверка: достаточно ли стамины
    if (effect.type === 'lose_stamina') {
      return player.stats.stamina >= effect.value;
    }

    // Проверка: достаточно ли психики
    if (effect.type === 'lose_mental' || effect.type === 'lose_morale') {
      return player.stats.mental_health >= effect.value;
    }

    return true;
  }
}

export default EffectEngine;

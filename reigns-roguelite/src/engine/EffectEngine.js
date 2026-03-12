/**
 * EffectEngine - Centralized system for interpreting and applying effects
 * All game logic for stat changes, flags, items, and events lives here
 * Cards only contain declarative effect data, never logic
 */

class EffectEngine {
  constructor(gameEngine) {
    this.gameEngine = gameEngine;
  }

  /**
   * Apply a single effect to the game state
   * @param {Object} effect - Effect object with type and value
   * @param {Object} context - Current game context (player, run, etc.)
   */
  applyEffect(effect, context) {
    const { player, run } = context;

    switch (effect.type) {
      // Stat modifications
      case 'damage':
        player.stats.hp = Math.max(0, player.stats.hp - effect.value);
        break;

      case 'heal':
        player.stats.hp = Math.min(player.stats.maxHp, player.stats.hp + effect.value);
        break;

      case 'gain_hp':
        player.stats.hp = Math.min(player.stats.maxHp, player.stats.hp + effect.value);
        break;

      case 'lose_hp':
        player.stats.hp = Math.max(0, player.stats.hp - effect.value);
        break;

      case 'gain_stamina':
        player.stats.stamina = Math.min(player.stats.maxStamina, player.stats.stamina + effect.value);
        break;

      case 'lose_stamina':
        player.stats.stamina = Math.max(0, player.stats.stamina - effect.value);
        break;

      case 'gain_gold':
        player.stats.gold += effect.value;
        run.stats.goldEarned += effect.value;
        break;

      case 'lose_gold':
        player.stats.gold = Math.max(0, player.stats.gold - effect.value);
        break;

      case 'gain_xp':
        player.stats.xp += effect.value;
        this.checkLevelUp(player);
        break;

      case 'lose_xp':
        player.stats.xp = Math.max(0, player.stats.xp - effect.value);
        break;

      case 'gain_morale':
        player.stats.morale = Math.min(100, player.stats.morale + effect.value);
        break;

      case 'lose_morale':
        player.stats.morale = Math.max(0, player.stats.morale - effect.value);
        break;

      case 'set_stat':
        player.stats[effect.stat] = effect.value;
        break;

      case 'modify_stat':
        if (player.stats[effect.stat] !== undefined) {
          player.stats[effect.stat] += effect.value;
        }
        break;

      // Flag system
      case 'add_flag':
        run.flags.add(effect.flag);
        break;

      case 'remove_flag':
        run.flags.delete(effect.flag);
        break;

      case 'set_flag':
        run.flags.add(effect.flag);
        break;

      // Item system
      case 'add_item':
        if (!run.inventory.includes(effect.item)) {
          run.inventory.push(effect.item);
        }
        break;

      case 'remove_item':
        run.inventory = run.inventory.filter(item => item !== effect.item);
        break;

      // Events
      case 'trigger_event':
        this.triggerEvent(effect.eventId, context);
        break;

      // Special effects
      case 'end_run':
        run.isEnded = true;
        run.endReason = effect.reason || 'unknown';
        break;

      case 'skip_card':
        run.skipNextCard = true;
        break;

      default:
        console.warn(`Unknown effect type: ${effect.type}`);
    }
  }

  /**
   * Apply multiple effects in sequence
   * @param {Array} effects - Array of effect objects
   * @param {Object} context - Current game context
   */
  applyEffects(effects, context) {
    if (!effects || !Array.isArray(effects)) return;

    effects.forEach(effect => {
      this.applyEffect(effect, context);
    });
  }

  /**
   * Check if player should level up
   */
  checkLevelUp(player) {
    const xpNeeded = player.stats.level * 100;
    if (player.stats.xp >= xpNeeded) {
      player.stats.level++;
      player.stats.xp -= xpNeeded;
      player.stats.maxHp += 5;
      player.stats.maxStamina += 2;
      player.stats.hp = player.stats.maxHp;
      player.stats.stamina = player.stats.maxStamina;
      
      // Emit level up event (if event bus exists)
      if (this.gameEngine?.eventBus) {
        this.gameEngine.eventBus.emit('levelUp', { level: player.stats.level });
      }
    }
  }

  /**
   * Trigger a special event
   */
  triggerEvent(eventId, context) {
    if (this.gameEngine?.eventBus) {
      this.gameEngine.eventBus.emit('eventTriggered', { eventId });
    }
    console.log(`Event triggered: ${eventId}`);
  }

  /**
   * Validate if an effect can be applied
   */
  canApplyEffect(effect, context) {
    const { player } = context;

    // Check if applying this effect would kill the player
    if (effect.type === 'damage' || effect.type === 'lose_hp') {
      return player.stats.hp > effect.value;
    }

    // Check if player has enough gold
    if (effect.type === 'lose_gold') {
      return player.stats.gold >= effect.value;
    }

    return true;
  }
}

export default EffectEngine;

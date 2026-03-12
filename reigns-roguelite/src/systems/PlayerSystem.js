/**
 * PlayerSystem - Manages player stats and state
 * Stats are dynamic and can be extended without code changes
 */

class PlayerSystem {
  constructor() {
    this.defaultStats = {
      hp: 20,
      maxHp: 20,
      stamina: 10,
      maxStamina: 10,
      gold: 0,
      xp: 0,
      level: 1,
      morale: 50
    };
  }

  /**
   * Create a new player with default or custom stats
   */
  createPlayer(customStats = {}) {
    return {
      stats: { ...this.defaultStats, ...customStats },
      upgrades: [],
      flags: new Set(),
      inventory: []
    };
  }

  /**
   * Reset player stats for a new run (keeps meta-progression)
   */
  resetForRun(player) {
    player.stats.hp = player.stats.maxHp;
    player.stats.stamina = player.stats.maxStamina;
    player.stats.gold = 0;
    player.stats.morale = 50;
    return player;
  }

  /**
   * Apply an upgrade to the player
   */
  applyUpgrade(player, upgrade) {
    if (upgrade.stat && upgrade.value) {
      if (upgrade.isMultiplier) {
        player.stats[upgrade.stat] *= (1 + upgrade.value);
        if (upgrade.stat.startsWith('max')) {
          const baseStat = upgrade.stat.replace('max', '');
          const lowerBase = baseStat.charAt(0).toLowerCase() + baseStat.slice(1);
          if (player.stats[lowerBase] !== undefined) {
            player.stats[lowerBase] = player.stats[upgrade.stat];
          }
        }
      } else {
        player.stats[upgrade.stat] += upgrade.value;
        // Also update current value if it's a max stat
        if (upgrade.stat.startsWith('max')) {
          const baseStat = upgrade.stat.replace('max', '');
          const lowerBase = baseStat.charAt(0).toLowerCase() + baseStat.slice(1);
          if (player.stats[lowerBase] !== undefined) {
            player.stats[lowerBase] = player.stats[upgrade.stat];
          }
        }
      }
    }

    if (!player.upgrades.includes(upgrade.id)) {
      player.upgrades.push(upgrade.id);
    }
  }

  /**
   * Check if player is alive
   */
  isAlive(player) {
    return player.stats.hp > 0;
  }

  /**
   * Get stat value by name (dynamic access)
   */
  getStat(player, statName) {
    return player.stats[statName];
  }

  /**
   * Set stat value by name (dynamic access)
   */
  setStat(player, statName, value) {
    if (player.stats[statName] !== undefined) {
      player.stats[statName] = value;
    }
  }

  /**
   * Modify stat by value (dynamic access)
   */
  modifyStat(player, statName, delta) {
    if (player.stats[statName] !== undefined) {
      player.stats[statName] += delta;
    }
  }

  /**
   * Serialize player state for saving
   */
  serialize(player) {
    return {
      stats: { ...player.stats },
      upgrades: [...player.upgrades],
      flags: Array.from(player.flags),
      inventory: [...player.inventory]
    };
  }

  /**
   * Deserialize player state from save data
   */
  deserialize(data) {
    return {
      stats: { ...data.stats },
      upgrades: [...(data.upgrades || [])],
      flags: new Set(data.flags || []),
      inventory: [...(data.inventory || [])]
    };
  }
}

export default PlayerSystem;

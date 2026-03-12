/**
 * RunManager - Manages individual game runs
 * Separates run state from persistent player progress
 */

class RunManager {
  constructor() {
    this.currentRun = null;
  }

  /**
   * Start a new run
   */
  startRun(player) {
    this.currentRun = {
      isActive: true,
      isEnded: false,
      turnNumber: 0,
      cardsDrawn: 0,
      flags: new Set(),
      inventory: [],
      stats: {
        goldEarned: 0,
        damageDealt: 0,
        enemiesDefeated: 0,
        cardsPlayed: 0
      },
      endReason: null,
      skipNextCard: false
    };
    return this.currentRun;
  }

  /**
   * End the current run
   */
  endRun(reason = 'unknown') {
    if (!this.currentRun) return null;

    this.currentRun.isEnded = true;
    this.currentRun.isActive = false;
    this.currentRun.endReason = reason;

    const completedRun = { ...this.currentRun };
    this.currentRun = null;

    return completedRun;
  }

  /**
   * Check if run should end (player death, etc.)
   */
  checkRunEnd(player) {
    if (!this.currentRun?.isActive) return false;

    // Check if player is dead
    if (player.stats.hp <= 0) {
      this.endRun('death');
      return true;
    }

    // Check if morale is depleted (optional mechanic)
    if (player.stats.morale <= 0) {
      this.endRun('morale_depleted');
      return true;
    }

    return false;
  }

  /**
   * Advance to next turn
   */
  nextTurn() {
    if (!this.currentRun) return;

    this.currentRun.turnNumber++;
  }

  /**
   * Record card drawn
   */
  recordCardDrawn(cardId) {
    if (!this.currentRun) return;

    this.currentRun.cardsDrawn++;
  }

  /**
   * Record stat change
   */
  recordStat(statName, value) {
    if (!this.currentRun) return;

    if (this.currentRun.stats[statName] !== undefined) {
      this.currentRun.stats[statName] += value;
    }
  }

  /**
   * Get current run stats
   */
  getStats() {
    if (!this.currentRun) return null;

    return {
      ...this.currentRun.stats,
      turnNumber: this.currentRun.turnNumber,
      cardsDrawn: this.currentRun.cardsDrawn
    };
  }

  /**
   * Serialize run state for saving
   */
  serialize() {
    if (!this.currentRun) return null;

    return {
      ...this.currentRun,
      flags: Array.from(this.currentRun.flags)
    };
  }

  /**
   * Deserialize run state from save data
   */
  deserialize(data) {
    if (!data) return null;

    this.currentRun = {
      ...data,
      flags: new Set(data.flags || [])
    };

    return this.currentRun;
  }

  /**
   * Check if a run is active
   */
  isRunActive() {
    return this.currentRun?.isActive === true;
  }

  /**
   * Get current run object
   */
  getCurrentRun() {
    return this.currentRun;
  }
}

export default RunManager;

/**
 * FlagSystem - Manages story flags and decision tracking
 * Allows cards to have conditions based on previous choices
 */

class FlagSystem {
  constructor() {
    this.flags = new Set();
  }

  /**
   * Add a flag
   */
  addFlag(flag) {
    this.flags.add(flag);
  }

  /**
   * Remove a flag
   */
  removeFlag(flag) {
    this.flags.delete(flag);
  }

  /**
   * Check if a flag exists
   */
  hasFlag(flag) {
    return this.flags.has(flag);
  }

  /**
   * Get all flags
   */
  getAllFlags() {
    return new Set(this.flags);
  }

  /**
   * Clear all flags
   */
  clear() {
    this.flags.clear();
  }

  /**
   * Set multiple flags at once
   */
  setFlags(flagsArray) {
    flagsArray.forEach(flag => this.flags.add(flag));
  }

  /**
   * Check multiple flags (all must be present)
   */
  hasAllFlags(flagsArray) {
    return flagsArray.every(flag => this.flags.has(flag));
  }

  /**
   * Check if any of the flags are present
   */
  hasAnyFlag(flagsArray) {
    return flagsArray.some(flag => this.flags.has(flag));
  }

  /**
   * Serialize flags for saving
   */
  serialize() {
    return Array.from(this.flags);
  }

  /**
   * Deserialize flags from save data
   */
  deserialize(data) {
    this.flags = new Set(data || []);
  }
}

export default FlagSystem;

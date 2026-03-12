/**
 * DeckSystem - Manages card selection with weighted random, tags, and cooldowns
 * Prevents repetitive cards and ensures variety in gameplay
 */

class DeckSystem {
  constructor(cards) {
    this.allCards = cards;
    this.cooldowns = new Map(); // cardId -> remaining cooldown
    this.recentCards = []; // Last N cards drawn
    this.maxRecentSize = 5;
  }

  /**
   * Get all cards that are currently available to draw
   */
  getAvailableCards(run) {
    return this.allCards.filter(card => {
      // Check cooldown
      if (this.cooldowns.has(card.id) && this.cooldowns.get(card.id) > 0) {
        return false;
      }

      // Check conditions
      if (card.conditions && !this.checkConditions(card.conditions, run)) {
        return false;
      }

      // Check if recently drawn
      if (this.recentCards.includes(card.id)) {
        return false;
      }

      return true;
    });
  }

  /**
   * Check if card meets all conditions
   */
  checkConditions(conditions, run) {
    const { player, flags } = run;

    for (const condition of conditions) {
      switch (condition.type) {
        case 'min_level':
          if (player.stats.level < condition.value) return false;
          break;

        case 'min_gold':
          if (player.stats.gold < condition.value) return false;
          break;

        case 'min_hp':
          if (player.stats.hp < condition.value) return false;
          break;

        case 'max_hp':
          if (player.stats.hp > condition.value) return false;
          break;

        case 'has_flag':
          if (!flags.has(condition.flag)) return false;
          break;

        case 'missing_flag':
          if (flags.has(condition.flag)) return false;
          break;

        case 'has_item':
          if (!run.inventory.includes(condition.item)) return false;
          break;

        case 'tag_required':
          if (!card.tags?.includes(condition.tag)) return false;
          break;
      }
    }

    return true;
  }

  /**
   * Draw a card using weighted random selection
   */
  drawCard(run, tagFilter = null) {
    let availableCards = this.getAvailableCards(run);

    // Apply tag filter if specified
    if (tagFilter) {
      availableCards = availableCards.filter(card => 
        card.tags?.includes(tagFilter)
      );
    }

    // Fallback: if no cards available, reset cooldowns
    if (availableCards.length === 0) {
      this.resetCooldowns();
      this.recentCards = [];
      availableCards = this.getAvailableCards(run);
    }

    if (availableCards.length === 0) {
      console.warn('No cards available to draw!');
      return null;
    }

    // Weighted random selection
    const totalWeight = availableCards.reduce((sum, card) => sum + (card.weight || 1), 0);
    let random = Math.random() * totalWeight;

    for (const card of availableCards) {
      random -= (card.weight || 1);
      if (random <= 0) {
        this.onCardDrawn(card);
        return card;
      }
    }

    // Fallback to last card
    const selectedCard = availableCards[availableCards.length - 1];
    this.onCardDrawn(selectedCard);
    return selectedCard;
  }

  /**
   * Called when a card is drawn
   */
  onCardDrawn(card) {
    // Add to recent cards
    this.recentCards.push(card.id);
    if (this.recentCards.length > this.maxRecentSize) {
      this.recentCards.shift();
    }

    // Set cooldown
    if (card.cooldown) {
      this.cooldowns.set(card.id, card.cooldown);
    }
  }

  /**
   * Decrease all cooldowns by 1
   */
  tickCooldowns() {
    for (const [cardId, cooldown] of this.cooldowns.entries()) {
      if (cooldown > 0) {
        this.cooldowns.set(cardId, cooldown - 1);
      }
    }
  }

  /**
   * Reset all cooldowns
   */
  resetCooldowns() {
    this.cooldowns.clear();
  }

  /**
   * Get cards by tag
   */
  getCardsByTag(tag) {
    return this.allCards.filter(card => card.tags?.includes(tag));
  }

  /**
   * Get a specific card by ID
   */
  getCardById(cardId) {
    return this.allCards.find(card => card.id === cardId);
  }

  /**
   * Get deck statistics
   */
  getStats() {
    const stats = {
      totalCards: this.allCards.length,
      availableCards: this.getAvailableCards({ 
        player: { stats: { level: 1, gold: 0, hp: 20 } }, 
        flags: new Set(),
        inventory: []
      }).length,
      cardsOnCooldown: Array.from(this.cooldowns.entries())
        .filter(([_, cd]) => cd > 0).length,
      tags: {}
    };

    // Count cards by tag
    this.allCards.forEach(card => {
      card.tags?.forEach(tag => {
        stats.tags[tag] = (stats.tags[tag] || 0) + 1;
      });
    });

    return stats;
  }

  /**
   * Serialize deck state for saving
   */
  serialize() {
    return {
      cooldowns: Array.from(this.cooldowns.entries()),
      recentCards: [...this.recentCards]
    };
  }

  /**
   * Deserialize deck state from save data
   */
  deserialize(data) {
    this.cooldowns = new Map(data.cooldowns || []);
    this.recentCards = data.recentCards || [];
  }
}

export default DeckSystem;

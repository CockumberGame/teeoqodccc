/**
 * GameEngine - Main orchestrator for all game systems
 * Coordinates between systems but contains minimal logic itself
 */

import PlayerSystem from '../systems/PlayerSystem.js';
import DeckSystem from '../systems/DeckSystem.js';
import RunManager from '../systems/RunManager.js';
import FlagSystem from '../systems/FlagSystem.js';
import EffectEngine from './EffectEngine.js';
import cardsData from '../data/cards.json' assert { type: 'json' };

class GameEngine {
  constructor() {
    this.playerSystem = new PlayerSystem();
    this.runManager = new RunManager();
    this.flagSystem = new FlagSystem();
    this.deckSystem = new DeckSystem(cardsData);
    this.effectEngine = new EffectEngine(this);
    
    this.player = null;
    this.currentCard = null;
    this.gameState = 'menu'; // menu, playing, runEnded, gameOver
    this.eventBus = {
      listeners: {},
      on(event, callback) {
        if (!this.listeners[event]) {
          this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
      },
      emit(event, data) {
        if (this.listeners[event]) {
          this.listeners[event].forEach(callback => callback(data));
        }
      }
    };

    this.setupEventListeners();
  }

  setupEventListeners() {
    this.eventBus.on('cardChosen', (data) => {
      console.log('Card chosen:', data);
    });

    this.eventBus.on('statChanged', (data) => {
      console.log('Stat changed:', data);
    });

    this.eventBus.on('runEnded', (data) => {
      console.log('Run ended:', data);
    });
  }

  /**
   * Initialize a new player (meta-progression)
   */
  initPlayer() {
    this.player = this.playerSystem.createPlayer();
    return this.player;
  }

  /**
   * Start a new run
   */
  startRun() {
    if (!this.player) {
      this.initPlayer();
    }

    // Reset player for run (keeps meta-progression)
    this.playerSystem.resetForRun(this.player);

    // Start new run
    const run = this.runManager.startRun(this.player);

    // Reset flag system for new run
    this.flagSystem.clear();

    this.gameState = 'playing';
    this.currentCard = null;

    this.eventBus.emit('runStarted', { player: this.player, run });

    return { player: this.player, run };
  }

  /**
   * Draw the next card
   */
  drawCard() {
    if (!this.runManager.isRunActive()) {
      return null;
    }

    const run = this.runManager.getCurrentRun();
    
    // Create context for deck system
    const context = {
      player: this.player,
      flags: this.flagSystem.getAllFlags(),
      inventory: run.inventory
    };

    this.currentCard = this.deckSystem.drawCard(context);
    
    if (this.currentCard) {
      this.runManager.recordCardDrawn(this.currentCard.id);
    }

    return this.currentCard;
  }

  /**
   * Make a choice on the current card
   */
  makeChoice(choiceIndex) {
    if (!this.currentCard || !this.runManager.isRunActive()) {
      return false;
    }

    const choice = this.currentCard.choices[choiceIndex];
    if (!choice) {
      return false;
    }

    const run = this.runManager.getCurrentRun();
    const context = {
      player: this.player,
      run: {
        ...run,
        flags: this.flagSystem.getAllFlags()
      }
    };

    // Apply effects
    this.effectEngine.applyEffects(choice.effects, context);

    // Add any flags from the choice
    if (choice.setFlag) {
      this.flagSystem.addFlag(choice.setFlag);
    }

    // Emit event
    this.eventBus.emit('cardChosen', {
      cardId: this.currentCard.id,
      choiceIndex,
      choiceText: choice.text
    });

    // Check if run should end
    const runEnded = this.runManager.checkRunEnd(this.player);

    if (runEnded) {
      this.gameState = 'gameOver';
      this.eventBus.emit('runEnded', {
        reason: this.runManager.getCurrentRun()?.endReason,
        stats: this.runManager.getStats()
      });
    } else {
      // Move to next turn
      this.runManager.nextTurn();
      this.deckSystem.tickCooldowns();
      
      // Draw next card
      this.drawCard();
    }

    return true;
  }

  /**
   * Get current game state
   */
  getGameState() {
    return {
      gameState: this.gameState,
      player: this.player ? this.playerSystem.serialize(this.player) : null,
      currentCard: this.currentCard,
      run: this.runManager.serialize(),
      runStats: this.runManager.getStats()
    };
  }

  /**
   * End current run manually (e.g., player quits)
   */
  endRun(reason = 'quit') {
    const completedRun = this.runManager.endRun(reason);
    this.gameState = 'runEnded';
    
    this.eventBus.emit('runEnded', {
      reason,
      stats: this.runManager.getStats(),
      run: completedRun
    });

    return completedRun;
  }

  /**
   * Apply an upgrade (meta-progression)
   */
  applyUpgrade(upgrade) {
    if (!this.player) return false;

    this.playerSystem.applyUpgrade(this.player, upgrade);
    return true;
  }

  /**
   * Save game state
   */
  saveGame() {
    const state = this.getGameState();
    localStorage.setItem('reigns_roguelite_save', JSON.stringify(state));
    return state;
  }

  /**
   * Load game state
   */
  loadGame() {
    const saved = localStorage.getItem('reigns_roguelite_save');
    if (!saved) return false;

    try {
      const state = JSON.parse(saved);
      
      if (state.player) {
        this.player = this.playerSystem.deserialize(state.player);
      }

      if (state.run) {
        this.runManager.deserialize(state.run);
      }

      this.gameState = state.gameState || 'menu';
      this.currentCard = state.currentCard || null;

      return true;
    } catch (e) {
      console.error('Failed to load save:', e);
      return false;
    }
  }

  /**
   * Clear save data
   */
  clearSave() {
    localStorage.removeItem('reigns_roguelite_save');
  }
}

export default GameEngine;

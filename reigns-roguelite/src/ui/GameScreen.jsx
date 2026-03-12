/**
 * GameScreen - Main game screen that orchestrates the gameplay
 */

import React, { useState, useEffect } from 'react';
import StatsPanel from './StatsPanel.jsx';
import CardView from './CardView.jsx';
import BaseScreen from './BaseScreen.jsx';

const upgradesData = [
  {
    id: 'max_hp_up',
    name: 'Increased Vitality',
    description: '+5 Max HP',
    stat: 'maxHp',
    value: 5,
    isMultiplier: false
  },
  {
    id: 'max_stamina_up',
    name: 'Endurance Training',
    description: '+3 Max Stamina',
    stat: 'maxStamina',
    value: 3,
    isMultiplier: false
  },
  {
    id: 'luck_up',
    name: 'Lucky Charm',
    description: 'Increases luck (future stat)',
    stat: 'luck',
    value: 1,
    isMultiplier: false
  }
];

function GameScreen({ gameEngine }) {
  const [gameState, setGameState] = useState(gameEngine.getGameState());
  const [availableUpgrades, setAvailableUpgrades] = useState(upgradesData);

  // Subscribe to game state changes
  useEffect(() => {
    const updateState = () => {
      setGameState(gameEngine.getGameState());
    };

    gameEngine.eventBus.on('statChanged', updateState);
    gameEngine.eventBus.on('cardChosen', updateState);
    gameEngine.eventBus.on('runEnded', updateState);

    return () => {
      // Cleanup if needed
    };
  }, [gameEngine]);

  const handleStartRun = () => {
    gameEngine.startRun();
    gameEngine.drawCard();
    setGameState(gameEngine.getGameState());
  };

  const handleChoice = (choiceIndex) => {
    gameEngine.makeChoice(choiceIndex);
    setGameState(gameEngine.getGameState());
  };

  const handleBuyUpgrade = (upgrade) => {
    gameEngine.applyUpgrade(upgrade);
    setGameState(gameEngine.getGameState());
    // Remove purchased upgrade from available list
    setAvailableUpgrades(prev => prev.filter(u => u.id !== upgrade.id));
  };

  const renderGame = () => {
    if (gameState.gameState === 'menu' || gameState.gameState === 'runEnded') {
      return (
        <BaseScreen
          player={gameState.player}
          upgrades={availableUpgrades}
          onStartRun={handleStartRun}
          onBuyUpgrade={handleBuyUpgrade}
        />
      );
    }

    if (gameState.gameState === 'gameOver') {
      return (
        <div className="game-over-screen">
          <h2>Game Over</h2>
          <p>Reason: {gameState.run?.endReason || 'Unknown'}</p>
          {gameState.runStats && (
            <div className="run-stats">
              <h3>Run Statistics</h3>
              <div>Turns Survived: {gameState.runStats.turnNumber}</div>
              <div>Cards Drawn: {gameState.runStats.cardsDrawn}</div>
              <div>Gold Earned: {gameState.runStats.goldEarned}</div>
            </div>
          )}
          <button className="restart-button" onClick={handleStartRun}>
            Try Again
          </button>
          <button 
            className="menu-button" 
            onClick={() => {
              gameEngine.endRun('quit');
              setGameState(gameEngine.getGameState());
            }}
          >
            Back to Menu
          </button>
        </div>
      );
    }

    return (
      <div className="game-screen">
        <StatsPanel player={gameState.player} />
        <CardView card={gameState.currentCard} onChoice={handleChoice} />
      </div>
    );
  };

  return (
    <div className="app-container">
      {renderGame()}
    </div>
  );
}

export default GameScreen;

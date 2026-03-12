/**
 * BaseScreen - Main menu and upgrade screen between runs
 */

import React from 'react';

function BaseScreen({ player, upgrades, onStartRun, onBuyUpgrade }) {
  return (
    <div className="base-screen">
      <h1 className="game-title">Reigns Roguelite</h1>
      
      {player && (
        <div className="player-stats-summary">
          <h2>Your Progress</h2>
          <div className="stat-summary">
            <div>Level: {player.stats?.level || 1}</div>
            <div>Max HP: {player.stats?.maxHp || 20}</div>
            <div>Upgrades: {player.upgrades?.length || 0}</div>
          </div>
        </div>
      )}

      <button className="start-run-button" onClick={onStartRun}>
        Start New Run
      </button>

      {upgrades && upgrades.length > 0 && (
        <div className="upgrades-section">
          <h2>Available Upgrades</h2>
          <div className="upgrades-list">
            {upgrades.map((upgrade, index) => (
              <div key={index} className="upgrade-item">
                <div className="upgrade-info">
                  <div className="upgrade-name">{upgrade.name}</div>
                  <div className="upgrade-description">{upgrade.description}</div>
                </div>
                <button 
                  className="buy-upgrade-button"
                  onClick={() => onBuyUpgrade(upgrade)}
                >
                  Buy
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default BaseScreen;

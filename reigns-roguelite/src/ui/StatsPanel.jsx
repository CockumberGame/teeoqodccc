/**
 * StatsPanel - Displays player stats at the top of the screen
 */

import React from 'react';

function StatsPanel({ player }) {
  if (!player?.stats) return null;

  const { hp, maxHp, stamina, maxStamina, gold, xp, level, morale } = player.stats;

  const hpPercent = (hp / maxHp) * 100;
  const staminaPercent = (stamina / maxStamina) * 100;
  const moralePercent = morale;

  return (
    <div className="stats-panel">
      <div className="stat-row">
        <div className="stat-label">HP</div>
        <div className="stat-bar-container">
          <div 
            className="stat-bar hp-bar" 
            style={{ width: `${hpPercent}%` }}
          />
        </div>
        <div className="stat-value">{hp}/{maxHp}</div>
      </div>

      <div className="stat-row">
        <div className="stat-label">STA</div>
        <div className="stat-bar-container">
          <div 
            className="stat-bar stamina-bar" 
            style={{ width: `${staminaPercent}%` }}
          />
        </div>
        <div className="stat-value">{stamina}/{maxStamina}</div>
      </div>

      <div className="stat-row">
        <div className="stat-label">GLD</div>
        <div className="stat-value gold-text">{gold}</div>
      </div>

      <div className="stat-row">
        <div className="stat-label">LVL</div>
        <div className="stat-value level-text">{level}</div>
      </div>

      <div className="stat-row">
        <div className="stat-label">MOR</div>
        <div className="stat-bar-container">
          <div 
            className="stat-bar morale-bar" 
            style={{ width: `${moralePercent}%` }}
          />
        </div>
        <div className="stat-value">{morale}</div>
      </div>

      <div className="stat-row">
        <div className="stat-label">XP</div>
        <div className="stat-value xp-text">{xp}</div>
      </div>
    </div>
  );
}

export default StatsPanel;

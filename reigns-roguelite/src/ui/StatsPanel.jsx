/**
 * StatsPanel - Компактное отображение статов игрока
 * Gloryhole Quest - статы в ряд, без времени (оно в общем блоке)
 * iPhone 17 width optimized
 */

import React from 'react';

function StatsPanel({ player, time, remainingTurns }) {
  if (!player?.stats) return null;

  const { stamina, maxStamina, mental_health, maxMentalHealth, money, xp, level } = player.stats;

  const staminaPercent = (stamina / maxStamina) * 100;
  const mentalPercent = (mental_health / maxMentalHealth) * 100;

  return (
    <div className="stats-panel">
      {/* Все статы в одну строку - компактно */}
      <div className="stats-row-inline">
        {/* Стамина */}
        <div className="inline-stat stamina-stat">
          <div className="inline-stat-icon">💪</div>
          <div className="inline-stat-bar">
            <div
              className="inline-stat-bar-fill stamina-fill"
              style={{ width: `${staminaPercent}%` }}
            />
          </div>
          <div className="inline-stat-value">{stamina}</div>
        </div>

        {/* Психика */}
        <div className="inline-stat mental-stat">
          <div className="inline-stat-icon">🧠</div>
          <div className="inline-stat-bar">
            <div
              className="inline-stat-bar-fill mental-fill"
              style={{ width: `${mentalPercent}%` }}
            />
          </div>
          <div className="inline-stat-value">{mental_health}</div>
        </div>

        {/* Деньги */}
        <div className="inline-stat money-stat">
          <div className="inline-stat-icon">💰</div>
          <div className="inline-stat-value">${money}</div>
        </div>
      </div>
    </div>
  );
}

export default StatsPanel;

// Стили добавлены в index.css

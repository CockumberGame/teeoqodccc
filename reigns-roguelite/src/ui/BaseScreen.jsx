/**
 * BaseScreen - Главное меню
 * Gloryhole Quest - переведено на русский
 */

import React from 'react';

function BaseScreen({ gameState, onStartNight, onGameEvent }) {
  const player = gameState?.player;

  return (
    <div className="base-screen">
      <h1 className="game-title">🍩 Gloryhole Quest</h1>
      <p className="game-subtitle">Ночная работа мечты</p>

      {player ? (
        <div className="player-summary">
          <h2>👤 {player.name}</h2>
          <div className="summary-stats">
            <div>💰 Деньги: ${player.stats?.money || 100}</div>
            <div>💪 Стамина: {player.stats?.stamina}/{player.stats?.maxStamina}</div>
            <div>🧠 Психика: {player.stats?.mental_health}/{player.stats?.maxMentalHealth}</div>
            <div>⭐ Уровень: {player.stats?.level || 1}</div>
            <div>🌙 Ночей отработано: {player.metaProgression?.totalNights || 0}</div>
          </div>
        </div>
      ) : (
        <div className="welcome-message">
          <p>Добро пожаловать в Gloryhole Quest!</p>
          <p>Тебя ждёт ночь полная приключений...</p>
        </div>
      )}

      <div className="menu-buttons">
        <button 
          className="start-night-button" 
          onClick={onStartNight}
          disabled={player?.stats?.stamina < 10}
        >
          🌙 Начать ночь
        </button>
        
        {player?.stats?.stamina < 10 && (
          <p className="warning-text">
            ⚠️ Недостаточно стамины! Отдохни дома.
          </p>
        )}
      </div>

      <div className="game-info">
        <h3>📖 Как играть:</h3>
        <ul>
          <li>Работай с 22:00 до 6:00</li>
          <li>Следи за стамина и психикой</li>
          <li>Зарабатывай деньги и репутацию</li>
          <li>Прокачивай навыки дома</li>
        </ul>
      </div>
    </div>
  );
}

export default BaseScreen;

/**
 * NightSummaryOverlay - Экран завершения ночи
 * Gloryhole Quest - показывает статистику сессии перед возвратом в хаб
 */

import React from 'react';
import { useGame } from '../context/GameContext.jsx';

function NightSummaryOverlay({ onClose }) {
  const { state, engine } = useGame();

  // Получаем данные из summary или напрямую из engine
  const summary = state.summary;
  const sessionStats = summary?.stats || engine.sessionStats;
  const moneyEarned = summary?.moneyEarned || 0;
  const xpEarned = summary?.xpEarned || 0;
  const reason = summary?.reason;
  const penalties = summary?.penalties;  // Данные о штрафах

  // Игрок из state.game.player
  const player = state.game?.player;

  // Вычисляем значения
  const clientsServed = sessionStats?.clientsServed || 0;
  const satisfiedClients = sessionStats?.satisfiedClients || 0;
  const totalEarned = sessionStats?.totalEarned || 0;
  const totalXp = sessionStats?.totalXp || 0;
  const actionsTaken = sessionStats?.actionsTaken || 0;
  const earlyFinishes = sessionStats?.earlyFinishes || 0;

  // Финансы
  const moneyBeforeNight = player?.stats?.money - moneyEarned;
  const moneyPenalty = penalties?.moneyLost || 0;  // Штраф за побег
  const moneySpent = 0;  // Пока нет трат во время ночи
  const moneyTotal = player?.stats?.money || 0;

  // Репутация
  const reputationGainFromClients = satisfiedClients > 0 ? satisfiedClients * 3 : 0;
  const reputationPenalty = penalties?.reputationLoss || 0;  // Штраф за побег
  const totalReputationChange = reputationGainFromClients - reputationPenalty;
  
  // Формируем текст причины завершения
  const getReasonText = () => {
    switch (reason) {
      case 'clients_finished': return 'Все клиенты обслужены';
      case 'staminaDepleted': return 'Слишком устали';
      case 'mentalExhausted': return 'Психическое истощение';
      case 'timeExpired': return 'Время вышло';
      default: return 'Ночь завершена';
    }
  };

  const handleGoHome = () => {
    if (onClose) onClose();
  };

  return (
    <div className="night-summary-overlay dos-terminal">
      <div className="summary-container">
        {/* Заголовок */}
        <div className="summary-header">
          <h1 className="summary-title">🌙 НОЧЬ ЗАВЕРШЕНА</h1>
          <p className="summary-reason">{getReasonText()}</p>
        </div>

        {/* Статистика ночи */}
        <div className="summary-section">
          <h2 className="section-title">📊 СТАТИСТИКА НОЧИ</h2>
          <div className="stats-box">
            <div className="stat-row">
              <span className="stat-label">👥 Клиентов обслужено:</span>
              <span className="stat-value">{clientsServed}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">⭐ Удовлетворённых:</span>
              <span className="stat-value success">{satisfiedClients}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">💰 Заработано:</span>
              <span className="stat-value money">+${totalEarned}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">⭐ Получено XP:</span>
              <span className="stat-value xp">+{totalXp}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">📈 Репутация:</span>
              <span className={`stat-value rep ${totalReputationChange < 0 ? 'penalty' : ''}`}>
                {totalReputationChange >= 0 ? '+' : ''}{totalReputationChange}
              </span>
            </div>
            {reputationPenalty > 0 && (
              <div className="stat-row">
                <span className="stat-label">⚠️ Штраф репутации (побег):</span>
                <span className="stat-value rep penalty">-{reputationPenalty}</span>
              </div>
            )}
            <div className="stat-row">
              <span className="stat-label">🕐 Ходов сделано:</span>
              <span className="stat-value">{actionsTaken}</span>
            </div>
          </div>
        </div>

        {/* Финансы */}
        <div className="summary-section">
          <h2 className="section-title">💵 ФИНАНСЫ</h2>
          <div className="stats-box">
            <div className="stat-row">
              <span className="stat-label">До ночи:</span>
              <span className="stat-value">${moneyBeforeNight}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Заработано:</span>
              <span className="stat-value money">+${moneyEarned}</span>
            </div>
            {moneyPenalty > 0 && (
              <>
                <div className="stat-row">
                  <span className="stat-label">⚠️ Штраф за побег:</span>
                  <span className="stat-value money penalty">-${moneyPenalty}</span>
                </div>
                <div className="stat-row" style={{fontSize: '9px', color: '#666'}}>
                  <span className="stat-label">
                    ({penalties?.moneyPenaltyPercent}% от ${penalties?.sessionMoney}, {penalties?.turnsPercent}% ходов)
                  </span>
                </div>
              </>
            )}
            <div className="stat-divider-line" />
            <div className="stat-row total">
              <span className="stat-label">ИТОГО:</span>
              <span className="stat-value money">${moneyTotal}</span>
            </div>
          </div>
        </div>

        {/* Кнопка "Отправиться домой" */}
        <button 
          className="go-home-btn"
          onClick={handleGoHome}
        >
          🏠 ОТПРАВИТЬСЯ ДОМОЙ
        </button>
      </div>

      <style>{`
        .night-summary-overlay.dos-terminal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.95);
          z-index: 2000;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 20px;
          font-family: 'Courier New', Courier, monospace;
          animation: fadeIn 0.3s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .summary-container {
          background: #000;
          border: 3px solid #e94560;
          border-radius: 8px;
          padding: 25px;
          max-width: 500px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 0 40px rgba(233, 69, 96, 0.5);
        }
        
        .summary-header {
          text-align: center;
          margin-bottom: 25px;
          border-bottom: 2px solid #333;
          padding-bottom: 15px;
        }
        
        .summary-title {
          font-size: 20px;
          font-weight: 900;
          color: #e94560;
          margin: 0 0 8px 0;
          text-transform: uppercase;
          letter-spacing: 2px;
          text-shadow: 0 0 15px rgba(233, 69, 96, 0.6);
        }
        
        .summary-reason {
          font-size: 10px;
          color: #888;
          margin: 0;
          text-transform: uppercase;
        }
        
        .summary-section {
          margin-bottom: 20px;
        }
        
        .section-title {
          font-size: 12px;
          font-weight: bold;
          color: #a78bfa;
          margin: 0 0 10px 0;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        .stats-box {
          background: #111;
          border: 2px solid #333;
          border-radius: 6px;
          padding: 15px;
        }
        
        .stat-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 0;
          font-size: 11px;
        }
        
        .stat-row:not(:last-child) {
          border-bottom: 1px solid #222;
        }
        
        .stat-label {
          color: #aaa;
        }
        
        .stat-value {
          color: #f0f0f0;
          font-weight: bold;
          min-width: 60px;
          text-align: right;
        }
        
        .stat-value.success { color: #4ade80; }
        .stat-value.money { color: #fbbf24; }
        .stat-value.xp { color: #a78bfa; }
        .stat-value.rep { color: #f472b6; }
        .stat-value.penalty { color: #ff0055; }
        
        .stat-divider-line {
          height: 2px;
          background: #444;
          margin: 8px 0;
        }
        
        .stat-row.total {
          padding-top: 10px;
          font-size: 13px;
        }
        
        .stat-row.total .stat-label {
          color: #fff;
          font-weight: bold;
        }
        
        .stat-row.total .stat-value {
          color: #fbbf24;
          font-size: 16px;
        }
        
        .go-home-btn {
          width: 100%;
          padding: 15px;
          background: #e94560;
          border: none;
          border-radius: 6px;
          color: #000;
          font-size: 13px;
          font-weight: 900;
          font-family: 'Courier New', Courier, monospace;
          text-transform: uppercase;
          letter-spacing: 1px;
          cursor: pointer;
          transition: all 0.2s;
          margin-top: 10px;
          box-shadow: 0 0 20px rgba(233, 69, 96, 0.4);
        }
        
        .go-home-btn:hover {
          background: #ff5a7a;
          transform: translateY(-2px);
          box-shadow: 0 0 30px rgba(233, 69, 96, 0.7);
        }
        
        .go-home-btn:active {
          transform: translateY(0);
        }
      `}</style>
    </div>
  );
}

export default NightSummaryOverlay;

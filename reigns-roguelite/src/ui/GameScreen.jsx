/**
 * GameScreen - DOS Terminal Style
 * Gloryhole Quest - ночная сессия
 * 
 * Структура:
 * - Верхняя панель: статы + время/ходы
 * - Карта клиента
 * - 2 карты действий
 * - Кнопки управления
 */

import React, { useEffect, useState } from 'react';
import { useGame } from '../context/GameContext.jsx';
import CardView from './CardView.jsx';

function GameScreen() {
  const { state, playAction, endNightEarly, attemptEarlyFinish, chooseClimax, engine } = useGame();
  const { game, action, phase, climax } = state;

  const [lastEvent, setLastEvent] = useState(null);
  const [showFleeConfirm, setShowFleeConfirm] = useState(false);
  const [fleeResult, setFleeResult] = useState(null);
  const [prevClientKey, setPrevClientKey] = useState(null);
  const [prevCardsKey, setPrevCardsKey] = useState(null);

  // Отслеживание нового клиента
  const currentClientKey = game?.currentCard?.clientData?.id;
  const isNewClient = currentClientKey && currentClientKey !== prevClientKey;
  
  // Отслеживание новых карт действий
  const currentCardsKey = action?.currentActionCards?.map(c => c.id).join('-');
  const isNewCards = currentCardsKey && currentCardsKey !== prevCardsKey;

  useEffect(() => {
    if (currentClientKey) setPrevClientKey(currentClientKey);
  }, [currentClientKey]);

  useEffect(() => {
    if (currentCardsKey) setPrevCardsKey(currentCardsKey);
  }, [currentCardsKey]);

  // Подписка на события
  useEffect(() => {
    if (!engine) return;
    
    const handleEvent = (event) => {
      setLastEvent(event);
      setTimeout(() => setLastEvent(null), 3000);
    };

    engine.eventBus.on('randomEvent', handleEvent);
    return () => {
      engine.eventBus.off('randomEvent', handleEvent);
    };
  }, [engine]);

  // Обработка выбора в кульминации
  const handleClimaxChoice = (outcomeId) => {
    const result = chooseClimax(outcomeId);
    return result;
  };

  // Игра карты действия
  const handlePlayAction = (actionIndex) => {
    const result = playAction(actionIndex);
    return result;
  };

  // Активация предмета на карте
  const handleActivateItem = (itemId, actionId) => {
    if (!engine) return;
    const actionCard = action?.currentActionCards?.[actionId];
    if (!actionCard) return;
    
    // Находим предмет в инвентаре
    const items = engine.inventorySystem?.getAllItems() || [];
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    // Активируем
    engine.inventorySystem?.activateItem(itemId, actionId);
  };

  // Раннее завершение клиента (не ночи!)
  const handleEarlyFinish = () => {
    const result = attemptEarlyFinish();
    if (!result.success) {
      // Можно добавить уведомление что нельзя завершить
      console.log('[GameScreen] Early finish failed:', result.reason);
    }
    // Если успешно — клиент завершён, переходим к следующему
  };

  // Побег (возврат в хаб)
  const handleBackToHub = () => {
    // Сначала рассчитываем штраф
    const result = endNightEarly('fled');
    setFleeResult(result);
    setShowFleeConfirm(true);
  };

  const confirmFlee = () => {
    setShowFleeConfirm(false);
    setFleeResult(null);
  };

  const cancelFlee = () => {
    setShowFleeConfirm(false);
    setFleeResult(null);
  };

  // Проверка: ночь окончена?
  const isNightEnded = phase === 'hub' && game?.sessionStats;
  const isClimax = phase === 'climax';

  // Расчёт прогресса ночи
  const totalTurns = 24;
  const remainingTurns = game?.remainingTurns ?? totalTurns;
  const turnsElapsed = totalTurns - remainingTurns;
  const progressPercent = Math.max(0, Math.round((turnsElapsed / totalTurns) * 100));

  // Проверка: текущая карта - клиент?
  const isClientCard = game?.currentCard?.clientData !== undefined;
  const isEventCard = game?.currentCard?.choices?.length > 0;

  // Проверка доступности Early Finish
  const showEarlyFinish = action?.interactionState?.started &&
    action?.interactionState?.actionsTaken >= 2;

  // Расчёт шанса раннего завершения
  const earlyFinishChance = engine?.getEarlyFinishChance?.() || { canAttempt: false, successChance: 0 };
  const canAttemptEarlyFinish = earlyFinishChance.canAttempt && showEarlyFinish;
  const earlyFinishChancePercent = earlyFinishChance.successChance || 0;

  // Ресурсы игрока
  const stamina = game?.runState?.stamina ?? game?.player?.stats?.stamina ?? 0;
  const maxStamina = game?.player?.stats?.maxStamina ?? 60;
  const mental = game?.runState?.mental_health ?? game?.player?.stats?.mental_health ?? 0;
  const maxMental = game?.player?.stats?.maxMentalHealth ?? 80;
  const totalMoney = game?.player?.stats?.money ?? 0;
  const sessionMoney = game?.sessionStats?.totalEarned ?? 0;
  const hubMoney = Math.max(0, totalMoney - sessionMoney);
  const time = game?.time || '22:00';

  // Рендеринг контента
  const renderContent = () => {
    // Ночь окончена
    if (isNightEnded) {
      return (
        <div className="night-summary-screen dos-style">
          <div className="summary-border-outer">
            <div className="summary-border-inner">
              <div className="summary-content">
                <h2 className="summary-title">☀️ НОЧЬ ОКОНЧЕНА</h2>
                <div className="summary-stats">
                  <div className="summary-stat-row">
                    <span className="summary-stat-label">КЛИЕНТОВ:</span>
                    <span className="summary-stat-value">{game.sessionStats.clientsServed}</span>
                  </div>
                  <div className="summary-stat-row">
                    <span className="summary-stat-label">ЗАРАБОТАНО:</span>
                    <span className="summary-stat-value money">${game.sessionStats.totalEarned}</span>
                  </div>
                  <div className="summary-stat-row">
                    <span className="summary-stat-label">ОПЫТ:</span>
                    <span className="summary-stat-value xp">{game.sessionStats.totalXp} XP</span>
                  </div>
                </div>
                <button 
                  className="dos-button continue-button"
                  onClick={() => window.location.reload()}
                >
                  {'> ПРОДОЛЖИТЬ'}
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Обычный игровой экран
    return (
      <div className="game-screen-content">
        {/* Верхняя панель: СТАТЫ + ВРЕМЯ */}
        <div className="top-bar-dos">
          {/* Статы игрока */}
          <div className="stats-row-dos">
            <div className="stat-box-dos stamina">
              <span className="stat-icon">⚡</span>
              <span className="stat-value">{stamina}/{maxStamina}</span>
            </div>
            <div className="stat-box-dos mental">
              <span className="stat-icon">🧠</span>
              <span className="stat-value">{mental}/{maxMental}</span>
            </div>
            <div className="stat-box-dos money">
              <span className="stat-icon">💰</span>
              <span className="stat-value">+${sessionMoney} (сессия)</span>
            </div>
          </div>

          {/* Время и ходы */}
          <div className="time-box-dos">
            <span className="time-icon">🕐</span>
            <span className="time-value">{time}</span>
            <span className="time-separator">|</span>
            <span className="turns-label">ХОДОВ:</span>
            <span className="turns-value">{remainingTurns}</span>
          </div>
        </div>

        {/* Уведомление о событии */}
        {lastEvent && (
          <div className="event-notification-dos">
            <span className="event-notification-icon">🎲</span>
            <span className="event-notification-text">{lastEvent.name}</span>
          </div>
        )}

        {/* Карта клиента + карты действий */}
        <CardView
          clientCard={game?.currentCard}
          card={game?.currentCard}
          actionCards={action?.currentActionCards || []}
          actionState={{
            edgeTension: action?.edgeTension || 0,
            tensionLevel: action?.tensionLevel || 0,
            actionHistory: action?.actionHistory || []
          }}
          onPlayAction={handlePlayAction}
          onActivateItem={handleActivateItem}
          inventorySystem={engine?.inventorySystem}
          onChoice={handleClimaxChoice}
          showEarlyFinish={showEarlyFinish}
          onEarlyFinish={handleEarlyFinish}
          climaxReached={isClimax}
          climaxOutcomes={climax?.outcomes}
          onSelectClimax={handleClimaxChoice}
          isNewClient={isNewClient}
          isNewCards={isNewCards}
          actionUsage={action?.actionUsage || {}}
          clientId={game?.currentCard?.clientData?.id || null}
          sessionEdgeStacks={action?.interactionSession?.edgeStacks || 0}
          playerStamina={game?.runState?.stamina ?? 60}
          playerMental={game?.runState?.mental_health ?? 80}
        />

        {/* Кнопки управления */}
        <div className="game-controls-dos">
          {showEarlyFinish && (
            <button
              className="dos-button neon-button"
              onClick={handleEarlyFinish}
              disabled={!canAttemptEarlyFinish}
              style={{ opacity: canAttemptEarlyFinish ? 1 : 0.5 }}
            >
              {'> ⚡ ЗАВЕРШИТЬ РАНЬШЕ'} {canAttemptEarlyFinish ? `(${earlyFinishChancePercent}%)` : `(<${earlyFinishChancePercent}%)`}
            </button>
          )}
          <button
            className="dos-button"
            onClick={handleBackToHub}
          >
            {'> 🏃 СБЕЖАТЬ'}
          </button>
        </div>

        {/* Подтверждение побега */}
        {showFleeConfirm && (
          <div className="flee-confirm-overlay-dos">
            <div className="flee-confirm-dialog-dos">
              <div className="confirm-border-outer">
                <div className="confirm-border-inner">
                  <div className="confirm-content">
                    <h3 className="confirm-title">⚠️ СБЕЖАТЬ?</h3>
                    <p className="confirm-text">
                      ШТРАФ: ${fleeResult?.moneyLost || 0} (${fleeResult?.moneyPenaltyPercent || 0}% от ${fleeResult?.sessionMoney || 0})
                    </p>
                    <p className="confirm-text">
                      РЕПУТАЦИЯ: -{fleeResult?.reputationLoss || 0} ({fleeResult?.remainingClients || 0} клиентов)
                    </p>
                    <p className="confirm-subtext">
                      Ходов прошло: {fleeResult?.turnsPercent || 0}%
                    </p>
                    <div className="confirm-buttons">
                      <button
                        className="dos-button confirm-yes"
                        onClick={confirmFlee}
                      >
                        {'> ДА, СБЕЖАТЬ'}
                      </button>
                      <button
                        className="dos-button confirm-no"
                        onClick={cancelFlee}
                      >
                        {'> ОТМЕНА'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="game-screen dos-terminal">
      {renderContent()}

      <style>{`
        /* === ОБЩИЙ КОНТЕЙНЕР === */
        .game-screen.dos-terminal {
          min-height: 100vh;
          background: #1a1a1a;
          padding: 10px;
          font-family: 'Courier New', Courier, monospace;
          box-sizing: border-box;
        }

        @supports (padding: max(0px)) {
          .game-screen.dos-terminal {
            padding-top: max(10px, env(safe-area-inset-top));
            padding-bottom: max(10px, env(safe-area-inset-bottom));
            padding-left: max(10px, env(safe-area-inset-left));
            padding-right: max(10px, env(safe-area-inset-right));
          }
        }

        .game-screen-content {
          max-width: 900px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        /* === ВЕРХНЯЯ ПАНЕЛЬ === */
        .top-bar-dos {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
          padding: 10px;
          background: #000000;
          border: 2px solid #333333;
          border-radius: 6px;
        }

        .stats-row-dos {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .stat-box-dos {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          background: rgba(0, 0, 0, 0.5);
          border: 1px solid #444444;
          border-radius: 4px;
          font-size: 11px;
          font-weight: bold;
        }

        .stat-box-dos.stamina {
          border-color: #fbbf24;
          color: #fbbf24;
        }

        .stat-box-dos.mental {
          border-color: #a78bfa;
          color: #a78bfa;
        }

        .stat-box-dos.money {
          border-color: #4ade80;
          color: #4ade80;
        }

        .stat-icon {
          font-size: 14px;
        }

        .time-box-dos {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 10px;
          background: rgba(0, 0, 0, 0.5);
          border: 1px solid #444444;
          border-radius: 4px;
          font-size: 11px;
          color: #cccccc;
        }

        .time-icon {
          font-size: 14px;
        }

        .time-value {
          color: #00d9ff;
          font-weight: bold;
        }

        .time-separator {
          color: #666666;
        }

        .turns-label {
          color: #888888;
        }

        .turns-value {
          color: #f0f0f0;
          font-weight: bold;
        }

        /* === УВЕДОМЛЕНИЕ О СОБЫТИИ === */
        .event-notification-dos {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: rgba(0, 217, 255, 0.1);
          border: 1px dashed #00d9ff;
          border-radius: 4px;
          font-size: 10px;
          animation: pulse 1s ease-in-out infinite;
        }

        .event-notification-icon {
          font-size: 16px;
        }

        .event-notification-text {
          color: #00d9ff;
          font-weight: bold;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }

        /* === КНОПКИ === */
        .game-controls-dos {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
          flex-wrap: wrap;
        }

        .dos-button {
          padding: 10px 16px;
          background: #000000;
          border: 2px solid #666666;
          border-radius: 4px;
          color: #666666;
          font-family: 'Courier New', Courier, monospace;
          font-size: 10px;
          font-weight: bold;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .dos-button:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.1);
          border-color: #f0f0f0;
          color: #f0f0f0;
        }

        .neon-button {
          border-color: #e94560;
          color: #e94560;
          box-shadow: 0 0 10px rgba(233, 69, 96, 0.3);
        }

        .neon-button:hover {
          box-shadow: 0 0 20px rgba(233, 69, 96, 0.6);
        }

        /* === КУЛЬМИНАЦИЯ === */
        .climax-choice-screen.dos-style {
          text-align: center;
          padding: 40px 20px;
        }

        .climax-header {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-bottom: 20px;
        }

        .climax-icon {
          font-size: 32px;
        }

        .climax-header h2 {
          font-size: 24px;
          color: #00d9ff;
          text-transform: uppercase;
          letter-spacing: 3px;
        }

        .climax-text {
          font-size: 12px;
          color: #888888;
          margin-bottom: 30px;
        }

        .climax-outcomes {
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-width: 400px;
          margin: 0 auto;
        }

        .climax-choice {
          text-align: left;
          font-size: 11px;
        }

        /* === ИТОГИ НОЧИ === */
        .night-summary-screen.dos-style {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 60vh;
          padding: 20px;
        }

        .summary-border-outer {
          border: 3px solid #e94560;
          border-radius: 8px;
          padding: 3px;
          background: #e94560;
          box-shadow: 0 4px 20px rgba(233, 69, 96, 0.5);
        }

        .summary-border-inner {
          border: 2px solid #00d9ff;
          border-radius: 5px;
          background: #000000;
        }

        .summary-content {
          padding: 30px;
          text-align: center;
        }

        .summary-title {
          font-size: 20px;
          color: #00d9ff;
          text-transform: uppercase;
          letter-spacing: 2px;
          margin-bottom: 25px;
        }

        .summary-stats {
          margin-bottom: 25px;
        }

        .summary-stat-row {
          display: flex;
          justify-content: space-between;
          padding: 10px 20px;
          margin-bottom: 8px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
          font-size: 12px;
        }

        .summary-stat-label {
          color: #888888;
        }

        .summary-stat-value {
          color: #f0f0f0;
          font-weight: bold;
        }

        .summary-stat-value.money {
          color: #4ade80;
        }

        .summary-stat-value.xp {
          color: #a78bfa;
        }

        .continue-button {
          font-size: 12px;
          padding: 12px 30px;
        }

        /* === ПОДТВЕРЖДЕНИЕ ПОБЕГА === */
        .flee-confirm-overlay-dos {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.9);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }

        .flee-confirm-dialog-dos {
          width: 100%;
          max-width: 350px;
          padding: 10px;
        }

        .confirm-border-outer {
          border: 3px solid #ffaa00;
          border-radius: 8px;
          padding: 3px;
          background: #ffaa00;
        }

        .confirm-border-inner {
          border: 2px solid #000000;
          border-radius: 5px;
          background: #000000;
        }

        .confirm-content {
          padding: 20px;
          text-align: center;
        }

        .confirm-title {
          font-size: 16px;
          color: #ffaa00;
          text-transform: uppercase;
          margin-bottom: 15px;
        }

        .confirm-text {
          font-size: 11px;
          color: #cccccc;
          margin-bottom: 20px;
        }

        .confirm-buttons {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .confirm-yes {
          border-color: #ff0055;
          color: #ff0055;
        }

        .confirm-no {
          border-color: #666666;
          color: #666666;
        }
      `}</style>
    </div>
  );
}

export default GameScreen;

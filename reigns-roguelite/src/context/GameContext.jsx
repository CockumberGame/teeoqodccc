/**
 * GameContext - Единый источник правды для UI
 * Gloryhole Quest - централизованное управление состоянием игры
 * 
 * Архитектура:
 * - GameEngine хранит бизнес-состояние
 * - GameContext синхронизирует с React
 * - UI компоненты подписываются на контекст
 */

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import GameEngine from '../engine/GameEngine.js';

// Создаём контекст
const GameContext = createContext(null);

// Начальное состояние
const initialState = {
  phase: 'menu',           // 'menu' | 'hub' | 'playing' | 'climax' | 'gameOver'
  game: null,              // gameState из GameEngine
  action: null,            // actionState из GameEngine
  hub: null,               // hubState из GameEngine
  summary: null,           // итоги ночи (когда ночь окончена)
  error: null              // ошибки
};

// Редюсер для предсказуемых обновлений
function gameReducer(state, action) {
  switch (action.type) {
    case 'INIT':
      return {
        ...state,
        phase: action.payload.phase || 'menu',
        game: action.payload.game || null,
        action: action.payload.action || null,
        hub: action.payload.hub || null
      };

    case 'NIGHT_STARTED':
      return {
        ...state,
        phase: 'playing',
        game: action.payload.game,
        action: action.payload.action,
        summary: null,
        error: null
      };

    case 'ACTION_PLAYED':
      return {
        ...state,
        game: action.payload.game,
        action: action.payload.action,
        error: null
      };

    case 'INTERACTION_FINISHED':
      return {
        ...state,
        game: action.payload.game,
        action: action.payload.action,
        error: null
      };

    case 'NIGHT_ENDED':
      return {
        ...state,
        phase: 'nightSummary',  // Новое: показываем оверлей вместо хаба
        hub: action.payload.hub,
        game: action.payload.game,
        action: null,
        summary: action.payload.summary,
        error: null
      };

    case 'NIGHT_SUMMARY_CLOSED':
      return {
        ...state,
        phase: 'hub',
        hub: action.payload.hub,
        game: action.payload.game,
        summary: null,
        error: null
      };

    case 'HUB_UPDATED':
      return {
        ...state,
        phase: 'hub',
        hub: action.payload.hub,
        game: action.payload.game,
        error: null
      };

    case 'CLIMAX_REACHED':
      return {
        ...state,
        phase: 'climax',
        game: action.payload.game,
        climax: action.payload.climax
      };

    case 'CLIMAX_CHOSEN':
      // После выбора кульминации переходим к следующему клиенту (продолжаем играть)
      return {
        ...state,
        phase: 'playing',  // Исправлено: не 'hub', а 'playing'
        game: action.payload.game,
        action: action.payload.action,
        climax: null
      };

    case 'ERROR':
      return {
        ...state,
        error: action.payload.error
      };

    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null
      };

    default:
      return state;
  }
}

// Провайдер контекста
export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const [engine] = React.useState(() => new GameEngine());

  // Подписка на события GameEngine
  useEffect(() => {
    const onNightStarted = () => {
      dispatch({
        type: 'NIGHT_STARTED',
        payload: {
          game: engine.getGameState(),
          action: engine.getActionState()
        }
      });
    };

    const onInteractionStarted = () => {
      dispatch({
        type: 'ACTION_PLAYED',
        payload: {
          game: engine.getGameState(),
          action: engine.getActionState()
        }
      });
    };

    const onActionPlayed = () => {
      dispatch({
        type: 'ACTION_PLAYED',
        payload: {
          game: engine.getGameState(),
          action: engine.getActionState()
        }
      });
    };

    const onInteractionFinished = () => {
      dispatch({
        type: 'INTERACTION_FINISHED',
        payload: {
          game: engine.getGameState(),
          action: engine.getActionState()
        }
      });
    };

    const onNightEnded = (data) => {
      const hubState = engine.getHubState();

      dispatch({
        type: 'NIGHT_ENDED',
        payload: {
          game: engine.getGameState(),
          hub: hubState,
          summary: {
            reason: data.reason,
            stats: data.stats,
            moneyEarned: data.moneyEarned,
            xpEarned: data.xpEarned,
            // Данные о штрафах (если были)
            penalties: data.penalties
          }
        }
      });
    };

    const onClimaxReached = (data) => {
      dispatch({
        type: 'CLIMAX_REACHED',
        payload: {
          game: engine.getGameState(),
          climax: data
        }
      });
    };

    // Обработчик для обновления состояния ПОСЛЕ выбора кульминации
    // Когда chooseClimaxOutcome() завершается и переходит к следующему клиенту
    const onClimaxChosen = () => {
      dispatch({
        type: 'CLIMAX_CHOSEN',
        payload: {
          game: engine.getGameState(),
          action: engine.getActionState()
        }
      });
    };

    const onNightSummaryClosed = () => {
      dispatch({
        type: 'NIGHT_SUMMARY_CLOSED',
        payload: {
          hub: engine.getHubState(),
          game: engine.getGameState()
        }
      });
    };

    // Подписываемся на события
    engine.eventBus.on('nightStarted', onNightStarted);
    engine.eventBus.on('interactionStarted', onInteractionStarted);  // Новое: для сброса usage при новом клиенте
    engine.eventBus.on('actionPlayed', onActionPlayed);
    engine.eventBus.on('interactionFinished', onInteractionFinished);
    engine.eventBus.on('nightEnded', onNightEnded);
    engine.eventBus.on('climaxReached', onClimaxReached);
    engine.eventBus.on('climaxChosen', onClimaxChosen);  // Новое: для перехода к следующему клиенту
    engine.eventBus.on('nightSummaryClosed', onNightSummaryClosed);

    // Очистка
    return () => {
      engine.eventBus.off('nightStarted', onNightStarted);
      engine.eventBus.off('interactionStarted', onInteractionStarted);  // Новое
      engine.eventBus.off('actionPlayed', onActionPlayed);
      engine.eventBus.off('interactionFinished', onInteractionFinished);
      engine.eventBus.off('nightEnded', onNightEnded);
      engine.eventBus.off('climaxReached', onClimaxReached);
      engine.eventBus.off('climaxChosen', onClimaxChosen);  // Новое
      engine.eventBus.off('nightSummaryClosed', onNightSummaryClosed);
    };
  }, [engine]);

  // Инициализация при загрузке
  useEffect(() => {
    // Пробуем загрузить сохранение
    const saveData = engine.loadGame();
    if (saveData.success) {
      dispatch({
        type: 'INIT',
        payload: {
          phase: saveData.gameState || 'hub',
          game: engine.getGameState(),
          hub: engine.getHubState()
        }
      });
    }
  }, [engine]);

  // Методы для UI
  const startNight = useCallback(() => {
    const result = engine.startNightSession();
    if (!result.success) {
      dispatch({ type: 'ERROR', payload: { error: result.reason } });
    }
    return result;
  }, [engine]);

  const playAction = useCallback((actionIndex) => {
    const result = engine.playActionCard(actionIndex);
    return result;
  }, [engine]);

  const endNightEarly = useCallback((reason) => {
    const result = engine.endNightEarly(reason);
    return result;
  }, [engine]);

  const attemptEarlyFinish = useCallback(() => {
    const result = engine.attemptEarlyFinish();
    if (result.success) {
      dispatch({
        type: 'ACTION_PLAYED',
        payload: {
          game: engine.getGameState(),
          action: engine.getActionState()
        }
      });
    }
    return result;
  }, [engine]);

  const rest = useCallback(() => {
    const result = engine.rest();
    if (result.success) {
      dispatch({
        type: 'HUB_UPDATED',
        payload: {
          hub: engine.getHubState(),
          game: engine.getGameState()
        }
      });
    }
    return result;
  }, [engine]);

  const upgradeSkill = useCallback((skillId) => {
    const result = engine.upgradeSkill(skillId);
    if (result.success) {
      dispatch({
        type: 'HUB_UPDATED',
        payload: {
          hub: engine.getHubState(),
          game: engine.getGameState()
        }
      });
    }
    return result;
  }, [engine]);

  const chooseClimax = useCallback((outcomeId) => {
    const result = engine.chooseClimaxOutcome(outcomeId);
    if (result.success) {
      dispatch({
        type: 'CLIMAX_CHOSEN',
        payload: {
          game: engine.getGameState(),
          summary: result.summary
        }
      });
    }
    return result;
  }, [engine]);

  const saveGame = useCallback(() => {
    return engine.saveGame();
  }, [engine]);

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  const restoreStamina = useCallback((amount) => {
    const result = engine.restoreStamina(amount);
    if (result.success) {
      dispatch({
        type: 'HUB_UPDATED',
        payload: {
          hub: engine.getHubState(),
          game: engine.getGameState()
        }
      });
    }
    return result;
  }, [engine]);

  const restoreMentalHealth = useCallback((amount) => {
    const result = engine.restoreMentalHealth(amount);
    if (result.success) {
      dispatch({
        type: 'HUB_UPDATED',
        payload: {
          hub: engine.getHubState(),
          game: engine.getGameState()
        }
      });
    }
    return result;
  }, [engine]);

  const performHomeAction = useCallback((actionId) => {
    const result = engine.performHomeAction(actionId);
    if (result.success) {
      dispatch({
        type: 'HUB_UPDATED',
        payload: {
          hub: engine.getHubState(),
          game: engine.getGameState()
        }
      });
    }
    return result;
  }, [engine]);

  const buyItemAction = useCallback((itemId) => {
    const result = engine.buyItem(itemId);
    if (result.success) {
      dispatch({
        type: 'HUB_UPDATED',
        payload: {
          hub: engine.getHubState(),
          game: engine.getGameState()
        }
      });
    }
    return result;
  }, [engine]);

  const closeNightSummary = useCallback(() => {
    engine.closeNightSummary();
  }, [engine]);

  const value = {
    state,
    engine,
    dispatch,
    startNight,
    playAction,
    endNightEarly,
    attemptEarlyFinish,
    rest,
    upgradeSkill,
    chooseClimax,
    saveGame,
    clearError,
    restoreStamina,
    restoreMentalHealth,
    performHomeAction,
    buyItem: buyItemAction,
    closeNightSummary
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
}

// Хук для использования контекста
export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}

export default GameContext;
